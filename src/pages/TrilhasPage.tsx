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
      setDbTracks([])
    } finally {
      setLoading(false)
    }
  }

  const displayTracks = dbTracks

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Módulos</div>
          <div className="page-subtitle">{displayTracks.length} módulos disponíveis</div>
        </div>
      </div>
      <div className="track-grid">
        {displayTracks.length > 0 ? (
          displayTracks.map((track: any, i: number) => {
            const progress = track.progressPercent ?? [100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] ?? 0
            return (
              <div key={track.id || i} className="track-card" onClick={() => navigate(`/modulos/${track.id || i}`)}>
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
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
            Dados não carregados
          </div>
        )}
      </div>
    </div>
  )
}
