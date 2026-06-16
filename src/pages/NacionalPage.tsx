const REGIONS = [
  { name: 'Norte', icon: '🌿', users: 1420, pct: 68, growth: '+12%' },
  { name: 'Nordeste', icon: '☀️', users: 3840, pct: 82, growth: '+18%' },
  { name: 'Centro-Oeste', icon: '🌾', users: 2100, pct: 75, growth: '+9%' },
  { name: 'Sudeste', icon: '🏙️', users: 4890, pct: 91, growth: '+22%' },
  { name: 'Sul', icon: '⛵', users: 2150, pct: 88, growth: '+15%' },
]

const ESTADOS = [
  { estado: 'São Paulo', uf: 'SP', users: 1840, certs: 520, eng: '92%' },
  { estado: 'Rio de Janeiro', uf: 'RJ', users: 890, certs: 210, eng: '88%' },
  { estado: 'Minas Gerais', uf: 'MG', users: 640, certs: 180, eng: '85%' },
  { estado: 'Paraná', uf: 'PR', users: 380, certs: 95, eng: '82%' },
  { estado: 'Rio Grande do Sul', uf: 'RS', users: 210, certs: 65, eng: '78%' },
  { estado: 'Goiás', uf: 'GO', users: 190, certs: 55, eng: '75%' },
  { estado: 'Bahia', uf: 'BA', users: 310, certs: 88, eng: '80%' },
  { estado: 'Ceará', uf: 'CE', users: 180, certs: 42, eng: '74%' },
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

export function NacionalPage() {
  const totalUsers = REGIONS.reduce((a, r) => a + r.users, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🌐 Painel Nacional</div>
          <div className="page-subtitle">Visão consolidada do Brasil — atualizado agora</div>
        </div>
        <button className="btn-primary">Exportar PDF</button>
      </div>

      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {[
          { icon: '👥', val: totalUsers.toLocaleString('pt-BR'), label: 'Usuários Ativos', color: '#FEF3C7', trend: '↑ +22% este mês' },
          { icon: '🏆', val: '8.240', label: 'Certificados Emitidos', color: '#DCFCE7', trend: '↑ +340 esta semana' },
          { icon: '📚', val: '84%', label: 'Taxa de Conclusão', color: '#E6EEF9', trend: '↑ +6pp' },
          { icon: '⭐', val: '4,8', label: 'NPS Médio Brasil', color: '#FEF0E6', trend: '↑ +0,3' },
        ].map((c, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon" style={{ background: c.color }}>{c.icon}</div>
            <div className="stat-card-val">{c.val}</div>
            <div className="stat-card-label">{c.label}</div>
            <div className="stat-card-trend trend-up">{c.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '20px' }}>
          <div className="section-title" style={{ marginBottom: '14px' }}>Distribuição Regional</div>
          {REGIONS.map((r, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>{r.icon} <b>{r.name}</b></span>
                <span style={{ color: 'var(--gray-500)' }}>{r.users.toLocaleString('pt-BR')} · <b style={{ color: 'var(--pg-green)' }}>{r.growth}</b></span>
              </div>
              <div className="nat-bar">
                <div className="nat-bar-fill" style={{ width: `${r.pct}%`, background: 'var(--pg-orange)' }}>{r.pct}%</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '20px' }}>
          <div className="section-title" style={{ marginBottom: '14px' }}>Módulos Mais Populares</div>
          {['Cashback PayGas', 'Excelência no Atendimento', 'Gestão e KPIs', 'Operação do Terminal', 'LGPD e Segurança'].map((t, i) => {
            const pcts = [94, 88, 76, 71, 68]
            return (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>{t}</span>
                  <span style={{ color: 'var(--gray-500)' }}>{pcts[i]}%</span>
                </div>
                <div className="nat-bar">
                  <div className="nat-bar-fill" style={{ width: `${pcts[i]}%`, background: 'var(--pg-blue)' }}>{pcts[i]}%</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '24px' }}>
        <div className="section-title" style={{ marginBottom: '14px' }}>Top Estados</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Usuários</th>
                <th>Certificados</th>
                <th>Engajamento</th>
              </tr>
            </thead>
            <tbody>
              {ESTADOS.map((e, i) => (
                <tr key={i}>
                  <td><b>{e.estado}</b> <span style={{ color: 'var(--gray-400)', fontSize: '11px' }}>({e.uf})</span></td>
                  <td>{e.users.toLocaleString('pt-BR')}</td>
                  <td>{e.certs}</td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-mini">
                        <div className="progress-mini-fill" style={{ width: e.eng }}></div>
                      </div>
                      <span>{e.eng}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '20px' }}>
        <div className="section-title" style={{ marginBottom: '14px' }}>Top Municípios</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Município</th>
                <th>Postos</th>
                <th>Usuários</th>
              </tr>
            </thead>
            <tbody>
              {MUNICIPIOS.map((m, i) => (
                <tr key={i}>
                  <td><b>{m.pos}</b></td>
                  <td><b>{m.cidade}</b></td>
                  <td>{m.postos}</td>
                  <td>{m.usuarios.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
