import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { ROLE_LABELS } from "../data/constants";
import { api } from "../lib/api";

const EMOJI_OPTIONS = [
	"📚",
	"🎓",
	"💪",
	"⭐",
	"🏆",
	"🎯",
	"🔥",
	"✅",
	"📖",
	"💡",
	"🚀",
	"🤝",
	"🛡️",
	"⛽",
	"🧑‍💼",
	"🔧",
	"📋",
	"🔑",
	"🏆",
	"🌟",
];

interface CriarModuloPageProps {
	user: any;
}

export function CriarModuloPage(_props: CriarModuloPageProps) {
	const navigate = useNavigate();
	const { toast } = useToast();
	const [modulo, setModulo] = useState({
		titulo: "",
		descricao: "",
		icone: "📚",
		obrigatorio: false,
		autoCertificado: false,
		rolesPermitidos: null as string[] | null,
	});
	const [loading, setLoading] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!modulo.titulo) {
			toast("Título é obrigatório!", "info");
			return;
		}
		setLoading(true);
		try {
			await api.createModulo(modulo);
			toast("Curso criado com sucesso!", "success");
			navigate("/cms");
		} catch (err: any) {
			toast(err.message || "Erro ao criar curso", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="page active">
			<div className="page-header">
				<div>
					<button id="btn-voltar-criar" className="btn-secondary back-btn" onClick={() => navigate("/cms")}>
						<i className="icon-arrow-left icon-sm" /> Voltar
					</button>
					<div className="page-title">Criar Novo Curso</div>
					<div className="page-subtitle">Configure as informações do curso</div>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="criar-form">
				<div className="form-field">
					<label className="form-label">Título</label>
					<input
						id="criar-titulo"
						className="form-input"
						value={modulo.titulo}
						onChange={(e) => setModulo({ ...modulo, titulo: e.target.value })}
						placeholder="Nome do curso"
						required
					/>
				</div>

				<div className="form-field">
					<label className="form-label">Ícone / Emoji</label>
					<div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
						<button
							id="criar-icone-btn"
							type="button"
							className="btn-secondary criar-emoji-btn"
							onClick={() => setShowEmojiPicker(!showEmojiPicker)}
						>
							{modulo.icone}
						</button>
						{showEmojiPicker && (
							<div className="criar-emoji-picker">
								{EMOJI_OPTIONS.map((em) => (
									<button
										key={em}
										type="button"
										className={`criar-emoji-opt ${modulo.icone === em ? "selected" : "default"}`}
										onClick={() => {
											setModulo({ ...modulo, icone: em });
											setShowEmojiPicker(false);
										}}
									>
										{em}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="form-field">
					<label className="form-label">Descrição</label>
					<textarea
						id="criar-descricao"
						className="form-input"
						value={modulo.descricao}
						onChange={(e) => setModulo({ ...modulo, descricao: e.target.value })}
						placeholder="Descrição do curso"
						rows={4}
					/>
				</div>

				<div className="form-field">
					<label className="form-label">Obrigatório</label>
					<select
						id="criar-obrigatorio"
						className="form-select"
						value={modulo.obrigatorio ? "true" : "false"}
						onChange={(e) => setModulo({ ...modulo, obrigatorio: e.target.value === "true" })}
					>
						<option value="false">Não</option>
						<option value="true">Sim — Usuários devem concluir este módulo</option>
					</select>
				</div>

				<div className="form-field">
					<label className="form-label criar-label-flex">Gerar Certificado Automaticamente</label>
					<p className="criar-hint">
						Ativado: O certificado é gerado automaticamente ao concluir todas as aulas e quizzes do curso. Desativado:
						Requer aprovação do gestor/admin para emitir o certificado.
					</p>
					<select
						id="criar-auto-cert"
						className="form-select"
						value={modulo.autoCertificado ? "true" : "false"}
						onChange={(e) => setModulo({ ...modulo, autoCertificado: e.target.value === "true" })}
					>
						<option value="false">Não (Requer aprovação)</option>
						<option value="true">Sim (Automático ao concluir)</option>
					</select>
				</div>

				<div className="form-field">
					<label className="form-label">Acesso por Perfil</label>
					<div style={{ fontSize: "12px", color: "var(--gray-500)", marginBottom: "6px" }}>
						Se nenhum perfil selecionado, todos terão acesso.
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
						{["ADMIN", "GESTOR", "ATENDENTE", "PARCEIRO_ACREDITADO", "ERPS_REPRESENTANTE"].map((role) => {
							const currentRoles: string[] = modulo.rolesPermitidos || [];
							const checked = currentRoles.includes(role);
							return (
								<label
									key={role}
									style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}
								>
									<input
										type="checkbox"
										checked={checked}
										onChange={() => {
											const newRoles = checked ? currentRoles.filter((r) => r !== role) : [...currentRoles, role];
											setModulo({ ...modulo, rolesPermitidos: newRoles.length > 0 ? newRoles : null });
										}}
									/>
									{ROLE_LABELS[role] || role}
								</label>
							);
						})}
					</div>
				</div>

				<div className="criar-actions">
					<button id="criar-submit" type="submit" className="btn-primary" disabled={loading}>
						{loading ? "Criando..." : "Criar Curso"}
					</button>
					<button id="criar-cancelar" type="button" className="btn-secondary" onClick={() => navigate("/cms")}>
						Cancelar
					</button>
				</div>
			</form>
		</div>
	);
}
