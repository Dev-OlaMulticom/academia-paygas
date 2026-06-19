import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function ConquistasPage() {
  const [achievements, setAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAchievements()
      .then(setAchievements)
      .catch(() => setAchievements([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Conquistas ⭐</div>
            <div className="page-subtitle">Carregando...</div>
          </div>
        </div>
      </div>
    )
  }

  if (achievements.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Conquistas ⭐</div>
            <div className="page-subtitle">Desbloqueie troféus completando módulos e desafios</div>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <p>Nenhuma conquista disponível ainda.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Conquistas ⭐</div>
          <div className="page-subtitle">Desbloqueie troféus completando módulos e desafios</div>
        </div>
      </div>
      <div className="trophy-grid">
        {achievements.map((t) => (
          <div
            key={t.id}
            className={`trophy-card ${t.earned ? 'earned' : 'locked'}`}
          >
            <div className="trophy-icon">{t.icone}</div>
            <div className="trophy-name">{t.titulo}</div>
            <div className="trophy-desc">{t.descricao}</div>
            {t.earned && (
              <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--pg-green)', fontWeight: 700 }}>
                ✓ Conquistado
              </div>
            )}
            {!t.earned && t.progresso > 0 && (
              <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--gray-400)' }}>
                {t.progresso}% concluído
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
