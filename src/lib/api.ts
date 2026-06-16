import { encrypt, decrypt } from './crypto'
import { db } from './db'
import { queueSync, isOnline } from './sync'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''

class ApiClient {
  private token: string | null = null
  private encryptionEnabled = true

  constructor() {
    this.token = localStorage.getItem('token')
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const method = options.method || 'GET'
    const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH'

    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    }

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    let body = options.body as string | undefined

    if (isWrite && body && this.encryptionEnabled) {
      try {
        const parsed = JSON.parse(body)
        const encryptedPayload = await encrypt(JSON.stringify(parsed))
        body = JSON.stringify({ encrypted: encryptedPayload })
        headers['Content-Type'] = 'application/json'
        headers['X-Encrypted'] = 'true'
      } catch {
        // pass through
      }
    } else if (body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      body,
      headers,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || `HTTP ${res.status}`)
    }

    const data = await res.json()

    if (data?.encrypted && this.encryptionEnabled) {
      try {
        const decrypted = await decrypt(data.encrypted)
        return JSON.parse(decrypted)
      } catch {
        return data
      }
    }

    return data
  }

  private async getWithCache<T>(
    path: string,
    table: any,
    options?: { index?: string; indexValue?: any }
  ): Promise<T> {
    try {
      const data = await this.request<T>(path)
      if (Array.isArray(data)) {
        await table.bulkPut(data)
      } else {
        await table.put(data as any)
      }
      return data
    } catch (error) {
      let cached: any[]
      if (options?.index && options?.indexValue !== undefined) {
        cached = await table.where(options.index).equals(options.indexValue).toArray()
      } else {
        cached = await table.toArray()
      }
      if (cached && cached.length > 0) {
        return cached as T
      }
      throw error
    }
  }

  private async writeWithCache<T>(
    path: string,
    method: string,
    body: any,
    table: any,
    options?: { offlineTransform?: (body: any) => any }
  ): Promise<T> {
    const token = this.token
    if (isOnline() && token) {
      try {
        const result = await this.request<T>(path, { method, body: JSON.stringify(body) })
        if (table) {
          if (Array.isArray(result)) {
            await table.bulkPut(result)
          } else {
            await table.put(result as any)
          }
        }
        return result
      } catch (error) {
        await queueSync(method, path, body)
        const offlineData = options?.offlineTransform ? options.offlineTransform(body) : { ...body, id: `pending-${Date.now()}`, _pending: true }
        if (table) await table.put(offlineData as any)
        return offlineData as T
      }
    } else {
      await queueSync(method, path, body)
      const offlineData = options?.offlineTransform ? options.offlineTransform(body) : { ...body, id: `pending-${Date.now()}`, _pending: true }
      if (table) await table.put(offlineData as any)
      return offlineData as T
    }
  }

  // ==================== AUTH ====================

  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
    return response
  }

  async getMe() {
    const token = this.token
    if (!token) throw new Error('Não autenticado')
    try {
      const user = await this.request<any>('/auth/me')
      await db.users.put(user)
      return user
    } catch (error) {
      const cached = await db.users.toArray()
      const stored = localStorage.getItem('user')
      if (stored) return JSON.parse(stored)
      if (cached.length > 0) return cached[0]
      throw error
    }
  }

  logout() {
    this.setToken(null)
    localStorage.removeItem('user')
  }

  // ==================== USUARIOS ====================

  async getUsuarios() {
    return this.getWithCache<any[]>('/usuarios', db.users)
  }

  async createUsuario(data: { email: string; nome: string; senha: string; role: string }) {
    return this.writeWithCache('/usuarios', 'POST', data, db.users)
  }

  async updateUsuario(id: string, data: any) {
    return this.writeWithCache(`/usuarios/${id}`, 'PUT', data, db.users, {
      offlineTransform: (body) => ({ ...body, id }),
    })
  }

  async deleteUsuario(id: string) {
    if (isOnline() && this.token) {
      try {
        await this.request(`/usuarios/${id}`, { method: 'DELETE' })
        await db.users.delete(id)
        return
      } catch (error) {
        await queueSync('DELETE', `/usuarios/${id}`)
        await db.users.delete(id)
        return
      }
    }
    await queueSync('DELETE', `/usuarios/${id}`)
    await db.users.delete(id)
  }

  // ==================== EMAIL VERIFICATION ====================

  async verifyEmail(token: string) {
    return await this.request<{ message: string; alreadyVerified?: boolean }>(`/auth/verify-email?token=${token}`)
  }

  async validateAccount(id: string) {
    return await this.request<{ message: string }>(`/usuarios/${id}/validate-account`, {
      method: 'POST',
    })
  }

  async resendVerification(id: string) {
    return await this.request<{ message: string }>(`/usuarios/${id}/resend-verification`, {
      method: 'POST',
    })
  }

  async getEquipe() {
    return this.getWithCache<any[]>('/usuarios/equipe', db.users)
  }

  // ==================== CMS - MODULOS ====================

  async getCmsModulos() {
    return this.getWithCache<any[]>('/cms', db.modulos)
  }

  async createModulo(data: any) {
    return this.writeWithCache('/cms', 'POST', data, db.modulos)
  }

  async updateModulo(id: string, data: any) {
    return this.writeWithCache(`/cms/${id}`, 'PUT', data, db.modulos, {
      offlineTransform: (body) => ({ ...body, id }),
    })
  }

  async deleteModulo(id: string) {
    if (isOnline() && this.token) {
      try {
        await this.request(`/cms/${id}`, { method: 'DELETE' })
        await db.modulos.delete(id)
        return
      } catch (error) {
        await queueSync('DELETE', `/cms/${id}`)
        await db.modulos.delete(id)
        return
      }
    }
    await queueSync('DELETE', `/cms/${id}`)
    await db.modulos.delete(id)
  }

  // ==================== AULAS ====================

  async getAulas(moduloId: string) {
    return this.getWithCache<any[]>(`/modulos/${moduloId}/aulas`, db.aulas, {
      index: 'moduloId',
      indexValue: moduloId,
    })
  }

  async createAula(moduloId: string, data: any) {
    return this.writeWithCache(`/modulos/${moduloId}/aulas`, 'POST', data, db.aulas)
  }

  async updateAula(id: string, data: any) {
    return this.writeWithCache(`/modulos/aulas/${id}`, 'PUT', data, db.aulas, {
      offlineTransform: (body) => ({ ...body, id }),
    })
  }

  async deleteAula(id: string) {
    if (isOnline() && this.token) {
      try {
        await this.request(`/modulos/aulas/${id}`, { method: 'DELETE' })
        await db.aulas.delete(id)
        return
      } catch (error) {
        await queueSync('DELETE', `/modulos/aulas/${id}`)
        await db.aulas.delete(id)
        return
      }
    }
    await queueSync('DELETE', `/modulos/aulas/${id}`)
    await db.aulas.delete(id)
  }

  // ==================== QUIZ ====================

  async createQuiz(moduloId: string, data: { aulaId: string; titulo: string; autoGerarCertificado?: boolean }) {
    return this.writeWithCache(`/modulos/${moduloId}/quiz`, 'POST', data, db.quizzes)
  }

  async getQuiz(moduloId: string, aulaId: string) {
    try {
      const quiz = await this.request<any>(`/modulos/${moduloId}/quiz/${aulaId}`)
      await db.quizzes.put(quiz)
      return quiz
    } catch (error) {
      const cached = await db.quizzes.where('aulaId').equals(aulaId).first()
      if (cached) return cached
      throw error
    }
  }

  async updateQuiz(quizId: string, data: { titulo?: string; autoGerarCertificado?: boolean }) {
    return this.writeWithCache(`/modulos/quiz/${quizId}`, 'PUT', data, db.quizzes, {
      offlineTransform: (body) => ({ ...body, id: quizId }),
    })
  }

  async deleteQuiz(quizId: string) {
    if (isOnline() && this.token) {
      try {
        await this.request(`/modulos/quiz/${quizId}`, { method: 'DELETE' })
        await db.quizzes.delete(quizId)
        return
      } catch (error) {
        await queueSync('DELETE', `/modulos/quiz/${quizId}`)
        await db.quizzes.delete(quizId)
        return
      }
    }
    await queueSync('DELETE', `/modulos/quiz/${quizId}`)
    await db.quizzes.delete(quizId)
  }

  async addPergunta(quizId: string, data: { pergunta: string; opcaoA: string; opcaoB: string; opcaoC?: string; opcaoD?: string; correta: string }) {
    return this.writeWithCache(`/modulos/quiz/${quizId}/perguntas`, 'POST', data, db.perguntas)
  }

  async updatePergunta(perguntaId: string, data: any) {
    return this.writeWithCache(`/modulos/perguntas/${perguntaId}`, 'PUT', data, db.perguntas, {
      offlineTransform: (body) => ({ ...body, id: perguntaId }),
    })
  }

  async deletePergunta(perguntaId: string) {
    if (isOnline() && this.token) {
      try {
        await this.request(`/modulos/perguntas/${perguntaId}`, { method: 'DELETE' })
        await db.perguntas.delete(perguntaId)
        return
      } catch (error) {
        await queueSync('DELETE', `/modulos/perguntas/${perguntaId}`)
        await db.perguntas.delete(perguntaId)
        return
      }
    }
    await queueSync('DELETE', `/modulos/perguntas/${perguntaId}`)
    await db.perguntas.delete(perguntaId)
  }

  async submitQuiz(quizId: string, respostas: Record<string, string>) {
    return this.writeWithCache(`/modulos/quiz/${quizId}/responder`, 'POST', { respostas }, db.quizResponses, {
      offlineTransform: (body) => ({
        id: `pending-${Date.now()}`,
        quizId,
        userId: '',
        nota: 0,
        total: 0,
        concluido: false,
        _pending: true,
      }),
    })
  }

  // ==================== PROGRESSO ====================

  async getProgresso() {
    return this.getWithCache<any[]>('/progresso', db.progressos)
  }

  async updateProgresso(moduloId: string, aulaId: string, concluido: boolean) {
    return this.writeWithCache('/progresso', 'PUT', { moduloId, aulaId, concluido }, db.progressos, {
      offlineTransform: (body) => ({
        id: `pending-${Date.now()}`,
        moduloId,
        aulaId,
        userId: '',
        concluido,
        _pending: true,
      }),
    })
  }

  async getProgressoStats() {
    try {
      return await this.request<any>('/progresso/stats')
    } catch (error) {
      const cached = await db.progressos.toArray()
      if (cached.length > 0) {
        const completed = cached.filter(p => p.concluido).length
        return {
          totalAulas: cached.length,
          concluidas: completed,
          percentual: cached.length > 0 ? Math.round((completed / cached.length) * 100) : 0,
          modulosIniciados: new Set(cached.map(p => p.moduloId)).size,
          xp: 0,
        }
      }
      throw error
    }
  }

  // ==================== CERTIFICADOS ====================

  async getCertificates() {
    return this.getWithCache<any[]>('/certificates', db.certificates)
  }

  async createCertificate(moduloId: string) {
    return this.writeWithCache('/certificates', 'POST', { moduloId }, db.certificates, {
      offlineTransform: (body) => ({
        id: `pending-${Date.now()}`,
        userId: '',
        moduloId,
        status: 'PENDING',
        _pending: true,
      }),
    })
  }

  async approveCertificate(id: string) {
    return this.writeWithCache(`/certificates/${id}/approve`, 'PUT', {}, db.certificates, {
      offlineTransform: (body) => ({ id, status: 'APPROVED', _pending: true }),
    })
  }

  // ==================== NOTIFICACIONES ====================

  async getNotifications() {
    return this.getWithCache<any[]>('/notifications', db.notifications)
  }

  async sendNotification(toId: string, titulo: string, mensagem: string) {
    return this.writeWithCache('/notifications', 'POST', { toId, titulo, mensagem }, db.notifications, {
      offlineTransform: (body) => ({
        id: `pending-${Date.now()}`,
        fromId: '',
        toId,
        titulo,
        mensagem,
        lida: false,
        _pending: true,
      }),
    })
  }

  async markNotificationRead(id: string) {
    return this.writeWithCache(`/notifications/${id}/read`, 'PUT', {}, db.notifications, {
      offlineTransform: (body) => ({ id, lida: true, _pending: true }),
    })
  }

  async markAllNotificationsRead() {
    return this.writeWithCache('/notifications/read-all', 'PUT', {}, null)
  }

  // ==================== DASHBOARD ====================

  async getDashboard() {
    try {
      const data = await this.request<any>('/dashboard')
      return data
    } catch (error) {
      const progressos = await db.progressos.toArray()
      const modulos = await db.modulos.toArray()
      const certificates = await db.certificates.toArray()
      if (progressos.length > 0 || modulos.length > 0) {
        const completed = progressos.filter(p => p.concluido).length
        return {
          totalModulos: modulos.length,
          modulosConcluidos: 0,
          totalCertificados: certificates.filter(c => c.status === 'ISSUED').length,
          totalAulas: progressos.length,
          aulasConcluidas: completed,
          percentual: progressos.length > 0 ? Math.round((completed / progressos.length) * 100) : 0,
          xp: 0,
          level: 1,
          recentActivity: [],
          pointsByAction: [],
        }
      }
      throw error
    }
  }

  // ==================== GAMIFICATION ====================

  async trackModuleOpen(moduloId: string) {
    return this.writeWithCache(`/modulos/${moduloId}/open`, 'POST', {}, null)
  }

  async getLeaderboard() {
    return this.getWithCache<any[]>('/modulos/gamification/leaderboard', db.users)
  }

  async getGamificationStats() {
    try {
      return await this.request<any>('/modulos/gamification/stats')
    } catch (error) {
      const users = await db.users.toArray()
      const totalXp = users.reduce((sum, u) => sum + (u.xp || 0), 0)
      return {
        totalXpDistributed: totalXp,
        averageXp: users.length > 0 ? Math.round(totalXp / users.length) : 0,
        totalUsers: users.length,
        topActions: [],
      }
    }
  }

  async getDashboardLeaderboard() {
    return this.getWithCache<any>('/dashboard/leaderboard', db.users)
  }
}

export const api = new ApiClient()
