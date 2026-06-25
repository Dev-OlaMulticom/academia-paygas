import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { XP_PER_LEVEL } from '../lib/constants'

interface DashboardPageProps {
  xp: number
  user?: any
}

export function DashboardPage({ xp, user }: DashboardPageProps) {
  const navigate = useNavigate()
  const [dashData, setDashData] = useState<any>(null)

  const loadDashboard = async () => {
    try {
      const data = await api.getDashboard()
      setDashData(data)
    } catch {
      setDashData(null)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const level = dashData?.level || Math.floor(xp / XP_PER_LEVEL) + 1
  const currentLevelXp = (level - 1) * XP_PER_LEVEL
  const nextLevelXp = level * XP_PER_LEVEL
  const displayXp = dashData?.xp ?? xp ?? 0
  const progressPercent = Math.min(((displayXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100, 100)

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Ola! <i className="icon-hand icon-md" /></div>
          <div className="page-subtitle">Bem-vindo a Academia PayGas</div>
        </div>
      </div>

      <div className="gamif-card">
        <div className="gamif-card-top">
          <div className="gamif-card-stat">
            <div className="gamif-card-label">Nivel</div>
            <div className="gamif-card-val">{level}</div>
          </div>
          <div className="gamif-card-stat-right">
            <div className="gamif-card-label">XP Total</div>
            <div className="gamif-card-val--sm">{displayXp}</div>
          </div>
        </div>
        <div className="gamif-bar">
          <div className="gamif-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="gamif-bar-footer">
          <span>{displayXp} XP</span>
          <span>{nextLevelXp} XP</span>
        </div>
      </div>

      <div className="cards-grid">
        {[
          { val: dashData?.totalModulos || 0, label: 'Modulos Disponiveis', icon: 'icon-book-open', bg: '#FEF3C7' },
          { val: dashData?.aulasConcluidas || 0, label: 'Aulas Concluidas', icon: 'icon-check-circle', bg: '#DCFCE7' },
          { val: dashData?.totalCertificados || 0, label: 'Certificados', icon: 'icon-award', bg: '#E6EEF9' },
          { val: dashData?.totalQuizzes || 0, label: 'Quizzes Aprovados', icon: 'icon-trophy', bg: '#F3E8FF' },
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

      <div className="section-title">Acoes Rapidas</div>
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <button
          className="quick-action-card"
          onClick={() => navigate(user?.role === 'ADMIN' ? '/cms' : '/modulos')}
        >
          <div className="qa-icon" style={{ background: '#EEF2FF' }}>
            <i className="icon-book-open" style={{ color: '#667eea' }} />
          </div>
          <div className="qa-title">Continuar Estudando</div>
          <div className="qa-desc">Acessar trilhas de aprendizado</div>
        </button>

        <button
          className="quick-action-card"
          onClick={() => navigate('/certificados')}
        >
          <div className="qa-icon" style={{ background: '#FEF3C7' }}>
            <i className="icon-award" style={{ color: '#D97706' }} />
          </div>
          <div className="qa-title">Meus Certificados</div>
          <div className="qa-desc">{dashData?.totalCertificados || 0} conquistas</div>
        </button>

        {user?.role !== 'ATENDENTE' && (
          <button
            className="quick-action-card"
            onClick={() => navigate('/relatorios')}
          >
            <div className="qa-icon" style={{ background: '#DCFCE7' }}>
              <i className="icon-bar-chart-3" style={{ color: '#16A34A' }} />
            </div>
            <div className="qa-title">Ver Relatorios</div>
            <div className="qa-desc">Acompanhar progresso da equipe</div>
          </button>
        )}
      </div>
    </div>
  )
}
