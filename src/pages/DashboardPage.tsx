import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { XP_PER_LEVEL } from '../lib/constants'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'


interface DashboardPageProps {
  xp: number
  user?: any
}

function StatInfo({ val, label, icon, bg, tip }: { val: number; label: string; icon: string; bg: string; tip: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="stat-info">
      <div className="stat-info-top">
        <div className="stat-card-icon" style={{ background: bg }}><i className={`${icon} icon-lg`} /></div>
        <div className="stat-card-val">{val}</div>
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <button className="stat-info-trigger" onClick={() => setOpen(true)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>i</button>
          </TooltipTrigger>
          <TooltipContent side="top" onPointerDownOutside={() => setOpen(false)}>{tip}</TooltipContent>
        </Tooltip>
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
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
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{displayXp}</div>
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
          <span>{displayXp} XP</span>
          <span>{nextLevelXp} XP</span>
        </div>
      </div>

      <div className="cards-grid">
        {[
          { val: dashData?.totalModulos || 0, label: 'Modulos Disponiveis', icon: 'icon-book-open', bg: '#FEF3C7', tip: 'Quantidade total de modulos/cursos disponiveis para voce estudar' },
          { val: dashData?.aulasConcluidas || 0, label: 'Aulas Concluidas', icon: 'icon-check-circle', bg: '#DCFCE7', tip: 'Total de aulas que voce ja finalizou com sucesso' },
          { val: dashData?.totalCertificados || 0, label: 'Certificados', icon: 'icon-award', bg: '#E6EEF9', tip: 'Certificados obtidos ao completar modulos com quiz aprovado' },
          { val: dashData?.totalQuizzes || 0, label: 'Quizzes Aprovados', icon: 'icon-trophy', bg: '#F3E8FF', tip: 'Quizzes em que voce atingiu a nota minima (7/10)' },
        ].map((item, i) => (
          <StatInfo key={i} {...item} />
        ))}
      </div>

      <div className="section-title">Acoes Rapidas</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="quick-action-card"
              onClick={() => navigate(user?.role === 'ADMIN' ? '/cms' : '/modulos')}
              style={{ '--qa-color': '#667eea' } as React.CSSProperties}
            >
              <div className="qa-icon" style={{ background: '#EEF2FF' }}>
                <i className="icon-book-open" style={{ color: '#667eea' }} />
              </div>
              <div className="qa-title">Continuar Estudando</div>
              <div className="qa-desc">Acessar trilhas de aprendizado</div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {user?.role === 'ADMIN' ? 'Gerenciar conteudo e modulos do sistema' : 'Acessar os cursos e trilhas disponiveis para seu aprendizado'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Visualizar e baixar seus certificados de conclusao
          </TooltipContent>
        </Tooltip>

        {user?.role !== 'ATENDENTE' && (
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Acompanhar o progresso e desempenho da sua equipe em tempo real
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
