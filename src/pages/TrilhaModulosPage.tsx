import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export function TrilhaModulosPage() {
  const navigate = useNavigate()
  const { trilhaId } = useParams<{ trilhaId: string }>()
  const [modulos, setModulos] = useState<any[]>([])
  const [trilha, setTrilha] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrilhaModulos()
  }, [trilhaId])

  const loadTrilhaModulos = async () => {
    if (!trilhaId) return
    try {
      const [trilhaData, modulosData] = await Promise.all([
        api.getTrilhas().then(trilhas => trilhas.find((t: any) => t.id === trilhaId || t._id === trilhaId)),
        api.getModulos(trilhaId)
      ])
      setTrilha(trilhaData)
      setModulos(modulosData)
    } catch (err) {
      console.error('Erro ao carregar módulos:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header">
          <div className="page-title">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} onClick={() => navigate('/trilhas-aprendizado')}><i className="icon-arrow-left icon-sm" /> Voltar às Trilhas</button>
          <div className="page-title">{trilha?.titulo || 'Trilha'}</div>
          <div className="page-subtitle">{modulos.length} módulos disponíveis</div>
        </div>
      </div>
      <div className="track-grid">
        {modulos.length > 0 ? (
          modulos.map((modulo: any) => (
            <div key={modulo.id || modulo._id} className="track-card" onClick={() => navigate(`/modulo/${slugify(modulo.titulo || modulo.title || 'modulo')}`)}>
              <div className="track-card-top">
                <div className="track-icon" style={{ background: modulo.color || '#E6EEF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="icon-book-open icon-lg" /></div>
                <div className="track-card-info">
                  <h3>{modulo.titulo || modulo.title}</h3>
                  <p>{modulo.descricao || modulo.description || ''}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="track-badge badge-gray" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                  {modulo._count?.aulas || modulo.aulas?.length || modulo.lessons?.length || 0} aulas
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
            Nenhum módulo encontrado nesta trilha
          </div>
        )}
      </div>
    </div>
  )
}
