import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { User } from '../hooks/useAuth'

interface LogsPageProps {
  user: User
}

interface ActivityLog {
  id: string
  userId: string
  acao: string
  detalhes: string | null
  createdAt: string
  user: { id: string; nome: string; email: string; role: string }
}

export function LogsPage({ user: _user }: LogsPageProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [filters, setFilters] = useState({
    userId: '',
    acao: '',
    startDate: '',
    endDate: '',
  })

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.getActivityUsers()
      setUsers(data)
    } catch { /* */ }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const params: any = {}
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate
      const data = await api.getActivityStats(params)
      setStats(data)
    } catch { /* */ }
  }, [filters.startDate, filters.endDate])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 50 }
      if (filters.userId) params.userId = filters.userId
      if (filters.acao) params.acao = filters.acao
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate

      const result = await api.getActivityLogs(params)
      setLogs(result.data || [])
      setTotal(result.pagination?.total || 0)
      setTotalPages(result.pagination?.totalPages || 1)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, filters.userId, filters.acao, filters.startDate, filters.endDate])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [loadLogs, loadStats])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ userId: '', acao: '', startDate: '', endDate: '' })
    setPage(1)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const roleColor = (role: string) => {
    if (role === 'ADMIN') return 'var(--pg-red)'
    if (role === 'GESTOR') return 'var(--pg-gold)'
    return 'var(--pg-green)'
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Logs de Atividade</div>
      </div>

      {stats && (
        <div className="cards-grid logs-stats-grid">
          <div className="stat-card">
            <div className="stat-card-val logs-stat-val">{stats.totalLogs || 0}</div>
            <div className="stat-card-label">Total de Registros</div>
          </div>
          {stats.byAction?.slice(0, 3).map((a: any, i: number) => (
            <div className="stat-card" key={i}>
              <div className="stat-card-val logs-stat-val-sm">{a.count}</div>
              <div className="stat-card-label logs-stat-label-trunc">{a.acao}</div>
            </div>
          ))}
        </div>
      )}

      <div className="logs-filters">
        <div className="section-title logs-filters-title">Filtros</div>
        <div className="logs-filters-grid">
          <div className="form-field">
            <label className="form-label logs-filters-label">Usuário</label>
            <select className="form-input" value={filters.userId} onChange={(e) => handleFilterChange('userId', e.target.value)}>
              <option value="">Todos</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label logs-filters-label">Ação</label>
            <input className="form-input" type="text" placeholder="Ex: Login, Criar, Quiz..." value={filters.acao} onChange={(e) => handleFilterChange('acao', e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label logs-filters-label">Data Inicial</label>
            <input className="form-input" type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label logs-filters-label">Data Final</label>
            <input className="form-input" type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
          </div>
        </div>
        <div className="logs-filters-actions">
          <button className="btn-secondary" onClick={() => { loadLogs(); loadStats() }}>
            Aplicar Filtros
          </button>
          <button className="btn-secondary logs-clear-btn" onClick={clearFilters}>
            Limpar
          </button>
        </div>
      </div>

      <div className="logs-table-wrap">
        <div className="logs-table-header">
          <b className="logs-table-title">Registros ({total})</b>
          {totalPages > 1 && (
            <div className="logs-table-page">
              <button className="btn-secondary logs-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </button>
              <span className="logs-page-info">{page} / {totalPages}</span>
              <button className="btn-secondary logs-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Próximo
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="logs-loading">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="logs-empty">Nenhum registro encontrado</div>
        ) : (
          <div className="logs-table-scroll">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Data e Hora</th>
                  <th>Usuário</th>
                  <th>Role</th>
                  <th>Ação</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="logs-td-date">
                      {formatDate(log.createdAt)}
                    </td>
                    <td>
                      <b className="logs-td-user-name">{log.user?.nome || '—'}</b>
                      <div className="logs-td-user-email">{log.user?.email}</div>
                    </td>
                    <td>
                      <span className="logs-role-badge" style={{ background: roleColor(log.user?.role || '') }}>
                        {log.user?.role}
                      </span>
                    </td>
                    <td className="logs-td-acao">
                      {log.acao}
                    </td>
                    <td className="logs-td-detalhes">
                      {log.detalhes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stats?.byUser && stats.byUser.length > 0 && (
        <div className="logs-most-active">
          <div className="section-title logs-most-active-title">Usuários Mais Ativos</div>
          <div className="logs-most-active-list">
            {stats.byUser.map((u: any, i: number) => (
              <div key={i} className="logs-most-active-item">
                <span className="logs-most-active-rank">#{i + 1}</span>
                <div className="logs-most-active-info">
                  <b className="logs-most-active-name">{u.nome}</b>
                  <span className="logs-most-active-email">{u.email}</span>
                </div>
                <span className="logs-role-badge" style={{ background: roleColor(u.role || '') }}>
                  {u.role}
                </span>
                <span className="logs-most-active-count">{u.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}