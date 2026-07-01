import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'
import { useAbility } from '../hooks/useAbility'

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
  const { isAdmin, isGestor } = useAbility()
  const [stats, setStats] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [moduleStats, setModuleStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadRelatorios = async () => {
    try {
      const [dashboardData, leaderData] = await Promise.all([
        api.getDashboard(),
        api.getDashboardLeaderboard(),
      ])
      setStats(dashboardData)
      setLeaderboard(leaderData.users || [])

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

  useEffect(() => { loadRelatorios() }, [])

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header">
          <div className="page-title">Carregando...</div>
        </div>
      </div>
    )
  }

  const rankBg = (rank: number) => {
    if (rank === 1) return '#FFD700'
    if (rank === 2) return '#C0C0C0'
    if (rank === 3) return '#CD7F32'
    return 'var(--gray-100)'
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Relatorios</div>
      </div>

      <div className="section-title">Gamificacao</div>
      <div className="cards-grid section-mb-xl">
        {[
          { val: stats?.xp || 0, label: 'XP Total', icon: 'icon-zap', bg: '#FEF0E6' },
          { val: stats?.aulasConcluidas || 0, label: 'Aulas Concluidas', icon: 'icon-bar-chart-3', bg: '#E6EEF9' },
          { val: stats?.totalQuizzes || 0, label: 'Quizzes Aprovados', icon: 'icon-check-circle', bg: '#DCFCE7' },
          { val: stats?.totalCertificados || 0, label: 'Certificados', icon: 'icon-award', bg: '#FEF3C7' },
        ].map((item, i) => (
          <div key={i} className="stat-info">
            <div className="stat-info-top">
              <div className="stat-card-icon" style={{ background: item.bg }}><i className={`${item.icon} icon-lg`} /></div>
              <div className="stat-card-val">{item.val}</div>
            </div>
            <div className="stat-card-label">{item.label}</div>
          </div>
        ))}
      </div>

      {stats?.pointsByAction && stats.pointsByAction.length > 0 && (
        <>
          <div className="section-title">Pontos por Acao</div>
          <div className="rel-action-grid">
            {stats.pointsByAction.map((item: any) => (
              <div key={item.action} className="rel-action-card" style={{ borderLeftColor: ACTION_COLORS[item.action] || '#666' }}>
                <div className="rel-action-label">{ACTION_LABELS[item.action] || item.action}</div>
                <div className="rel-action-val" style={{ color: ACTION_COLORS[item.action] || '#666' }}>{item.totalPoints} XP</div>
                <div className="rel-action-count">{item.count}x realizado</div>
              </div>
            ))}
          </div>
        </>
      )}

      {(isAdmin || isGestor) && leaderboard.length > 0 && (
        <>
          <div className="section-title">Leaderboard - Ranking de XP</div>
          <div className="table-wrap rel-table-wrap">
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
                      <span className={`rel-rank-badge ${u.rank <= 3 ? 'top3' : 'normal'}`} style={{ background: u.rank <= 3 ? rankBg(u.rank) : undefined }}>
                        {u.rank}
                      </span>
                    </td>
                    <td><b>{u.nome}</b></td>
                    <td style={{ color: 'var(--gray-500)' }}>{u.role}</td>
                    <td><span className="rel-level-badge">Lv. {u.level}</span></td>
                    <td><b className="rel-xp-val">{u.xp} XP</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="section-title">Desempenho por Modulo</div>
      <div className="table-wrap rel-table-wrap">
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
                    <div className="rel-progress-wrap">
                      <div className="rel-progress-bar">
                        <div className={`rel-progress-fill ${mod.taxaConclusao === 100 ? 'done' : 'partial'}`} style={{ width: `${mod.taxaConclusao}%` }} />
                      </div>
                      <span className="rel-progress-label">{mod.taxaConclusao}%</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="rel-empty">Nenhum dado de desempenho disponivel</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
