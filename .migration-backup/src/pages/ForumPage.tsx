import { useState } from 'react'

const FORUM_DATA = [
  {
    autor: 'Carlos Mendes', av: 'CM', col: '#D97706', role: 'Gestor · RJ', tempo: 'Há 2 horas',
    tag: 'Case de Sucesso', tc: 'badge-done',
    titulo: 'Minha equipe zerou a trilha de atendimento em 1 semana!',
    preview: 'Organizamos os turnos para que cada atendente fizesse 2 aulas por dia. O NPS subiu 12 pontos no mês.',
    likes: 34, rep: 18,
  },
  {
    autor: 'Fernanda Lima', av: 'FL', col: '#7C3AED', role: 'Parceira · MG', tempo: 'Há 5 horas',
    tag: 'Dúvida', tc: 'badge-required',
    titulo: 'Como configurar o cashback automático para novos clientes?',
    preview: 'Estou com dificuldade no passo 3 da trilha do terminal. Quando o cliente não tem CPF cadastrado, o sistema rejeita.',
    likes: 12, rep: 24,
  },
  {
    autor: 'João Santos', av: 'JS', col: '#0891B2', role: 'Líder · BA', tempo: 'Há 1 dia',
    tag: 'Dica', tc: 'badge-progress',
    titulo: 'Dica: use o WhatsApp para engajar a comunidade no cashback',
    preview: 'Criei um grupo e mando um print toda semana com o cashback acumulado. A adesão saltou de 30% para 78%!',
    likes: 67, rep: 31,
  },
  {
    autor: 'Mariana Tech', av: 'MT', col: '#1F2937', role: 'Integradora · PR', tempo: 'Há 2 dias',
    tag: 'Técnico', tc: 'badge-new',
    titulo: 'Documentei os 15 erros mais comuns da API v2',
    preview: 'Depois de 3 semanas integrando com o ERP, documentei os erros e as soluções. Espero ajudar outros integradores.',
    likes: 89, rep: 42,
  },
  {
    autor: 'Ana Paula Costa', av: 'AC', col: '#16A34A', role: 'Atendente · SP', tempo: 'Há 3 dias',
    tag: 'Case de Sucesso', tc: 'badge-done',
    titulo: 'Primeiro certificado! Trilha de Excelência no Atendimento concluída',
    preview: 'Levei 4 dias para concluir. O módulo de resolução de conflitos mudou minha forma de lidar com clientes difíceis.',
    likes: 45, rep: 16,
  },
]

export function ForumPage() {
  const [selectedPost, setSelectedPost] = useState<number | null>(null)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fórum da Comunidade</div>
          <div className="page-subtitle">Conecte-se com profissionais PayGas de todo o Brasil</div>
        </div>
        <button className="btn-primary">+ Nova Publicação</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {['Todos', 'Dúvidas', 'Dicas', 'Cases de Sucesso', 'Técnico'].map((f, i) => (
          <button key={i} className={`track-badge ${i === 0 ? 'badge-progress' : 'badge-new'}`} style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>
            {f}
          </button>
        ))}
      </div>

      {FORUM_DATA.map((p, i) => (
        <div key={i} className="forum-post" onClick={() => setSelectedPost(i)}>
          <div className="forum-author">
            <div className="forum-avatar" style={{ background: p.col }}>{p.av}</div>
            <div className="forum-meta">
              <b>{p.autor}</b>
              <span>{p.role} · {p.tempo}</span>
            </div>
            <span className={`track-badge ${p.tc}`} style={{ marginLeft: 'auto' }}>{p.tag}</span>
          </div>
          <div className="forum-title">{p.titulo}</div>
          <div className="forum-preview">{p.preview}</div>
          <div className="forum-footer">
            <span>❤️ {p.likes} curtidas</span>
            <span>💬 {p.rep} respostas</span>
            <span>🔖 Salvar</span>
            <span style={{ marginLeft: 'auto', color: 'var(--pg-orange)', fontWeight: 600 }}>Ler mais →</span>
          </div>
        </div>
      ))}

      {selectedPost !== null && (
        <div id="modal-overlay" className="open" onClick={() => setSelectedPost(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Post do Fórum</h3>
              <button className="modal-close" onClick={() => setSelectedPost(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: FORUM_DATA[selectedPost].col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>
                  {FORUM_DATA[selectedPost].av}
                </div>
                <div>
                  <b>{FORUM_DATA[selectedPost].autor}</b>
                  <br />
                  <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{FORUM_DATA[selectedPost].role} · {FORUM_DATA[selectedPost].tempo}</span>
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '12px' }}>
                {FORUM_DATA[selectedPost].titulo}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: '16px' }}>
                {FORUM_DATA[selectedPost].preview}
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '8px' }}>Adicionar resposta</div>
                <textarea className="form-input" rows={3} placeholder="Compartilhe sua experiência..."></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedPost(null)}>Fechar</button>
              <button className="btn-primary" onClick={() => setSelectedPost(null)}>Responder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
