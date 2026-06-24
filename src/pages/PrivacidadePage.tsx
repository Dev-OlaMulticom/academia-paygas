export function PrivacidadePage() {
  return (
    <div style={{ height: '100vh', background: 'var(--gray-50)', overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '32px', boxShadow: 'var(--shadow)' }}>
          <div style={{ marginBottom: '8px' }}>
            <div className="page-title" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>Política de Privacidade</div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--gray-100)' }}>
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </div>

          <h2 style={sectionTitle}>1. Introdução</h2>
          <p style={bodyText}>
            A Academia PayGas ("Plataforma") respeita a privacidade de seus usuários. Esta Política de Privacidade
            descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais em conformidade com a
            Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>

          <h2 style={sectionTitle}>2. Dados Coletados</h2>
          <p style={{ ...bodyText, marginBottom: '8px' }}>Coletamos os seguintes dados pessoais:</p>
          <ul style={listStyle}>
            <li><b>Identificação:</b> nome, e-mail corporativo, cargo/função (role)</li>
            <li><b>Acesso:</b> credenciais de login (senha armazenada com criptografia bcrypt)</li>
            <li><b>Perfil:</b> avatar, estado/região, vinculação com gestor/equipe</li>
            <li><b>Atividade:</b> progresso em cursos, respostas de quizzes, certificados, logins, logs de auditoria</li>
            <li><b>Gamificação:</b> pontos (XP), nível, conquistas, transações de pontuação</li>
          </ul>

          <h2 style={sectionTitle}>3. Finalidade do Tratamento</h2>
          <p style={{ ...bodyText, marginBottom: '8px' }}>Seus dados são utilizados para:</p>
          <ul style={listStyle}>
            <li>Autenticação e controle de acesso à Plataforma</li>
            <li>Gestão de equipes (gestores e atendentes vinculados)</li>
            <li>Acompanhamento de progresso de capacitação e emissão de certificados</li>
            <li>Gamificação e ranking de desempenho</li>
            <li>Auditoria e segurança (registros de atividade)</li>
            <li>Geração de relatórios gerenciais e analíticos</li>
            <li>Notificações sobre o curso, certificados e comunicações internas</li>
          </ul>

          <h2 style={sectionTitle}>4. Base Legal</h2>
          <p style={bodyText}>
            O tratamento de dados pessoais é fundamentado no legítimo interesse da PayGas para gestão de capacitação
            de funcionários, cumprimento de obrigações regulatórias e auditoria interna, conforme art. 7º, IX da LGPD.
          </p>

          <h2 style={sectionTitle}>5. Compartilhamento de Dados</h2>
          <p style={bodyText}>Seus dados não são compartilhados com terceiros, exceto:</p>
          <ul style={listStyle}>
            <li>Quando exigido por autoridade competente ou ordem judicial</li>
            <li>Com provedores de infraestrutura (hospedagem, banco de dados) sob contratos de confidencialidade</li>
          </ul>
          <p style={bodyText}>
            Gestores visualizam apenas dados dos atendentes de sua própria equipe. Atendentes não têm acesso a dados
            de outros usuários, exceto nome e pontuação em rankings públicos.
          </p>

          <h2 style={sectionTitle}>6. Segurança</h2>
          <p style={{ ...bodyText, marginBottom: '8px' }}>Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
          <ul style={listStyle}>
            <li>Senhas armazenadas com hash bcrypt (não reversível)</li>
            <li>Comunicação protegida com HTTPS/TLS</li>
            <li>Controle de acesso baseado em roles (ADMIN, GESTOR, ATENDENTE)</li>
            <li>Rate limiting para proteção contra ataques de força bruta</li>
            <li>Headers de segurança (Helmet) e CORS restrito</li>
            <li>Logs de auditoria para todas as ações sensíveis</li>
          </ul>

          <h2 style={sectionTitle}>7. Retenção de Dados</h2>
          <p style={bodyText}>
            Seus dados são mantidos durante o período de vínculo com a PayGas. Após o desligamento,
            os dados de atividade e auditoria podem ser mantidos pelo prazo legal aplicável. Registros de progresso
            e certificados podem ser arquivados para fins de compliance.
          </p>

          <h2 style={sectionTitle}>8. Seus Direitos (LGPD)</h2>
          <p style={{ ...bodyText, marginBottom: '8px' }}>Como titular dos dados, você tem direito a:</p>
          <ul style={listStyle}>
            <li>Confirmar a existência de tratamento de seus dados</li>
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
            <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários</li>
            <li>Solicitar portabilidade dos dados a outro fornecedor</li>
            <li>Revogar consentimento (quando aplicável)</li>
          </ul>

          <h2 style={sectionTitle}>9. Cookies e Armazenamento Local</h2>
          <p style={bodyText}>
            A Plataforma utiliza armazenamento local (localStorage) para manter sua sessão ativa.
            Nenhum dado pessoal sensível é armazenado em cookies de terceiros.
          </p>

          <h2 style={sectionTitle}>10. Alterações desta Política</h2>
          <p style={bodyText}>
            Esta Política pode ser atualizada periodicamente. Alterações significativas serão comunicadas aos usuários.
            Recomendamos a consulta regular deste documento.
          </p>

          <h2 style={sectionTitle}>11. Contato</h2>
          <p style={bodyText}>
            Para exercer seus direitos ou tirar dúvidas sobre esta Política, entre em contato com a administração
            da Plataforma através do e-mail corporativo da PayGas.
          </p>
        </div>
      </div>
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: 'var(--gray-900)',
  marginBottom: '10px',
  marginTop: '24px',
}

const bodyText: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--gray-700)',
  lineHeight: 1.7,
  marginBottom: '16px',
}

const listStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--gray-700)',
  lineHeight: 1.7,
  marginBottom: '16px',
  paddingLeft: '24px',
}
