import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROLE_COLORS } from "../data/constants";
import { useAbility } from "../hooks/useAbility";
import type { User } from "../hooks/useAuth";
import { api } from "../lib/api";
import { XP_PER_LEVEL } from "../lib/constants";

interface PerfilPageProps {
	user: User;
	xp: number;
}

export function PerfilPage({ user, xp }: PerfilPageProps) {
	const { isAdmin } = useAbility();
	const [stats, setStats] = useState<any>(null);
	const [teamStats, setTeamStats] = useState<any>(null);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const demoUsers = [
		{ email: "admin@paygas.com.br", senha: "123456", role: "ADMIN", nome: "Administrador PayGas" },
		{ email: "gestor@paygas.com.br", senha: "123456", role: "GESTOR", nome: "Carlos Mendes" },
		{ email: "atendente@paygas.com.br", senha: "123456", role: "ATENDENTE", nome: "Ana Paula Costa" },
		{ email: "joao@paygas.com.br", senha: "123456", role: "ATENDENTE", nome: "Joao Silva" },
		{ email: "maria@paygas.com.br", senha: "123456", role: "ATENDENTE", nome: "Maria Santos" },
	];

	const loadStats = async () => {
		try {
			const data = await api.getDashboard();
			setStats(data);
		} catch {
			/* */
		}
	};

	const loadTeamStats = async () => {
		try {
			const res = await fetch("/api/usuarios/equipe/stats", {
				headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
			});
			if (res.ok) setTeamStats(await res.json());
		} catch {
			/* */
		}
	};

	useEffect(() => {
		loadStats();
		if (isAdmin) loadTeamStats();
	}, [loadTeamStats, loadStats, isAdmin]);

	const handleChangePassword = async () => {
		setPasswordMsg(null);

		if (!currentPassword || !newPassword) {
			setPasswordMsg({ type: "error", text: "Preencha todos os campos." });
			return;
		}
		if (newPassword.length < 8) {
			setPasswordMsg({ type: "error", text: "Nova senha deve ter pelo menos 8 caracteres." });
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordMsg({ type: "error", text: "As senhas não conferem." });
			return;
		}

		setPasswordLoading(true);
		try {
			await api.changePassword(currentPassword, newPassword);
			setPasswordMsg({ type: "success", text: "Senha alterada com sucesso!" });
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err: any) {
			setPasswordMsg({ type: "error", text: err.message || "Erro ao alterar senha." });
		} finally {
			setPasswordLoading(false);
		}
	};

	const level = Math.floor((xp || 0) / XP_PER_LEVEL) + 1;

	return (
		<div className="page active">
			<div className="page-header">
				<div className="page-title">Meu Perfil</div>
			</div>
			<div className="two-col">
				<div>
					<div className="perfil-card">
						<div className="perfil-user-row">
							<div className="user-avatar perfil-avatar-lg">{user?.email?.charAt(0).toUpperCase() || "U"}</div>
							<div>
								<b className="perfil-email">{user?.email}</b>
								<span className="perfil-role">{user?.role}</span>
							</div>
						</div>
						<div className="form-field">
							<label className="form-label">E-mail</label>
							<input className="form-input" type="email" value={user?.email || ""} readOnly />
						</div>
						<div className="perfil-xp-row">
							<div className="perfil-xp-box">
								<div className="perfil-xp-val orange">{xp || 0}</div>
								<div className="perfil-xp-label">XP Total</div>
							</div>
							<div className="perfil-xp-box">
								<div className="perfil-xp-val purple">Nv. {level}</div>
								<div className="perfil-xp-label">Nivel</div>
							</div>
						</div>
					</div>

					<div className="perfil-card">
						<div className="section-title">Seguranca</div>
						<div className="form-field">
							<label className="form-label">Senha Atual</label>
							<input
								className="form-input"
								type="password"
								placeholder="Digite sua senha atual"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
							/>
						</div>
						<div className="form-field">
							<label className="form-label">Nova Senha</label>
							<input
								className="form-input"
								type="password"
								placeholder="Minimo 8 caracteres"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
							/>
						</div>
						<div className="form-field">
							<label className="form-label">Confirmar Senha</label>
							<input
								className="form-input"
								type="password"
								placeholder="Repita a senha"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
							/>
						</div>
						{passwordMsg && (
							<div className={passwordMsg.type === "success" ? "perfil-msg success" : "perfil-msg error"}>
								{passwordMsg.text}
							</div>
						)}
						<button className="btn-secondary perfil-full-btn" onClick={handleChangePassword} disabled={passwordLoading}>
							{passwordLoading ? "Alterando..." : "Alterar Senha"}
						</button>
					</div>
				</div>

				<div>
					<div className="perfil-card">
						<div className="section-title">Estatisticas</div>
						<div className="perfil-stats-grid">
							<div className="stat-card perfil-stat">
								<div className="perfil-stat-icon">
									<i className="icon-zap icon-lg" />
								</div>
								<div className="stat-card-val perfil-stat-val">{xp || 0}</div>
								<div className="stat-card-label">XP Total</div>
							</div>
							<div className="stat-card perfil-stat">
								<div className="perfil-stat-icon">
									<i className="icon-star icon-lg" />
								</div>
								<div className="stat-card-val perfil-stat-val">{level}</div>
								<div className="stat-card-label">Nivel Atual</div>
							</div>
							<div className="stat-card perfil-stat">
								<div className="perfil-stat-icon">
									<i className="icon-trophy icon-lg" />
								</div>
								<div className="stat-card-val perfil-stat-val">{stats?.totalCertificados || 0}</div>
								<div className="stat-card-label">Certificados</div>
							</div>
							<div className="stat-card perfil-stat">
								<div className="perfil-stat-icon">
									<i className="icon-book-open icon-lg" />
								</div>
								<div className="stat-card-val perfil-stat-val">{stats?.totalModulos || 0}</div>
								<div className="stat-card-label">Modulos</div>
							</div>
						</div>
					</div>

					{isAdmin && teamStats && (
						<div className="perfil-card">
							<div className="section-title">Equipes</div>
							<div className="perfil-stats-grid">
								<div className="stat-card perfil-stat">
									<div className="stat-card-val perfil-stat-val">{teamStats.totalGestores}</div>
									<div className="stat-card-label">Gestores</div>
								</div>
								<div className="stat-card perfil-stat">
									<div className="stat-card-val perfil-stat-val">{teamStats.totalAtendentes}</div>
									<div className="stat-card-label">Atendentes</div>
								</div>
							</div>
						</div>
					)}

					{isAdmin && (
						<div className="perfil-card">
							<div className="section-title perfil-sandbox-title">Sandbox — Usuários de Teste</div>
							<div className="perfil-sandbox-hint">
								Estas são credenciais de demonstração para acesso rápido ao ambiente de testes.
							</div>
							<div className="perfil-demo-list">
								{demoUsers.map((u) => {
									const personaColor = ROLE_COLORS[u.role] || ROLE_COLORS.ATENDENTE;
									return (
										<div key={u.email} className="perfil-demo-item">
											<div className="user-avatar perfil-demo-avatar" style={{ background: personaColor }}>
												{u.nome.charAt(0)}
											</div>
											<div className="perfil-demo-info">
												<b className="perfil-demo-name">{u.nome}</b>
												<span className="perfil-demo-email">{u.email}</span>
											</div>
											<div className="perfil-demo-right">
												<span className="perfil-demo-role" style={{ background: personaColor }}>
													{u.role}
												</span>
												<span className="perfil-demo-senha">senha: {u.senha}</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>
			<div className="perfil-footer">
				<Link to="/termos" className="perfil-footer-link">
					Termos de Uso
				</Link>
				<span className="perfil-footer-dot">·</span>
				<Link to="/privacidade" className="perfil-footer-link">
					Política de Privacidade
				</Link>
			</div>
		</div>
	);
}
