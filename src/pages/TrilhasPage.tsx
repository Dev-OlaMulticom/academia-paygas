import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface TrilhasPageProps {
  tracks: any[]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export function TrilhasPage({ tracks }: TrilhasPageProps) {
  const navigate = useNavigate()
  const [trilhas, setTrilhas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrilhas()
  }, [])

  const loadTrilhas = async () => {
    try {
      const data = await api.getTrilhas()
      setTrilhas(data)
    } catch {
      setTrilhas([])
    } finally {
      setLoading(false)
    }
  }

  const displayTrilhas = trilhas

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Trilhas de Aprendizado</div>
          <div className="page-subtitle">{displayTrilhas.length} trilhas disponíveis</div>
        </div>
      </div>
      <div className="track-grid">
        {displayTrilhas.length > 0 ? (
          displayTrilhas.map((trilha: any, i: number) => {
            const progress = trilha.progressPercent ?? 0
            return (
              <div key={trilha.id || i} className="track-card" onClick={() => navigate(`/trilhas-aprendizado/${trilha.id}`)}>
                <div className="track-card-top">
                  <div className="track-icon" style={{ background: trilha.color }}>{trilha.icon}</div>
                  <div className="track-card-info">
                    <h3>{trilha.titulo}</h3>
                    <p>{trilha.descricao}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span className={`track-badge ${trilha.obrigatorio ? 'badge-required' : 'badge-new'}`}>
                    {trilha.obrigatorio ? 'Obrigatória' : 'Opcional'}
                  </span>
                  <span className="track-badge badge-gray" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                    {trilha.lessons || 0} aulas
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
            {loading ? 'Carregando trilhas...' : 'Nenhuma trilha encontrada'}
          </div>
        )}
      </div>
    </div>
  )
}
