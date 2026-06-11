import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface TrilhasPageProps {
  tracks: any[]
}

export function TrilhasPage({ tracks }: TrilhasPageProps) {
  const navigate = useNavigate()
  const [dbTracks, setDbTracks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    try {
      const data = await api.getTrilhas()
      setDbTracks(data)
    } catch {
      // Use props tracks as fallback
      setDbTracks(tracks.map((t, i) => ({
        ...t,
        titulo: t.label,
        descricao: t.desc,
        lessons: t.lessons,
        obrigatorio: t.required,
        color: t.color,
        icon: t.icon,
        progressPercent: [100, 72, 45, 0, 100, 30, 60, 0][i] || 0,
      })))
    } finally {
      setLoading(false)
    }
  }

  const displayTracks = dbTracks.length > 0 ? dbTracks : tracks.map((t, i) => ({
    ...t,
    titulo: t.label,
    descricao: t.desc,
    lessons: t.lessons,
    obrigatorio: t.required,
    color: t.color,
    icon: t.icon,
    progressPercent: [100, 72, 45, 0, 100, 30, 60, 0][i] || 0,
  }))

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Trilhas de Aprendizado</div>
          <div className="page-subtitle">{displayTracks.length} trilhas disponíveis</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="track-badge badge-progress" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Todas</button>
          <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Obrigatórias</button>
          <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Em Andamento</button>
          <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Concluídas</button>
        </div>
      </div>
      <div className="track-grid">
        {displayTracks.map((track: any, i: number) => {
          const progress = track.progressPercent ?? [100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] ?? 0
          return (
            <div key={track.id || i} className="track-card" onClick={() => navigate('/modulos')}>
              <div className="track-card-top">
                <div className="track-icon" style={{ background: track.color }}>{track.icon}</div>
                <div className="track-card-info">
                  <h3>{track.titulo || track.label}</h3>
                  <p>{track.descricao || track.desc}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className={`track-badge ${track.obrigatorio || track.required ? 'badge-required' : 'badge-new'}`}>
                  {track.obrigatorio || track.required ? 'Obrigatória' : 'Opcional'}
                </span>
                <span className="track-badge badge-gray" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                  {track.lessons || 0} aulas
                </span>
              </div>
              <div className="track-prog-bar">
                <div className="track-prog-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="track-meta">
                <span>{progress}% concluído</span>
                <span className={`track-badge ${progress === 100 ? 'badge-done' : progress > 0 ? 'badge-progress' : 'badge-new'}`}>
                  {progress === 100 ? '✓ Concluído' : progress > 0 ? 'Em andamento' : 'Iniciar'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
