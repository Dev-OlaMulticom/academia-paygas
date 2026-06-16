import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

const MODULO_ICONS = ['📚', '💰', '📊', '📱', '🏪', '⛪', '💻', '📣', '🔒', '🚀', '💼', '⚡']
const MODULO_COLORS = ['#FEF3C7', '#DCFCE7', '#E6EEF9', '#F3E8FF', '#FCE7F3', '#CFFAFE', '#F1F5F9', '#FEF0E6', '#F0FDF4', '#EDE9FE', '#FEF9C3', '#E0F2FE']

export function ModulosListPage() {
  const navigate = useNavigate()
  const [modulos, setModulos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModulos()
  }, [])

  const loadModulos = async () => {
    try {
      const mods = await api.getCmsModulos()
      setModulos(mods)
    } catch {
      setModulos([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">Carregando módulos...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Módulos</div>
          <div className="page-subtitle">{modulos.length} módulos disponíveis</div>
        </div>
      </div>

      {modulos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <p>Nenhum módulo disponível no momento.</p>
        </div>
      ) : (
        <div className="track-grid">
          {modulos.map((mod, i) => {
            const icon = MODULO_ICONS[i % MODULO_ICONS.length]
            const color = MODULO_COLORS[i % MODULO_COLORS.length]
            const aulasCount = mod._count?.aulas || 0
            const slug = slugify(mod.titulo || mod.title || '')
            const pct = 0

            return (
              <div
                key={mod.id}
                className="track-card"
                onClick={() => navigate(`/modulo/${slug}`)}
              >
                <div className="track-card-top">
                  <div className="track-icon" style={{ background: color }}>{icon}</div>
                  <div className="track-card-info">
                    <h3>{mod.titulo}</h3>
                    <p>{mod.descricao || 'Módulo de aprendizado'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {mod.obrigatorio && (
                    <span className="track-badge badge-required">Obrigatório</span>
                  )}
                  <span className="track-badge badge-new">{aulasCount} aulas</span>
                </div>
                <div className="track-prog-bar">
                  <div className="track-prog-fill" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="track-meta">
                  <span>{pct}% concluído</span>
                  <span className="track-badge badge-new">Iniciar</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
