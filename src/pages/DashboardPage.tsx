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
          <div className="page-title">Olá! 👋</div>
          <div className="page-subtitle">Bem-vindo à Academia PayGas</div>
        </div>
        <div className="level-badge">⭐ Nível {Math.floor(xp / 2000) + 1}</div>
      </div>
      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF3C7' }}>📚</div>
          <div className="stat-card-val">{tracks.length}</div>
          <div className="stat-card-label">Trilhas Disponíveis</div>
          <div className="stat-card-trend trend-up">↑ +2 novas</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#DCFCE7' }}>✅</div>
          <div className="stat-card-val">{Math.ceil(tracks.length * 0.3)}</div>
          <div className="stat-card-label">Trilhas Concluídas</div>
          <div className="stat-card-trend trend-up">30%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#E6EEF9' }}>⚡</div>
          <div className="stat-card-val">{xp.toLocaleString('pt-BR')}</div>
          <div className="stat-card-label">XP Acumulado</div>
          <div className="stat-card-trend trend-up">↑ +150 hoje</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF0E6' }}>🏆</div>
          <div className="stat-card-val">{Math.ceil(tracks.length * 0.2)}</div>
          <div className="stat-card-label">Certificados</div>
          <div className="stat-card-trend trend-up">Emissão automática</div>
        </div>
      </div>
      <div className="two-col" style={{ gap: '16px', marginBottom: '24px' }}>
        <div>
          <div className="section-title">Continuar Aprendendo</div>
          {tracks.slice(0, 3).map((track: any, i: number) => (
            <div key={track.id} className="track-card" onClick={() => navigate('/modulos')} style={{ marginBottom: '10px' }}>
              <div className="track-card-top">
                <div className="track-icon" style={{ background: track.color }}>{track.icon}</div>
                <div className="track-card-info">
                  <h3>{track.label}</h3>
                  <p>{track.lessons} aulas · {track.desc.substring(0, 40)}...</p>
                </div>
              </div>
              <div className="track-prog-bar">
                <div className="track-prog-fill" style={{ width: [45, 72, 100][i] + '%' }}></div>
              </div>
              <div className="track-meta">
                <span>{[45, 72, 100][i]}% concluído</span>
                <span className={`track-badge ${[45, 72, 100][i] === 100 ? 'badge-done' : 'badge-progress'}`}>
                  {[45, 72, 100][i] === 100 ? '✓ Concluído' : 'Em andamento'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="section-title">Atividade Recente</div>
          <div className="activity-feed">
            <div className="activity-header">Atividade Recente <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: '400' }}>Últimos 7 dias</span></div>
            <div className="activity-item">
              <div className="activity-dot" style={{ background: '#F47C20' }}></div>
              <div className="activity-body">Você completou a aula "Cashback: Como Explicar ao Cliente"<span>Há 1 hora</span></div>
            </div>
            <div className="activity-item">
              <div className="activity-dot" style={{ background: '#16A34A' }}></div>
              <div className="activity-body">Certificado de Atendimento emitido<span>Há 3 horas</span></div>
            </div>
            <div className="activity-item">
              <div className="activity-dot" style={{ background: '#0A2E6E' }}></div>
              <div className="activity-body">Trilha "Sistema de Cashback" iniciada<span>Ontem</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="section-title">Progresso Semanal</div>
      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--gray-400)', marginBottom: '8px' }}>
          <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
        </div>
        <div className="mini-chart">
          {[20, 45, 30, 60, 80, 55, 90].map((h, i) => (
            <div key={i} className={`mini-bar ${i === 6 ? 'active' : ''}`} style={{ height: h + '%' }} title={h + ' min'}></div>
          ))}
        </div>
      </div>
    </div>
  )
}
