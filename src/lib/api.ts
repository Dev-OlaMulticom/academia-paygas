const API_BASE = '/api'

class ApiClient {
  private token: string | null = null

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || `HTTP ${res.status}`)
    }

    return res.json()
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(data.token)
    return data
  }

  async getMe() {
    return this.request<any>('/auth/me')
  }

  logout() {
    this.setToken(null)
  }

  // Usuarios
  async getUsuarios() {
    return this.request<any[]>('/usuarios')
  }

  async createUsuario(data: { email: string; nome: string; senha: string; role: string }) {
    return this.request<any>('/usuarios', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateUsuario(id: string, data: any) {
    return this.request<any>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteUsuario(id: string) {
    return this.request<any>(`/usuarios/${id}`, { method: 'DELETE' })
  }

  async getEquipe() {
    return this.request<any[]>('/usuarios/equipe')
  }

  // Trilhas
  async getTrilhas() {
    return this.request<any[]>('/trilhas')
  }

  async createTrilha(data: any) {
    return this.request<any>('/trilhas', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateTrilha(id: string, data: any) {
    return this.request<any>(`/trilhas/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteTrilha(id: string) {
    return this.request<any>(`/trilhas/${id}`, { method: 'DELETE' })
  }

  async getModulos(trilhaId: string) {
    return this.request<any[]>(`/trilhas/${trilhaId}/modulos`)
  }

  // CMS - Modulos
  async getCmsModulos() {
    return this.request<any[]>('/cms')
  }

  async createModulo(data: any) {
    return this.request<any>('/cms', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateModulo(id: string, data: any) {
    return this.request<any>(`/cms/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteModulo(id: string) {
    return this.request<any>(`/cms/${id}`, { method: 'DELETE' })
  }

  // Aulas
  async getAulas(moduloId: string) {
    return this.request<any[]>(`/modulos/${moduloId}/aulas`)
  }

  async createAula(moduloId: string, data: any) {
    return this.request<any>(`/modulos/${moduloId}/aulas`, { method: 'POST', body: JSON.stringify(data) })
  }

  async updateAula(id: string, data: any) {
    return this.request<any>(`/modulos/aulas/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteAula(id: string) {
    return this.request<any>(`/modulos/aulas/${id}`, { method: 'DELETE' })
  }

  // Progresso
  async getProgresso() {
    return this.request<any[]>('/progresso')
  }

  async updateProgresso(moduloId: string, aulaId: string, concluido: boolean) {
    return this.request<any>('/progresso', {
      method: 'PUT',
      body: JSON.stringify({ moduloId, aulaId, concluido }),
    })
  }

  async getProgressoStats() {
    return this.request<any>('/progresso/stats')
  }

  // Certificados
  async getCertificates() {
    return this.request<any[]>('/certificates')
  }

  async createCertificate(trilhaId: string) {
    return this.request<any>('/certificates', {
      method: 'POST',
      body: JSON.stringify({ trilhaId }),
    })
  }

  async approveCertificate(id: string) {
    return this.request<any>(`/certificates/${id}/approve`, { method: 'PUT' })
  }

  // Notificaciones
  async getNotifications() {
    return this.request<any[]>('/notifications')
  }

  async sendNotification(toId: string, titulo: string, mensagem: string) {
    return this.request<any>('/notifications', {
      method: 'POST',
      body: JSON.stringify({ toId, titulo, mensagem }),
    })
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PUT' })
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', { method: 'PUT' })
  }

  // Dashboard
  async getDashboard() {
    return this.request<any>('/dashboard')
  }
}

export const api = new ApiClient()
