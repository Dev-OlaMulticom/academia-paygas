import type { User } from '../hooks/useAuth'

interface RelatoriosPageProps {
  user: User
}

export function RelatoriosPage({ user }: RelatoriosPageProps) {
  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'

  const activityLogs = [
    { usuario: 'Ana Paula Costa', acao: 'Concluiu aula: Fundamentos do Atendimento', detalhes: 'Módulo: Excelência no Atendimento', data: 'Hoje, 14:32' },
    { usuario: 'João Silva', acao: 'Iniciou trilha', detalhes: 'Sistema de Cashback PayGas', data: 'Hoje, 11:15' },
    { usuario: 'Carlos Mendes', acao: 'Criou novo usuário', detalhes: 'Atendente: Maria Santos', data: 'Ontem, 16:45' },
    { usuario: 'Ana Paula Costa', acao: 'Completou quiz', detalhes: 'Nota: 9/10 - Resolução de Conflitos', data: 'Ontem, 10:20' },
    { usuario: 'João Silva', acao: 'Acessou plataforma', detalhes: 'Último acesso', data: 'Ontem, 09:00' },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Relatórios</div>
      </div>
      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#DCFCE7' }}>📊</div>
          <div className="stat-card-val">76%</div>
          <div className="stat-card-label">Taxa de Conclusão</div>
          <div className="stat-card-trend trend-up">↑ +8% vs mês anterior</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF3C7' }}>⭐</div>
          <div className="stat-card-val">8.4</div>
          <div className="stat-card-label">Nota Média nos Quizzes</div>
          <div className="stat-card-trend trend-up">↑ +0.3 pontos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#E6EEF9' }}>👥</div>
          <div className="stat-card-val">8</div>
          <div className="stat-card-label">Usuários Ativos</div>
          <div className="stat-card-trend trend-up">↑ +2 novos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF0E6' }}>⚡</div>
          <div className="stat-card-val">24.700</div>
          <div className="stat-card-label">XP Total da Equipe</div>
          <div className="stat-card-trend trend-up">↑ +1.200 esta semana</div>
        </div>
      </div>
      {(isAdmin || isGestor) && (
        <>
          <div className="section-title">Log de Atividades</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Detalhes</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log, i) => (
                  <tr key={i}>
                    <td><b>{log.usuario}</b></td>
                    <td>{log.acao}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{log.detalhes}</td>
                    <td style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{log.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="section-title">Desempenho por Módulo</div>
      <div className="table-wrap" style={{ marginBottom: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>Módulo</th>
              <th>Concluídos</th>
              <th>Em Andamento</th>
              <th>Taxa Conclusão</th>
              <th>Nota Média</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><b>Excelência no Atendimento</b></td><td>6</td><td>2</td><td><div className="progress-cell"><div className="progress-mini"><div className="progress-mini-fill" style={{ width: '75%' }}></div></div>75%</div></td><td><b>8.8</b></td></tr>
            <tr><td><b>Sistema de Cashback PayGas</b></td><td>5</td><td>3</td><td><div className="progress-cell"><div className="progress-mini"><div className="progress-mini-fill" style={{ width: '62%' }}></div></div>62%</div></td><td><b>8.2</b></td></tr>
            <tr><td><b>Gestão e KPIs do Posto</b></td><td>4</td><td>3</td><td><div className="progress-cell"><div className="progress-mini"><div className="progress-mini-fill" style={{ width: '57%' }}></div></div>57%</div></td><td><b>7.9</b></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
