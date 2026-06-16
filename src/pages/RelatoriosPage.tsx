import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'


interface RelatoriosPageProps {
  user: User
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Acesso',
  MODULE_OPEN: 'Abriu Modulo',
  LESSON_COMPLETE: 'Aula Concluida',
  MODULE_COMPLETE: 'Modulo Concluido',
  QUIZ_CORRECT: 'Quiz Correto',
  QUIZ_PASS: 'Quiz Aprovado',
  CERTIFICATE: 'Certificado',
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#6366f1',
  MODULE_OPEN: '#8b5cf6',
  LESSON_COMPLETE: '#06b6d4',
  MODULE_COMPLETE: '#10b981',
  QUIZ_CORRECT: '#f59e0b',
  QUIZ_PASS: '#22c55e',
  CERTIFICATE: '#f47c20',
}

export function RelatoriosPage({ user }: RelatoriosPageProps) {
  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const [stats, setStats] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [gamificationStats, setGamificationStats] = useState<any>(null)
  const [moduleStats, setModuleStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRelatorios()
  }, [])

  const loadRelatorios = async () => {
    try {
      const [dashboardData, leaderData, gamData] = await Promise.all([
        api.getDashboard(),
        api.getDashboardLeaderboard(),
        api.getGamificationStats(),
      ])

      setStats(dashboardData)
      setLeaderboard(leaderData.users || [])
      setGamificationStats(gamData)

      // Build module stats from dashboard
      const modulos = await api.getCmsModulos()
      const progress = await api.getProgresso()

      const modStats = modulos.map((m: any) => {
        const modProgress = progress.filter((p: any) => p.moduloId === m.id)
        const completed = modProgress.filter((p: any) => p.concluido).length
        const total = m._count?.aulas || m.aulas?.length || 0
        return {
          nome: m.titulo,
          concluidos: completed,
          emAndamento: modProgress.length - completed,
          total,
          taxaConclusao: total > 0 ? Math.round((completed / total) * 100) : 0,
          notaMedia: '-',
        }
      })

      setModuleStats(modStats)
    } catch {
      setStats({ aulasConcluidas: 0, totalQuizzes: 0, totalCertificados: 0, xp: 0 })
      setLeaderboard([])
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
        <div className="page-title">Relatorios</div>
      </div>

      {/* Gamification Stats */}
      <div className="section-title">Gamificacao</div>
      <div className="cards-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF0E6' }}><i className="icon-zap icon-lg" /></div>
          <div className="stat-card-val">{stats?.xp || 0}</div>
          <div className="stat-card-label">XP Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#E6EEF9' }}><i className="icon-bar-chart-3 icon-lg" /></div>
          <div className="stat-card-val">{stats?.aulasConcluidas || 0}</div>
          <div className="stat-card-label">Aulas Concluidas</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#DCFCE7' }}><i className="icon-check-circle icon-lg" /></div>
          <div className="stat-card-val">{stats?.totalQuizzes || 0}</div>
          <div className="stat-card-label">Quizzes Aprovados</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF3C7' }}><i className="icon-award icon-lg" /></div>
          <div className="stat-card-val">{stats?.totalCertificados || 0}</div>
          <div className="stat-card-label">Certificados</div>
        </div>
      </div>

      {/* Points Breakdown */}
      {stats?.pointsByAction && stats.pointsByAction.length > 0 && (
        <>
          <div className="section-title">Pontos por Acao</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {stats.pointsByAction.map((item: any) => (
              <div key={item.action} style={{
                padding: '16px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid var(--gray-200)',
                borderLeft: `4px solid ${ACTION_COLORS[item.action] || '#666'}`,
              }}>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                  {ACTION_LABELS[item.action] || item.action}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: ACTION_COLORS[item.action] || '#666' }}>
                  {item.totalPoints} XP
                </div>
                <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                  {item.count}x realizado
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Leaderboard */}
      {(isAdmin || isGestor) && leaderboard.length > 0 && (
        <>
          <div className="section-title">Leaderboard - Ranking de XP</div>
          <div className="table-wrap" style={{ marginBottom: '24px' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Usuario</th>
                  <th>Perfil</th>
                  <th>Nivel</th>
                  <th>XP</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u: any) => (
                  <tr key={u.id} style={{ background: u.id === user?.id ? '#f0f9ff' : undefined }}>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: u.rank <= 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][u.rank - 1] : 'var(--gray-100)',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        color: u.rank <= 3 ? 'white' : 'var(--gray-600)',
                      }}>
                        {u.rank}
                      </span>
                    </td>
                    <td><b>{u.nome}</b></td>
                    <td style={{ color: 'var(--gray-500)' }}>{u.role}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#E6EEF9',
                        color: '#0A2E6E',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}>
                        Lv. {u.level}
                      </span>
                    </td>
                    <td><b style={{ color: 'var(--pg-orange)' }}>{u.xp} XP</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Module Performance */}
      <div className="section-title">Desempenho por Modulo</div>
      <div className="table-wrap" style={{ marginBottom: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>Modulo</th>
              <th>Concluidos</th>
              <th>Em Andamento</th>
              <th>Taxa Conclusao</th>
            </tr>
          </thead>
          <tbody>
            {moduleStats.length > 0 ? (
              moduleStats.map((mod: any, i: number) => (
                <tr key={i}>
                  <td><b>{mod.nome}</b></td>
                  <td>{mod.concluidos}</td>
                  <td>{mod.emAndamento}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', background: 'var(--gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${mod.taxaConclusao}%`, height: '100%', background: mod.taxaConclusao === 100 ? '#22c55e' : '#6366f1', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{mod.taxaConclusao}%</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '20px' }}>
                  Nenhum dado de desempenho disponivel
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
