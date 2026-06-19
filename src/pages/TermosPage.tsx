export function TermosPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '32px', boxShadow: 'var(--shadow)' }}>
          <div style={{ marginBottom: '8px' }}>
            <div className="page-title" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>Termos de Uso</div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--gray-100)' }}>
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </div>

          <h2 style={sectionTitle}>1. Aceitação dos Termos</h2>
          <p style={bodyText}>
            Ao acessar e utilizar a Academia PayGas ("Plataforma"), você concorda com estes Termos de Uso.
            Se você não concorda com qualquer parte destes termos, não deve utilizar a Plataforma.
          </p>

          <h2 style={sectionTitle}>2. Descrição do Serviço</h2>
          <p style={bodyText}>
            A Academia PayGas é uma plataforma de capacitação corporativa para funcionários de postos de combustível PayGas.
            O serviço inclui acesso a cursos, aulas, lições, quizzes, certificados, gamificação e ferramentas de gestão de equipes.
          </p>

          <h2 style={sectionTitle}>3. Elegibilidade e Conta</h2>
          <p style={bodyText}>
            A Plataforma é destinada exclusivamente a funcionários e colaboradores autorizados pela PayGas.
            Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades
            realizadas com sua conta. O acesso não autorizado resulta em suspensão imediata.
          </p>

          <h2 style={sectionTitle}>4. Uso Aceitável</h2>
          <p style={{ ...bodyText, marginBottom: '8px' }}>Você concorda em não:</p>
          <ul style={listStyle}>
            <li>Compartilhar suas credenciais com terceiros</li>
            <li>Tentar acessar dados de outros usuários sem autorização</li>
            <li>Manipular o sistema de pontuação (XP) ou certificados</li>
            <li>Utilizar a Plataforma para fins não relacionados ao trabalho</li>
            <li>Postar conteúdo ofensivo, discriminatório ou ilegal no fórum</li>
          </ul>

          <h2 style={sectionTitle}>5. Certificados e Conclusão de Cursos</h2>
          <p style={bodyText}>
            Certificados são emitidos mediante conclusão de todos os requisitos do curso, incluindo aprovação nos quizzes
            com nota mínima estabelecida. A validade dos certificados segue a política interna da PayGas.
          </p>

          <h2 style={sectionTitle}>6. Propriedade Intelectual</h2>
          <p style={bodyText}>
            Todo o conteúdo da Plataforma — cursos, vídeos, textos, quizzes, logos e marcas — é propriedade da PayGas
            ou de seus licenciadores. É proibida a reprodução, distribuição ou uso fora da Plataforma sem autorização expressa.
          </p>

          <h2 style={sectionTitle}>7. Monitoramento e Atividade</h2>
          <p style={bodyText}>
            A Plataforma registra atividades dos usuários (logins, progresso, conclusões) para fins de auditoria,
            segurança e melhoria do serviço. Administradores podem acessar estes registros conforme a política interna.
          </p>

          <h2 style={sectionTitle}>8. Limitação de Responsabilidade</h2>
          <p style={bodyText}>
            A PayGas não se responsabiliza por interrupções do serviço, perda de dados em conexões instáveis,
            ou danos indiretos resultantes do uso da Plataforma. O serviço é fornecido "como está" sem garantias implícitas.
          </p>

          <h2 style={sectionTitle}>9. Modificações</h2>
          <p style={bodyText}>
            A PayGas pode modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas
            aos usuários. O uso continuado após a notificação constitui aceitação dos termos revisados.
          </p>

          <h2 style={sectionTitle}>10. Contato</h2>
          <p style={bodyText}>
            Dúvidas sobre estes Termos podem ser direcionadas à administração da Plataforma.
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
