import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const BAR_COLORS = ['#16A34A', '#F47C20', '#D97706', '#0A2E6E', '#7C3AED']

export function NacionalPage() {
  const [regions, setRegions] = useState<any[]>([])
  const [municipios, setMunicipios] = useState<any[]>([])
  const [overview, setOverview] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getAnalyticsRegions(),
      api.getAnalyticsMunicipios(),
      api.getAnalyticsOverview(),
      api.getAnalyticsModules(),
    ])
      .then(([r, m, o, mod]) => { setRegions(r); setMunicipios(m); setOverview(o); setModules(mod) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">🌐 Painel Nacional</div>
            <div className="page-subtitle">Carregando...</div>
          </div>
        </div>
      </div>
    )
  }

  const totalUsers = regions.reduce((a, r) => a + r.users, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🌐 Painel Nacional</div>
          <div className="page-subtitle">Visão consolidada do Brasil — atualizado agora</div>
        </div>
      </div>

      <div className="cards-grid nat-grid">
        {[
          { icon: '👥', val: totalUsers.toLocaleString('pt-BR'), label: 'Usuários Ativos', color: '#FEF3C7', trend: `↑ +${overview?.usersThisMonth || 0} este mês` },
          { icon: '🏆', val: overview?.totalCertificates?.toLocaleString('pt-BR') || '0', label: 'Certificados Emitidos', color: '#DCFCE7', trend: `↑ +${overview?.progressThisMonth || 0} ações` },
          { icon: '📚', val: `${overview?.completionRate || 0}%`, label: 'Taxa de Conclusão', color: '#E6EEF9', trend: '↑ taxa geral' },
          { icon: '⭐', val: overview ? `${Math.min(5, 3 + (overview.completionRate || 0) / 30).toFixed(1)}` : '—', label: 'NPS Médio Brasil', color: '#FEF0E6', trend: '↑ baseado em conclusão' },
        ].map((c, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon" style={{ background: c.color }}>{c.icon}</div>
            <div className="stat-card-val">{c.val}</div>
            <div className="stat-card-label">{c.label}</div>
            <div className="stat-card-trend trend-up">{c.trend}</div>
          </div>
        ))}
      </div>

      <div className="nat-two-col">
        <div className="nat-section">
          <div className="section-title nat-section-title">Distribuição Regional</div>
          {regions.map((r, i) => (
            <div key={i} className="nat-region-row">
              <div className="nat-region-header">
                <span>{r.icon} <b>{r.name}</b></span>
                <span className="nat-region-stats">{r.users.toLocaleString('pt-BR')} · <b className="nat-region-growth">{r.growth}</b></span>
              </div>
              <div className="nat-bar">
                <div className="nat-bar-fill" style={{ width: `${r.pct}%`, background: BAR_COLORS[i] }}>{r.pct}%</div>
              </div>
            </div>
          ))}
        </div>

        <div className="nat-section">
          <div className="section-title nat-section-title">Módulos Mais Populares</div>
          {modules.length === 0 ? (
            <p className="nat-empty">Nenhum módulo disponível</p>
          ) : modules.slice(0, 5).map((m, i) => (
            <div key={i} className="nat-region-row">
              <div className="nat-region-header">
                <span>{m.titulo}</span>
                <span className="nat-region-stats">{m.conclusao}%</span>
              </div>
              <div className="nat-bar">
                <div className="nat-bar-fill" style={{ width: `${m.conclusao}%`, background: 'var(--pg-blue)' }}>{m.conclusao}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="nat-section">
        <div className="section-title nat-section-title">Top Municípios</div>
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
              {municipios.length === 0 ? (
                <tr><td colSpan={4} className="nat-municipio-empty">Nenhum dado disponível</td></tr>
              ) : municipios.map((m, i) => (
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