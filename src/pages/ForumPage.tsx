import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function ForumPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [selectedPost, setSelectedPost] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getForumPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await api.likeForumPost(id)
      setPosts(prev => prev.map(p => p.id === id ? updated : p))
    } catch { /* */ }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Fórum da Comunidade</div>
            <div className="page-subtitle">Carregando...</div>
          </div>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Fórum da Comunidade</div>
            <div className="page-subtitle">Conecte-se com profissionais PayGas de todo o Brasil</div>
          </div>
          <button className="btn-primary">+ Nova Publicação</button>
        </div>
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>Nenhum post ainda. Seja o primeiro a publicar!</p>
        </div>
      </div>
    )
  }

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

      {posts.map((p) => (
        <div key={p.id} className="forum-post" onClick={() => setSelectedPost(posts.indexOf(p))}>
          <div className="forum-author">
            <div className="forum-avatar" style={{ background: 'var(--pg-orange)' }}>{p.autor?.nome?.charAt(0) || '?'}</div>
            <div className="forum-meta">
              <b>{p.autor?.nome || 'Anônimo'}</b>
              <span>{p.autor?.role || ''} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <div className="forum-title">{p.titulo}</div>
          <div className="forum-preview">{p.conteudo}</div>
          <div className="forum-footer">
            <span onClick={(e) => handleLike(p.id, e)}>❤️ {p.likes} curtidas</span>
            <span>💬 {p.replies} respostas</span>
            <span style={{ marginLeft: 'auto', color: 'var(--pg-orange)', fontWeight: 600 }}>Ler mais →</span>
          </div>
        </div>
      ))}

      {selectedPost !== null && posts[selectedPost] && (
        <div id="modal-overlay" className="open" onClick={() => setSelectedPost(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Post do Fórum</h3>
              <button className="modal-close" onClick={() => setSelectedPost(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--pg-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>
                  {posts[selectedPost].autor?.nome?.charAt(0) || '?'}
                </div>
                <div>
                  <b>{posts[selectedPost].autor?.nome || 'Anônimo'}</b>
                  <br />
                  <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{posts[selectedPost].autor?.role || ''} · {new Date(posts[selectedPost].createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '12px' }}>
                {posts[selectedPost].titulo}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: '16px' }}>
                {posts[selectedPost].conteudo}
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
