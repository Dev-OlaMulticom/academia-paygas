const REGIONS = [
  { name: 'Norte', icon: '🌿', users: 1420, pct: 68, growth: '+12%' },
  { name: 'Nordeste', icon: '☀️', users: 3840, pct: 82, growth: '+18%' },
  { name: 'Centro-Oeste', icon: '🌾', users: 2100, pct: 75, growth: '+9%' },
  { name: 'Sudeste', icon: '🏙️', users: 4890, pct: 91, growth: '+22%' },
  { name: 'Sul', icon: '⛵', users: 2150, pct: 88, growth: '+15%' },
]

const MUNICIPIOS = [
  { cidade: 'São Paulo, SP', postos: 142, usuarios: 1820, pos: '🏆' },
  { cidade: 'Rio de Janeiro, RJ', postos: 98, usuarios: 1240, pos: '🥈' },
  { cidade: 'Belo Horizonte, MG', postos: 76, usuarios: 980, pos: '🥉' },
  { cidade: 'Salvador, BA', postos: 64, usuarios: 820, pos: '4º' },
  { cidade: 'Fortaleza, CE', postos: 58, usuarios: 740, pos: '5º' },
  { cidade: 'Curitiba, PR', postos: 54, usuarios: 690, pos: '6º' },
]

const BAR_COLORS = ['#16A34A', '#F47C20', '#D97706', '#0A2E6E', '#7C3AED']

export function MapaPage() {
  const total = REGIONS.reduce((a, r) => a + r.users, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Mapa Nacional PayGas</div>
          <div className="page-subtitle">Distribuição de usuários e engajamento por região</div>
        </div>
        <button className="btn-primary">Exportar Relatório</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {REGIONS.map((r, i) => (
          <div key={i} className="region-card">
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>{r.icon}</div>
            <div className="region-count">{r.users.toLocaleString('pt-BR')}</div>
            <div className="region-name">{r.name}</div>
            <div className="region-pct">{Math.round(r.users / total * 100)}% do Brasil · {r.growth}</div>
            <div className="track-prog-bar" style={{ marginTop: '8px' }}>
              <div className="track-prog-fill" style={{ width: `${r.pct}%` }}></div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '4px' }}>{r.pct}% engajamento</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '24px' }}>
        <div className="section-title" style={{ marginBottom: '16px' }}>Engajamento por Região</div>
        {REGIONS.map((r, i) => (
          <div key={i} style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              <span>{r.icon} {r.name}</span>
              <span style={{ color: 'var(--gray-500)' }}>{r.pct}% · {r.users.toLocaleString('pt-BR')} usuários · <span style={{ color: 'var(--pg-green)' }}>{r.growth}</span></span>
            </div>
            <div className="nat-bar">
              <div className="nat-bar-fill" style={{ width: `${r.pct}%`, background: BAR_COLORS[i] }}>{r.pct}%</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px' }}>
        <div className="section-title" style={{ marginBottom: '16px' }}>Top Municípios</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Município</th>
                <th>Postos</th>
                <th>Usuários</th>
                <th>Engajamento</th>
              </tr>
            </thead>
            <tbody>
              {MUNICIPIOS.map((m, i) => {
                const pct = Math.round(m.usuarios / 18)
                return (
                  <tr key={i}>
                    <td><b>{m.pos}</b></td>
                    <td><b>{m.cidade}</b></td>
                    <td>{m.postos}</td>
                    <td>{m.usuarios.toLocaleString('pt-BR')}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-mini">
                          <div className="progress-mini-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
