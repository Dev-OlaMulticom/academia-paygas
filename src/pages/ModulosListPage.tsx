import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAbility } from "../hooks/useAbility";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { pluralize } from "../lib/utils";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "");
}

const MODULO_ICONS = ["📚", "💰", "📊", "📱", "🏪", "⛪", "💻", "📣", "🔒", "🚀", "💼", "⚡"];
const MODULO_COLORS = [
	"#FEF3C7",
	"#DCFCE7",
	"#E6EEF9",
	"#F3E8FF",
	"#FCE7F3",
	"#CFFAFE",
	"#F1F5F9",
	"#FEF0E6",
	"#F0FDF4",
	"#EDE9FE",
	"#FEF9C3",
	"#E0F2FE",
];

export function ModulosListPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { isAtendente } = useAbility();
	const [modulos, setModulos] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [progressMap, setProgressMap] = useState<Record<string, number>>({});
	const [certMap, setCertMap] = useState<Record<string, boolean>>({});

	const semGestor = isAtendente && !user?.gestorId;

	const loadModulos = async () => {
		try {
			const mods = await api.getCmsModulos();
			setModulos(mods);

			const progresso = await api.getProgresso().catch(() => []);
			const certs = await api.getCertificates().catch(() => []);

			const pMap: Record<string, number> = {};
			const cMap: Record<string, boolean> = {};
			for (const p of progresso) {
				const modId = p.moduloId;
				if (!pMap[modId]) pMap[modId] = 0;
				if (p.concluido) pMap[modId]++;
			}
			for (const c of certs) {
				cMap[c.moduloId] = true;
			}
			setProgressMap(pMap);
			setCertMap(cMap);
		} catch {
			setModulos([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadModulos();
	}, []);

	if (loading) {
		return (
			<div>
				<div className="page-header">
					<div className="page-title">Carregando cursos...</div>
				</div>
			</div>
		);
	}

	if (semGestor) {
		return (
			<div>
				<div className="page-header">
					<div>
						<div className="page-title">Cursos</div>
					</div>
				</div>
				<div className="empty-state">
					<div className="empty-icon">🔒</div>
					<p className="modlist-empty-msg">Acesso restrito</p>
					<p className="modlist-empty-desc">
						Você precisa ser associado a um Gestor de Posto para acessar os cursos. Aguarde a aprovação do seu gestor ou
						entre em contato com o administrador.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="page-header">
				<div>
					<div className="page-title">Trilhas de Aprendizado</div>
					<div className="page-subtitle">{modulos.length} curso(s) disponível(is)</div>
				</div>
			</div>

			{modulos.length === 0 ? (
				<div className="empty-state">
					<div className="empty-icon">📚</div>
					<p>Nenhum curso disponível no momento.</p>
				</div>
			) : (
				<div className="track-grid">
					{modulos.map((mod, i) => {
						const icon = MODULO_ICONS[i % MODULO_ICONS.length];
						const color = MODULO_COLORS[i % MODULO_COLORS.length];
						const aulasCount = mod._count?.aulas || 0;
						const slug = slugify(mod.titulo || mod.title || "");
						const completedAulas = progressMap[mod.id] || 0;
						const pct = aulasCount > 0 ? Math.round((completedAulas / aulasCount) * 100) : 0;
						const hasCert = !!certMap[mod.id];

						return (
							<div key={mod.id} className="track-card" onClick={() => navigate(`/modulo/${slug}`)}>
								<div className="track-card-top">
									<div className="track-icon" style={{ background: color }}>
										{icon}
									</div>
									<div className="track-card-info">
										<h3>{mod.titulo}</h3>
										<p>{mod.descricao || "Curso de aprendizado"}</p>
									</div>
								</div>
								<div className="modlist-badges">
									{mod.obrigatorio && <span className="track-badge badge-required">Obrigatório</span>}
									{mod.autoCertificado && (
										<span className="track-badge badge-new modlist-cert-badge">Cert. Automático</span>
									)}
									{hasCert && <span className="track-badge badge-new modlist-cert-badge">✓ Certificado</span>}
									<span className="track-badge badge-new">
										{aulasCount} {pluralize(aulasCount, "aula")}
									</span>
								</div>
								<div className="track-prog-bar">
									<div className="track-prog-fill" style={{ width: `${pct}%` }}></div>
								</div>
								<div className="track-meta">
									<span>{pct}% concluído</span>
									<span className="track-badge badge-new">{pct === 100 ? "Concluído" : "Iniciar"}</span>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
