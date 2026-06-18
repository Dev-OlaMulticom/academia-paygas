const TROPHIES = [
  { name: 'Primeira Aula', desc: 'Complete sua 1ª aula', icon: '📖', earned: true },
  { name: 'Maratonista', desc: '5 aulas em um dia', icon: '🏃', earned: true },
  { name: 'Certifier', desc: 'Obtenha 1 certificado', icon: '🏆', earned: true },
  { name: 'Trilheiro', desc: 'Conclua 3 módulos', icon: '🗺️', earned: false },
  { name: 'Expert', desc: 'Nota 10 em 3 quizzes', icon: '🎯', earned: false },
  { name: 'Ranker', desc: 'Top 10 nacional', icon: '🥇', earned: false },
  { name: 'Embaixador', desc: 'Convide 5 colegas', icon: '🤝', earned: false },
  { name: 'Mestre', desc: 'Conclua todos os módulos', icon: '👑', earned: false },
]

export function ConquistasPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Conquistas ⭐</div>
          <div className="page-subtitle">Desbloqueie troféus completando módulos e desafios</div>
        </div>
      </div>
      <div className="trophy-grid">
        {TROPHIES.map((t, i) => (
          <div
            key={i}
            className={`trophy-card ${t.earned ? 'earned' : 'locked'}`}
          >
            <div className="trophy-icon">{t.icon}</div>
            <div className="trophy-name">{t.name}</div>
            <div className="trophy-desc">{t.desc}</div>
            {t.earned && (
              <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--pg-green)', fontWeight: 700 }}>
                ✓ Conquistado
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
