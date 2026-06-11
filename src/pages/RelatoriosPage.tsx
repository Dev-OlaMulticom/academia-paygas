import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'


interface RelatoriosPageProps {
  user: User
}

export function RelatoriosPage({ user }: RelatoriosPageProps) {
  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [moduleStats, setModuleStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRelatorios()
  }, [])

  const loadRelatorios = async () => {
    try {
      // For now, load from database
      const users = await api.getUsuarios()
      const progress = await api.getProgresso()
      
      // Calculate stats from actual data
      const totalUsers = users.length
      const completedProgress = progress.filter((p: any) => p.concluido).length
      const completionRate = totalUsers > 0 ? Math.round((completedProgress / Math.max(progress.length, 1)) * 100) : 0
      
      setStats({
        completionRate,
        averageQuizScore: 0,
        activeUsers: totalUsers,
        totalXP: 0
      })
      
      setActivityLogs([])
      setModuleStats([])
    } catch {
      setStats({ completionRate: 0, averageQuizScore: 0, activeUsers: 0, totalXP: 0 })
      setActivityLogs([])
      setModuleStats([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header">
          <div className="page-title">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Relatórios</div>
      </div>
      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#DCFCE7' }}><i className="icon-bar-chart-3 icon-lg" /></div>
          <div className="stat-card-val">{stats?.completionRate || 0}%</div>
          <div className="stat-card-label">Taxa de Conclusão</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF3C7' }}><i className="icon-star icon-lg" /></div>
          <div className="stat-card-val">{stats?.averageQuizScore || 0}</div>
          <div className="stat-card-label">Nota Média nos Quizzes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#E6EEF9' }}><i className="icon-users icon-lg" /></div>
          <div className="stat-card-val">{stats?.activeUsers || 0}</div>
          <div className="stat-card-label">Usuários Ativos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF0E6' }}><i className="icon-zap icon-lg" /></div>
          <div className="stat-card-val">0</div>
          <div className="stat-card-label">XP Total da Equipe</div>
        </div>
      </div>
      {(isAdmin || isGestor) && (
        <>
          <div className="section-title">Log de Atividades</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Detalhes</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.length > 0 ? (
                  activityLogs.map((log, i) => (
                    <tr key={i}>
                      <td><b>{log.usuario}</b></td>
                      <td>{log.acao}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{log.detalhes}</td>
                      <td style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{log.data}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '20px' }}>
                      Nenhuma atividade registrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="section-title">Desempenho por Módulo</div>
      <div className="table-wrap" style={{ marginBottom: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>Módulo</th>
              <th>Concluídos</th>
              <th>Em Andamento</th>
              <th>Taxa Conclusão</th>
              <th>Nota Média</th>
            </tr>
          </thead>
          <tbody>
            {moduleStats.length > 0 ? (
              moduleStats.map((mod: any, i: number) => (
                <tr key={i}>
                  <td><b>{mod.nome}</b></td>
                  <td>{mod.concluidos}</td>
                  <td>{mod.emAndamento}</td>
                  <td><div className="progress-cell"><div className="progress-mini"><div className="progress-mini-fill" style={{ width: mod.taxaConclusao + '%' }}></div></div>{mod.taxaConclusao}%</div></td>
                  <td><b>{mod.notaMedia}</b></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '20px' }}>
                  Nenhum dado de desempenho disponível
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
