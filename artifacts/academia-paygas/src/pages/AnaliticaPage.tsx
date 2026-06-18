export function AnaliticaPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Analytics</div>
      </div>

      <div className="cards-grid">
        {[
          { icon: '👁️', val: '12.400', label: 'Visualizações/mês', trend: '↑ +18%', color: '#E6EEF9' },
          { icon: '⏱️', val: '42 min', label: 'Tempo Médio/sessão', trend: '↑ +5 min', color: '#FEF3C7' },
          { icon: '🔁', val: '68%', label: 'Taxa de Retorno', trend: '↑ +3%', color: '#DCFCE7' },
          { icon: '📱', val: '54%', label: 'Acesso Mobile', trend: '→ estável', color: '#FEF0E6' },
        ].map((c, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon" style={{ background: c.color }}>{c.icon}</div>
            <div className="stat-card-val">{c.val}</div>
            <div className="stat-card-label">{c.label}</div>
            <div className="stat-card-trend trend-up">{c.trend}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div>
          <div className="section-title">Módulos Mais Acessados</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Módulo</th>
                  <th>Acessos</th>
                  <th>Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { mod: 'Excelência no Atendimento', access: 1840, conv: '88%' },
                  { mod: 'Sistema de Cashback PayGas', access: 1620, conv: '75%' },
                  { mod: 'Operação do Terminal', access: 1380, conv: '91%' },
                  { mod: 'Gestão e KPIs do Posto', access: 980, conv: '68%' },
                  { mod: 'Integração via API', access: 720, conv: '82%' },
                ].map((m, i) => (
                  <tr key={i}>
                    <td><b>{m.mod}</b></td>
                    <td>{m.access.toLocaleString('pt-BR')}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-mini">
                          <div className="progress-mini-fill" style={{ width: m.conv }}></div>
                        </div>
                        {m.conv}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="section-title">Personas Mais Ativas</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Usuários</th>
                  <th>XP Médio</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { persona: 'Atendente', users: '1.840', xp: '1.820' },
                  { persona: 'Gestor', users: '980', xp: '3.950' },
                  { persona: 'Parceiro', users: '640', xp: '1.640' },
                  { persona: 'Líder Comunitário', users: '420', xp: '2.840' },
                  { persona: 'Integrador ERP', users: '280', xp: '4.920' },
                  { persona: 'Admin PayGas', users: '120', xp: '7.800' },
                ].map((p, i) => (
                  <tr key={i}>
                    <td>{p.persona}</td>
                    <td><b>{p.users}</b></td>
                    <td><b style={{ color: 'var(--pg-orange)' }}>{p.xp}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
