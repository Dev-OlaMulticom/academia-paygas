import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'


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

  const level = dashData?.level || Math.floor(xp / 2000) + 1
  const currentLevelXp = (level - 1) * 2000
  const nextLevelXp = level * 2000
  const progressPercent = Math.min(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100, 100)

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Ola! <i className="icon-hand icon-md" /></div>
          <div className="page-subtitle">Bem-vindo a Academia PayGas</div>
        </div>
      </div>

      {/* Level & XP Card */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '24px',
        color: 'white',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>Nivel</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{level}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>XP Total</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{xp || dashData?.xp || 0}</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'white',
            borderRadius: '8px',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
          <span>{xp || dashData?.xp || 0} XP</span>
          <span>{nextLevelXp} XP</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF3C7' }}><i className="icon-book-open icon-lg" /></div>
          <div className="stat-card-val">{dashData?.totalModulos || 0}</div>
          <div className="stat-card-label">Módulos Disponíveis</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#DCFCE7' }}><i className="icon-check-circle icon-lg" /></div>
          <div className="stat-card-val">{dashData?.aulasConcluidas || 0}</div>
          <div className="stat-card-label">Aulas Concluidas</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#E6EEF9' }}><i className="icon-award icon-lg" /></div>
          <div className="stat-card-val">{dashData?.totalCertificados || 0}</div>
          <div className="stat-card-label">Certificados</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#F3E8FF' }}><i className="icon-trophy icon-lg" /></div>
          <div className="stat-card-val">{dashData?.totalQuizzes || 0}</div>
          <div className="stat-card-label">Quizzes Aprovados</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section-title">Acoes Rapidas</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(user?.role === 'ADMIN' ? '/cms' : '/modulos')}
          style={{
            padding: '20px',
            background: 'white',
            border: '2px solid var(--gray-200)',
            borderRadius: '12px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--gray-200)'}
        >
          <i className="icon-book-open icon-lg" style={{ color: '#667eea' }} />
          <div style={{ fontWeight: 'bold', marginTop: '8px' }}>Continuar Estudando</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Acessar módulos</div>
        </button>
        <button
          onClick={() => navigate('/certificados')}
          style={{
            padding: '20px',
            background: 'white',
            border: '2px solid var(--gray-200)',
            borderRadius: '12px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f47c20'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--gray-200)'}
        >
          <i className="icon-award icon-lg" style={{ color: '#f47c20' }} />
          <div style={{ fontWeight: 'bold', marginTop: '8px' }}>Meus Certificados</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{dashData?.totalCertificados || 0} conquistas</div>
        </button>
        {user?.role !== 'ATENDENTE' && (
          <button
            onClick={() => navigate('/relatorios')}
            style={{
              padding: '20px',
              background: 'white',
              border: '2px solid var(--gray-200)',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--gray-200)'}
          >
            <i className="icon-bar-chart-3 icon-lg" style={{ color: '#10b981' }} />
            <div style={{ fontWeight: 'bold', marginTop: '8px' }}>Ver Relatorios</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Acompanhar progresso</div>
          </button>
        )}
      </div>
    </div>
  )
}
