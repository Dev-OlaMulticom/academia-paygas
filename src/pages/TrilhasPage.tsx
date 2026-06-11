import { useNavigate } from 'react-router-dom'

interface TrilhasPageProps {
  tracks: any[]
}

export function TrilhasPage({ tracks }: TrilhasPageProps) {
  const navigate = useNavigate()

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Trilhas de Aprendizado</div>
          <div className="page-subtitle">{tracks.length} trilhas disponíveis</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="track-badge badge-progress" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Todas</button>
          <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Obrigatórias</button>
          <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Em Andamento</button>
          <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Concluídas</button>
        </div>
      </div>
      <div className="track-grid">
        {tracks.map((track: any, i: number) => (
          <div key={track.id} className="track-card" onClick={() => navigate('/modulos')}>
            <div className="track-card-top">
              <div className="track-icon" style={{ background: track.color }}>{track.icon}</div>
              <div className="track-card-info">
                <h3>{track.label}</h3>
                <p>{track.desc}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span className={`track-badge ${track.required ? 'badge-required' : 'badge-new'}`}>
                {track.required ? 'Obrigatória' : 'Opcional'}
              </span>
              <span className="track-badge badge-gray" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                {track.lessons} aulas
              </span>
            </div>
            <div className="track-prog-bar">
              <div className="track-prog-fill" style={{ width: [100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] + '%' }}></div>
            </div>
            <div className="track-meta">
              <span>{[100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i]}% concluído</span>
              <span className={`track-badge ${[100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] === 100 ? 'badge-done' : [100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] > 0 ? 'badge-progress' : 'badge-new'}`}>
                {[100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] === 100 ? '✓ Concluído' : [100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] > 0 ? 'Em andamento' : 'Iniciar'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
