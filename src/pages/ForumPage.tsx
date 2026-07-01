import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function ForumPage() {
	const [posts, setPosts] = useState<any[]>([]);
	const [selectedPost, setSelectedPost] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api
			.getForumPosts()
			.then(setPosts)
			.catch(() => setPosts([]))
			.finally(() => setLoading(false));
	}, []);

	const handleLike = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			const updated = await api.likeForumPost(id);
			setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
		} catch {
			/* */
		}
	};

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
		);
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
		);
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

			<div className="forum-filters">
				{["Todos", "Dúvidas", "Dicas", "Cases de Sucesso", "Técnico"].map((f, i) => (
					<button key={i} className={`track-badge ${i === 0 ? "badge-progress" : "badge-new"} forum-filter-btn`}>
						{f}
					</button>
				))}
			</div>

			{posts.map((p) => (
				<div key={p.id} className="forum-post" onClick={() => setSelectedPost(posts.indexOf(p))}>
					<div className="forum-author">
						<div className="forum-avatar forum-avatar-orange">{p.autor?.nome?.charAt(0) || "?"}</div>
						<div className="forum-meta">
							<b>{p.autor?.nome || "Anônimo"}</b>
							<span>
								{p.autor?.role || ""} · {new Date(p.createdAt).toLocaleDateString("pt-BR")}
							</span>
						</div>
					</div>
					<div className="forum-title">{p.titulo}</div>
					<div className="forum-preview">{p.conteudo}</div>
					<div className="forum-footer">
						<span onClick={(e) => handleLike(p.id, e)}>❤️ {p.likes} curtidas</span>
						<span>💬 {p.replies} respostas</span>
						<span className="forum-ler-mais">Ler mais →</span>
					</div>
				</div>
			))}

			{selectedPost !== null && posts[selectedPost] && (
				<div id="modal-overlay" className="open" onClick={() => setSelectedPost(null)}>
					<div className="modal-box" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Post do Fórum</h3>
							<button className="modal-close" onClick={() => setSelectedPost(null)}>
								✕
							</button>
						</div>
						<div className="modal-body">
							<div className="forum-modal-author">
								<div className="forum-modal-avatar">{posts[selectedPost].autor?.nome?.charAt(0) || "?"}</div>
								<div>
									<b>{posts[selectedPost].autor?.nome || "Anônimo"}</b>
									<br />
									<span className="forum-modal-date">
										{posts[selectedPost].autor?.role || ""} ·{" "}
										{new Date(posts[selectedPost].createdAt).toLocaleDateString("pt-BR")}
									</span>
								</div>
							</div>
							<div className="forum-modal-title">{posts[selectedPost].titulo}</div>
							<div className="forum-modal-body">{posts[selectedPost].conteudo}</div>
							<div className="forum-reply-box">
								<div className="forum-reply-label">Adicionar resposta</div>
								<textarea className="form-input" rows={3} placeholder="Compartilhe sua experiência..."></textarea>
							</div>
						</div>
						<div className="modal-footer">
							<button className="btn-secondary" onClick={() => setSelectedPost(null)}>
								Fechar
							</button>
							<button className="btn-primary" onClick={() => setSelectedPost(null)}>
								Responder
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
