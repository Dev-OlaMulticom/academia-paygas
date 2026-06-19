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
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-card-val" style={{ fontSize: '24px' }}>{stats.totalLogs || 0}</div>
            <div className="stat-card-label">Total de Registros</div>
          </div>
          {stats.byAction?.slice(0, 3).map((a: any, i: number) => (
            <div className="stat-card" key={i}>
              <div className="stat-card-val" style={{ fontSize: '20px' }}>{a.count}</div>
              <div className="stat-card-label" style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.acao}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '16px' }}>
        <div className="section-title" style={{ marginBottom: '14px' }}>Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div className="form-field">
            <label className="form-label" style={{ fontSize: '12px' }}>Usuário</label>
            <select
              className="form-input"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
            >
              <option value="">Todos</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" style={{ fontSize: '12px' }}>Ação</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ex: Login, Criar, Quiz..."
              value={filters.acao}
              onChange={(e) => handleFilterChange('acao', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" style={{ fontSize: '12px' }}>Data Inicial</label>
            <input
              className="form-input"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" style={{ fontSize: '12px' }}>Data Final</label>
            <input
              className="form-input"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className="btn-secondary" onClick={() => { loadLogs(); loadStats() }}>
            Aplicar Filtros
          </button>
          <button className="btn-secondary" style={{ background: 'var(--gray-100)' }} onClick={clearFilters}>
            Limpar
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: '14px' }}>Registros ({total})</b>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </button>
              <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{page} / {totalPages}</span>
              <button
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Próximo
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>Nenhum registro encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Data e Hora</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Usuário</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Role</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Ação</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <b style={{ color: 'var(--gray-900)' }}>{log.user?.nome || '—'}</b>
                      <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{log.user?.email}</div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: roleColor(log.user?.role || ''),
                        color: '#fff',
                      }}>
                        {log.user?.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--gray-700)', fontWeight: 500 }}>
                      {log.acao}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--gray-500)', fontSize: '12px' }}>
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
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '20px', marginTop: '16px' }}>
          <div className="section-title" style={{ marginBottom: '14px' }}>Usuários Mais Ativos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.byUser.map((u: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-400)', width: '24px' }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: '13px', color: 'var(--gray-900)' }}>{u.nome}</b>
                  <span style={{ fontSize: '11px', color: 'var(--gray-400)', marginLeft: '8px' }}>{u.email}</span>
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: roleColor(u.role || ''),
                  color: '#fff',
                }}>
                  {u.role}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--pg-orange)' }}>{u.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
