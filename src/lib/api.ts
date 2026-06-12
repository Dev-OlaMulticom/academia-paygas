import { db, initSeedData } from './db'
import { encrypt, decrypt } from './crypto'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''

// Initialize seed data on load (fallback if API fails)
initSeedData()

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

    // Add API Key header for WordPress API authentication
    if (API_KEY) {
      headers['X-API-Key'] = API_KEY
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    let body = options.body as string | undefined

    // Encrypt write requests with payload
    if (isWrite && body && this.encryptionEnabled) {
      try {
        const parsed = JSON.parse(body)
        const encryptedPayload = await encrypt(JSON.stringify(parsed))
        body = JSON.stringify({ encrypted: encryptedPayload })
        headers['Content-Type'] = 'application/json'
        headers['X-Encrypted'] = 'true'
      } catch {
        // If body isn't JSON, pass through
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

    // Decrypt encrypted response
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

  // Auth
  async login(email: string, password: string) {
    try {
      // Try to use WordPress API for authentication
      const response = await this.request<{ token: string; user: any }>('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      this.setToken(response.token)
      localStorage.setItem('user', JSON.stringify(response.user))

      return response
    } catch (error) {
      // Fallback to local database if API fails
      console.warn('API login failed, using local database:', error)
      const users = db.getAll('users')
      const user = users.find((u: any) => u.email === email && u.senha === password)

      if (!user) {
        throw new Error('Credenciais inválidas')
      }

      const token = `mock-token-${Date.now()}-${Math.random().toString(36).substr(2)}`
      this.setToken(token)

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          nome: user.nome,
        }
      }
    }
  }

  async getMe() {
    const token = this.token
    if (!token) throw new Error('Não autenticado')

    try {
      // Try to use WordPress API
      return await this.request<any>('/me')
    } catch (error) {
      // Fallback to localStorage
      console.warn('API getMe failed, using localStorage:', error)
      const userStr = localStorage.getItem('user')
      if (!userStr) throw new Error('Usuário não encontrado')
      return JSON.parse(userStr)
    }
  }

  logout() {
    this.setToken(null)
    localStorage.removeItem('user')
  }

  // Usuarios
  async getUsuarios() {
    try {
      return await this.request<any[]>('/users')
    } catch (error) {
      console.warn('API getUsuarios failed, using local database:', error)
      return db.getAll('users')
    }
  }

  async createUsuario(data: { email: string; nome: string; senha: string; role: string }) {
    try {
      return await this.request<any>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.warn('API createUsuario failed, using local database:', error)
      return db.create('users', { ...data, xp: 0, lastLogin: new Date().toISOString() })
    }
  }

  async updateUsuario(id: string, data: any) {
    try {
      return await this.request<any>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.warn('API updateUsuario failed, using local database:', error)
      return db.update('users', id, data)
    }
  }

  async deleteUsuario(id: string) {
    try {
      return await this.request<any>(`/users/${id}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.warn('API deleteUsuario failed, using local database:', error)
      return db.delete('users', id)
    }
  }

  async getEquipe() {
    try {
      return await this.request<any[]>('/users')
    } catch (error) {
      console.warn('API getEquipe failed, using local database:', error)
      const currentUserStr = localStorage.getItem('user')
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null
      const allUsers = db.getAll('users')
      return allUsers.filter((u: any) => u.id !== currentUser?.id)
    }
  }

  // Trilhas
  async getTrilhas() {
    try {
      return await this.request<any[]>('/trilhas')
    } catch (error) {
      console.warn('API getTrilhas failed, using local database:', error)
      return db.getAll('tracks')
    }
  }

  async createTrilha(data: any) {
    try {
      return await this.request<any>('/trilhas', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.warn('API createTrilha failed, using local database:', error)
      return db.create('tracks', data)
    }
  }

  async updateTrilha(id: string, data: any) {
    try {
      return await this.request<any>(`/trilhas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.warn('API updateTrilha failed, using local database:', error)
      return db.update('tracks', id, data)
    }
  }

  async deleteTrilha(id: string) {
    try {
      return await this.request<any>(`/trilhas/${id}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.warn('API deleteTrilha failed, using local database:', error)
      return db.delete('tracks', id)
    }
  }

  async getModulos(trilhaId: string) {
    try {
      return await this.request<any[]>(`/modulos?trilha_id=${trilhaId}`)
    } catch (error) {
      console.warn('API getModulos failed, using local database:', error)
      return db.find('modules', (m: any) => m.trilhaId === trilhaId)
    }
  }

  // CMS - Modulos
  async getCmsModulos() {
    try {
      return await this.request<any[]>('/modulos')
    } catch (error) {
      console.warn('API getCmsModulos failed, using local database:', error)
      return db.getAll('modules')
    }
  }

  async createModulo(data: any) {
    try {
      return await this.request<any>('/modulos', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.warn('API createModulo failed, using local database:', error)
      return db.create('modules', data)
    }
  }

  async updateModulo(id: string, data: any) {
    try {
      return await this.request<any>(`/modulos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.warn('API updateModulo failed, using local database:', error)
      return db.update('modules', id, data)
    }
  }

  async deleteModulo(id: string) {
    try {
      return await this.request<any>(`/modulos/${id}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.warn('API deleteModulo failed, using local database:', error)
      return db.delete('modules', id)
    }
  }

  // Aulas
  async getAulas(moduloId: string) {
    try {
      return await this.request<any[]>(`/aulas?modulo_id=${moduloId}`)
    } catch (error) {
      console.warn('API getAulas failed, using local database:', error)
      return db.find('lessons', (l: any) => l.moduloId === moduloId)
    }
  }

  async createAula(moduloId: string, data: any) {
    try {
      return await this.request<any>('/aulas', {
        method: 'POST',
        body: JSON.stringify({ ...data, moduloId }),
      })
    } catch (error) {
      console.warn('API createAula failed, using local database:', error)
      return db.create('lessons', { ...data, moduloId, tipo: data.tipo || 'video', microLessons: data.microLessons || [] })
    }
  }

  async updateAula(id: string, data: any) {
    try {
      return await this.request<any>(`/aulas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.warn('API updateAula failed, using local database:', error)
      return db.update('lessons', id, { ...data, tipo: data.tipo || 'video', microLessons: data.microLessons || [] })
    }
  }

  async deleteAula(id: string) {
    try {
      return await this.request<any>(`/aulas/${id}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.warn('API deleteAula failed, using local database:', error)
      return db.delete('lessons', id)
    }
  }

  // Progresso
  async getProgresso() {
    try {
      return await this.request<any[]>('/progresso')
    } catch (error) {
      console.warn('API getProgresso failed, using local database:', error)
      return db.getAll('progress')
    }
  }

  async updateProgresso(moduloId: string, aulaId: string, concluido: boolean) {
    try {
      return await this.request<any>('/progresso', {
        method: 'POST',
        body: JSON.stringify({ moduloId, aulaId, concluido }),
      })
    } catch (error) {
      console.warn('API updateProgresso failed, using local database:', error)
      const existing = db.find('progress', (p: any) => p.aulaId === aulaId)
      if (existing.length > 0) {
        return db.update('progress', existing[0].id, { concluido })
      }
      return db.create('progress', { moduloId, aulaId, concluido })
    }
  }

  async getProgressoStats() {
    try {
      return await this.request<any>('/progresso/stats')
    } catch (error) {
      console.warn('API getProgressoStats failed, using local database:', error)
      const progress = db.getAll('progress')
      const total = progress.length
      const completed = progress.filter((p: any) => p.concluido).length
      return { total, completed, percentage: total > 0 ? (completed / total) * 100 : 0 }
    }
  }

  // Certificados
  async getCertificates() {
    try {
      return await this.request<any[]>('/certificados')
    } catch (error) {
      console.warn('API getCertificates failed, using local database:', error)
      return db.getAll('certificates')
    }
  }

  async createCertificate(trilhaId: string) {
    try {
      return await this.request<any>('/certificados', {
        method: 'POST',
        body: JSON.stringify({ trilhaId }),
      })
    } catch (error) {
      console.warn('API createCertificate failed, using local database:', error)
      return db.create('certificates', { trilhaId, emitidoEm: new Date().toISOString() })
    }
  }

  async approveCertificate(id: string) {
    try {
      return await this.request<any>(`/certificados/${id}/approve`, {
        method: 'POST',
      })
    } catch (error) {
      console.warn('API approveCertificate failed, using local database:', error)
      return db.update('certificates', id, { aprovado: true, aprovadoEm: new Date().toISOString() })
    }
  }

  // Notificaciones
  async getNotifications() {
    try {
      return await this.request<any[]>('/notifications')
    } catch (error) {
      console.warn('API getNotifications failed, using local database:', error)
      return db.getAll('notifications')
    }
  }

  async sendNotification(toId: string, titulo: string, mensagem: string) {
    try {
      return await this.request<any>('/notifications', {
        method: 'POST',
        body: JSON.stringify({ toId, titulo, mensagem }),
      })
    } catch (error) {
      console.warn('API sendNotification failed, using local database:', error)
      return db.create('notifications', { toId, titulo, mensagem, lida: false, createdAt: new Date().toISOString() })
    }
  }

  async markNotificationRead(id: string) {
    try {
      return await this.request<any>(`/notifications/${id}/read`, {
        method: 'POST',
      })
    } catch (error) {
      console.warn('API markNotificationRead failed, using local database:', error)
      return db.update('notifications', id, { lida: true })
    }
  }

  async markAllNotificationsRead() {
    try {
      return await this.request<any>('/notifications/read-all', {
        method: 'POST',
      })
    } catch (error) {
      console.warn('API markAllNotificationsRead failed, using local database:', error)
      const notifications = db.getAll('notifications')
      notifications.forEach((n: any) => {
        db.update('notifications', n.id, { lida: true })
      })
      return notifications.length
    }
  }

  // Dashboard
  async getDashboard() {
    try {
      return await this.request<any>('/dashboard')
    } catch (error) {
      console.warn('API getDashboard failed, using local database:', error)
      const tracks = db.getAll('tracks')
      const progress = db.getAll('progress')
      const notifications = db.getAll('notifications')
      return { tracks, progress, notifications }
    }
  }
}

export const api = new ApiClient()
