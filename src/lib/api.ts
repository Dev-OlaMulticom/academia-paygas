import { db, initSeedData } from './db'

const API_BASE = '/api'

// Initialize seed data on load
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
    // Use local database for authentication
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

  async getMe() {
    const token = this.token
    if (!token) throw new Error('Não autenticado')
    // For now, return user from localStorage
    const userStr = localStorage.getItem('user')
    if (!userStr) throw new Error('Usuário não encontrado')
    return JSON.parse(userStr)
  }

  logout() {
    this.setToken(null)
  }

  // Usuarios
  async getUsuarios() {
    return db.getAll('users')
  }

  async createUsuario(data: { email: string; nome: string; senha: string; role: string }) {
    return db.create('users', { ...data, xp: 0, lastLogin: new Date().toISOString() })
  }

  async updateUsuario(id: string, data: any) {
    return db.update('users', id, data)
  }

  async deleteUsuario(id: string) {
    return db.delete('users', id)
  }

  async getEquipe() {
    // Return all users except the current user
    const currentUserStr = localStorage.getItem('user')
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null
    const allUsers = db.getAll('users')
    return allUsers.filter((u: any) => u.id !== currentUser?.id)
  }

  // Trilhas
  async getTrilhas() {
    return db.getAll('tracks')
  }

  async createTrilha(data: any) {
    return db.create('tracks', data)
  }

  async updateTrilha(id: string, data: any) {
    return db.update('tracks', id, data)
  }

  async deleteTrilha(id: string) {
    return db.delete('tracks', id)
  }

  async getModulos(trilhaId: string) {
    return db.find('modules', (m: any) => m.trilhaId === trilhaId)
  }

  // CMS - Modulos
  async getCmsModulos() {
    return db.getAll('modules')
  }

  async createModulo(data: any) {
    return db.create('modules', data)
  }

  async updateModulo(id: string, data: any) {
    return db.update('modules', id, data)
  }

  async deleteModulo(id: string) {
    return db.delete('modules', id)
  }

  // Aulas
  async getAulas(moduloId: string) {
    return db.find('lessons', (l: any) => l.moduloId === moduloId)
  }

  async createAula(moduloId: string, data: any) {
    return db.create('lessons', { ...data, moduloId, tipo: data.tipo || 'video', microLessons: data.microLessons || [] })
  }

  async updateAula(id: string, data: any) {
    return db.update('lessons', id, { ...data, tipo: data.tipo || 'video', microLessons: data.microLessons || [] })
  }

  async deleteAula(id: string) {
    return db.delete('lessons', id)
  }

  // Progresso
  async getProgresso() {
    return db.getAll('progress')
  }

  async updateProgresso(moduloId: string, aulaId: string, concluido: boolean) {
    const existing = db.find('progress', (p: any) => p.aulaId === aulaId)
    if (existing.length > 0) {
      return db.update('progress', existing[0].id, { concluido })
    }
    return db.create('progress', { moduloId, aulaId, concluido })
  }

  async getProgressoStats() {
    const progress = db.getAll('progress')
    const total = progress.length
    const completed = progress.filter((p: any) => p.concluido).length
    return { total, completed, percentage: total > 0 ? (completed / total) * 100 : 0 }
  }

  // Certificados
  async getCertificates() {
    return db.getAll('certificates')
  }

  async createCertificate(trilhaId: string) {
    return db.create('certificates', { trilhaId, emitidoEm: new Date().toISOString() })
  }

  async approveCertificate(id: string) {
    return db.update('certificates', id, { aprovado: true, aprovadoEm: new Date().toISOString() })
  }

  // Notificaciones
  async getNotifications() {
    return db.getAll('notifications')
  }

  async sendNotification(toId: string, titulo: string, mensagem: string) {
    return db.create('notifications', { toId, titulo, mensagem, lida: false, createdAt: new Date().toISOString() })
  }

  async markNotificationRead(id: string) {
    return db.update('notifications', id, { lida: true })
  }

  async markAllNotificationsRead() {
    const notifications = db.getAll('notifications')
    notifications.forEach((n: any) => {
      db.update('notifications', n.id, { lida: true })
    })
    return notifications.length
  }

  // Dashboard
  async getDashboard() {
    const tracks = db.getAll('tracks')
    const progress = db.getAll('progress')
    const notifications = db.getAll('notifications')
    return { tracks, progress, notifications }
  }
}

export const api = new ApiClient()
