import { encrypt, decrypt, initEncryptionKey } from './crypto'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

class ApiClient {
  private token: string | null = null
  private encryptionEnabled = false

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

    if (isWrite && body && this.encryptionEnabled) {
      try {
        await initEncryptionKey()
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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      body,
      headers,
      signal: controller.signal,
      ...(import.meta.env.DEV ? { cache: 'no-store' } : {}),
    })

    clearTimeout(timeoutId)

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

  async clearAllCache() {
    localStorage.removeItem('user')
    window.location.reload()
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
      localStorage.setItem('user', JSON.stringify(user))
      return user
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('HTTP 401') || msg.includes('HTTP 403') || msg.includes('Não autenticado')) {
        throw error
      }
      const stored = localStorage.getItem('user')
      if (stored) return JSON.parse(stored)
      throw error
    }
  }

  logout() {
    this.setToken(null)
    localStorage.removeItem('user')
  }

  // ==================== USUARIOS ====================

  async getUsuarios() {
    const result = await this.request<any>('/usuarios')
    if (Array.isArray(result)) return result
    if (result?.data && Array.isArray(result.data)) return result.data
    return []
  }

  async createUsuario(data: { email: string; nome: string; senha: string; role: string; gestorId?: string }) {
    return this.request<any>('/usuarios', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateUsuario(id: string, data: any) {
    return this.request<any>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteUsuario(id: string) {
    await this.request(`/usuarios/${id}`, { method: 'DELETE' })
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/usuarios/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
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
    return this.request<any[]>('/usuarios/equipe')
  }

  async getEquipeDetalhe() {
    return this.request<any[]>('/usuarios/equipe/detalhe')
  }

  // ==================== CMS - MODULOS ====================

  async getCmsModulos() {
    const result = await this.request<any>('/cms')
    if (Array.isArray(result)) return result
    if (result?.data && Array.isArray(result.data)) return result.data
    return []
  }

  async createModulo(data: any) {
    return this.request<any>('/cms', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateModulo(id: string, data: any) {
    return this.request<any>(`/cms/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteModulo(id: string) {
    await this.request(`/cms/${id}`, { method: 'DELETE' })
  }

  // ==================== AULAS ====================

  async getAulas(moduloId: string) {
    return this.request<any[]>(`/cms/${moduloId}/aulas`)
  }

  async createAula(moduloId: string, data: any) {
    return this.request<any>(`/cms/${moduloId}/aulas`, { method: 'POST', body: JSON.stringify(data) })
  }

  async updateAula(id: string, data: any) {
    return this.request<any>(`/cms/aulas/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteAula(id: string) {
    await this.request(`/cms/aulas/${id}`, { method: 'DELETE' })
  }

  // ==================== LICAO ====================

  async getLicoes(aulaId: string) {
    return this.request<any[]>(`/cms/aulas/${aulaId}/licoes`)
  }

  async createLicao(aulaId: string, data: any) {
    return this.request<any>(`/cms/aulas/${aulaId}/licoes`, { method: 'POST', body: JSON.stringify(data) })
  }

  async updateLicao(id: string, data: any) {
    return this.request<any>(`/cms/licoes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteLicao(id: string) {
    return this.request<any>(`/cms/licoes/${id}`, { method: 'DELETE' })
  }

  // ==================== QUIZ ====================

  async createQuiz(moduloId: string, data: { aulaId: string; titulo: string; autoGerarCertificado?: boolean; notaMinima?: number }) {
    return this.request<any>(`/cms/${moduloId}/quiz`, { method: 'POST', body: JSON.stringify(data) })
  }

  async getQuiz(moduloId: string, aulaId: string) {
    return this.request<any>(`/cms/${moduloId}/quiz/${aulaId}`)
  }

  async updateQuiz(quizId: string, data: { titulo?: string; autoGerarCertificado?: boolean; notaMinima?: number }) {
    return this.request<any>(`/cms/quiz/${quizId}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteQuiz(quizId: string) {
    await this.request(`/cms/quiz/${quizId}`, { method: 'DELETE' })
  }

  async addPergunta(quizId: string, data: { pergunta: string; opcaoA: string; opcaoB: string; opcaoC?: string; opcaoD?: string; correta: string }) {
    return this.request<any>(`/cms/quiz/${quizId}/perguntas`, { method: 'POST', body: JSON.stringify(data) })
  }

  async updatePergunta(perguntaId: string, data: any) {
    return this.request<any>(`/cms/perguntas/${perguntaId}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deletePergunta(perguntaId: string) {
    await this.request(`/cms/perguntas/${perguntaId}`, { method: 'DELETE' })
  }

  async submitQuiz(quizId: string, respostas: Record<string, string>) {
    return this.request<any>(`/cms/quiz/${quizId}/responder`, {
      method: 'POST',
      body: JSON.stringify({ respostas }),
    })
  }

  // ==================== PROGRESSO ====================

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

  // ==================== CERTIFICADOS ====================

  async getCertificates() {
    const result = await this.request<any>('/certificates')
    if (Array.isArray(result)) return result
    if (result?.data && Array.isArray(result.data)) return result.data
    return []
  }

  async createCertificate(moduloId: string) {
    return this.request<any>('/certificates', {
      method: 'POST',
      body: JSON.stringify({ moduloId }),
    })
  }

  async approveCertificate(id: string) {
    return this.request<any>(`/certificates/${id}/approve`, { method: 'PUT', body: JSON.stringify({}) })
  }

  // ==================== NOTIFICACIONES ====================

  async getNotifications() {
    return this.request<any[]>('/notifications')
  }

  async sendNotification(toId: string, titulo: string, mensagem: string) {
    return this.request<{ success: boolean; sent: number }>('/notifications', {
      method: 'POST',
      body: JSON.stringify({ toId, titulo, mensagem }),
    })
  }

  async sendNotificationBulk(params: { toId?: string; toRole?: string; toTeam?: boolean; titulo: string; mensagem: string }) {
    return this.request<{ success: boolean; sent: number }>('/notifications', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PUT', body: JSON.stringify({}) })
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', { method: 'PUT', body: JSON.stringify({}) })
  }

  // ==================== DASHBOARD ====================

  async getDashboard() {
    return this.request<any>('/dashboard')
  }

  // ==================== GAMIFICATION ====================

  async trackModuleOpen(moduloId: string) {
    return this.request<any>(`/cms/${moduloId}/open`, { method: 'POST', body: JSON.stringify({}) })
  }

  async trackLessonView(aulaId: string) {
    return this.request<any>(`/cms/aula/${aulaId}/view`, { method: 'POST' })
  }

  async getLeaderboard() {
    return this.request<any[]>('/cms/gamification/leaderboard')
  }

  async getGamificationStats() {
    return this.request<any>('/cms/gamification/stats')
  }

  async getDashboardLeaderboard() {
    return this.request<any>('/dashboard/leaderboard')
  }

  // ==================== ANALYTICS ====================

  async getAnalyticsOverview() {
    return this.request<any>('/analytics/overview')
  }

  async getAnalyticsModules() {
    return this.request<any[]>('/analytics/modules')
  }

  async getAnalyticsPersonas() {
    return this.request<any[]>('/analytics/personas')
  }

  async getAnalyticsRegions() {
    return this.request<any[]>('/analytics/regions')
  }

  async getAnalyticsMunicipios() {
    return this.request<any[]>('/analytics/municipios')
  }

  // ==================== FORUM ====================

  async getForumPosts() {
    return this.request<any[]>('/forum')
  }

  async createForumPost(data: { titulo: string; conteudo: string; tags?: string[] }) {
    return this.request<any>('/forum', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async likeForumPost(id: string) {
    return this.request<any>(`/forum/${id}/like`, { method: 'POST' })
  }

  async replyForumPost(id: string, conteudo: string) {
    return this.request<any>(`/forum/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ conteudo }),
    })
  }

  // ==================== GAMIFICATION V2 ====================

  async getAchievements() {
    return this.request<any[]>('/gamification/achievements')
  }

  async getGamificationLeaderboard() {
    return this.request<any[]>('/gamification/leaderboard')
  }

  async getGamificationStatsV2() {
    return this.request<any>('/gamification/stats')
  }

  // ==================== CONQUISTAS ====================

  async getConquistas() {
    return this.request<any[]>('/conquistas')
  }

  async getMyConquistas() {
    return this.request<any[]>('/conquistas/my')
  }

  async createConquista(data: { titulo: string; descricao: string; icone?: string; cor?: string; pontosMinimos?: number; xpRecompensa?: number; ativo?: boolean; ordem?: number }) {
    return this.request<any>('/conquistas', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateConquista(id: string, data: any) {
    return this.request<any>(`/conquistas/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteConquista(id: string) {
    return this.request<any>(`/conquistas/${id}`, { method: 'DELETE' })
  }

  // ==================== PUBLIC ====================

  async getPublicStats() {
    return this.request<any>('/public/stats')
  }

  async getPublicConfig() {
    return this.request<any>('/public/config')
  }

  // ==================== ADMIN MODULES ====================

  async getModules() {
    return this.request<any[]>('/admin/modules')
  }

  async getEnabledModules() {
    return this.request<string[]>('/admin/modules/enabled')
  }

  async toggleModule(key: string, enabled: boolean) {
    return this.request<any>(`/admin/modules/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    })
  }

  // ==================== LOGS / ATIVIDADE ====================

  async getActivityLogs(params?: { userId?: string; startDate?: string; endDate?: string; acao?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.userId) query.set('userId', params.userId)
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    if (params?.acao) query.set('acao', params.acao)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return this.request<any>(`/logs${qs ? `?${qs}` : ''}`)
  }

  async getActivityUsers() {
    return this.request<any[]>('/logs/users')
  }

  async getActivityStats(params?: { startDate?: string; endDate?: string }) {
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    const qs = query.toString()
    return this.request<any>(`/logs/stats${qs ? `?${qs}` : ''}`)
  }

  // ==================== XP CONFIG ====================

  async getXPConfig() {
    return this.request<any[]>('/xp-config')
  }

  async updateXPConfig(action: string, data: { points: number; label?: string; description?: string }) {
    return this.request<any>(`/xp-config/${action}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async createXPConfig(data: { action: string; label: string; points: number; description?: string }) {
    return this.request<any>('/xp-config', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ==================== IMPORT / EXPORT ====================

  async exportCsv(type: 'cursos' | 'aulas' | 'licoes' | 'quiz'): Promise<string> {
    const response = await fetch(`${API_BASE}/import-export/export/${type}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!response.ok) throw new Error('Erro ao exportar')
    return response.text()
  }

  async downloadCsv(type: 'cursos' | 'aulas' | 'licoes' | 'quiz'): Promise<void> {
    const csv = await this.exportCsv(type)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async importCsv(type: 'cursos' | 'aulas' | 'licoes' | 'quiz', csvText: string): Promise<{ created: number; skipped: number; total: number }> {
    return this.request<any>(`/import-export/import/${type}`, {
      method: 'POST',
      body: JSON.stringify({ csv: csvText }),
    })
  }
}

export const api = new ApiClient()
