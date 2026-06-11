import { useNavigate } from 'react-router-dom'


interface DashboardPageProps {
  xp: number
  tracks: any[]
}

export function DashboardPage({ xp, tracks }: DashboardPageProps) {
  const navigate = useNavigate()

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Olá! <i className="icon-hand icon-md" /></div>
          <div className="page-subtitle">Bem-vindo à Academia PayGas</div>
        </div>
      </div>
      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF3C7' }}><i className="icon-book-open icon-lg" /></div>
          <div className="stat-card-val">{tracks.length}</div>
          <div className="stat-card-label">Trilhas Disponíveis</div>
        </div>
      </div>
    </div>
  )
}
