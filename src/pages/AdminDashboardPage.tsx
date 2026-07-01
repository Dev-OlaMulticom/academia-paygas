import { useCallback, useEffect, useState } from "react";
import { TablePagination, useClientPagination } from "../components/TablePagination";
import { ROLE_CSS_CLASSES } from "../data/constants";
import type { User } from "../hooks/useAuth";
import { api } from "../lib/api";

interface AdminDashboardPageProps {
	user: User;
}

export function AdminDashboardPage({ user: _user }: AdminDashboardPageProps) {
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [users, setUsers] = useState<any[]>([]);
	const [activeTab, setActiveTab] = useState<"resumo" | "acessos" | "atividades" | "cursos" | "email">("resumo");
	const [emailForm, setEmailForm] = useState({ userId: "", assunto: "", mensagem: "" });
	const [sending, setSending] = useState(false);
	const [emailMsg, setEmailMsg] = useState("");
	const [expandedRow, setExpandedRow] = useState<string | null>(null);

	const acessosRecentes = data?.acessosRecentes || [];
	const atividadesRecentes = data?.atividadesRecentes || [];
	const {
		page: acessosPage,
		setPage: setAcessosPage,
		paginatedItems: paginatedAcessos,
		totalItems: totalAcessos,
	} = useClientPagination(acessosRecentes, 10);
	const {
		page: ativPage,
		setPage: setAtivPage,
		paginatedItems: paginatedAtividades,
		totalItems: totalAtividades,
	} = useClientPagination(atividadesRecentes, 10);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const [dashData, usersData] = await Promise.all([api.getAdminDashboard(), api.getUsuarios()]);
			setData(dashData);
			setUsers(Array.isArray(usersData) ? usersData : []);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleSendEmail = async () => {
		if (!emailForm.userId || !emailForm.assunto || !emailForm.mensagem) {
			setEmailMsg("Preencha todos os campos");
			return;
		}
		setSending(true);
		setEmailMsg("");
		try {
			const result = await api.sendCustomEmail(emailForm.userId, emailForm.assunto, emailForm.mensagem);
			setEmailMsg(result.message || "Email enviado com sucesso!");
			setEmailForm({ userId: "", assunto: "", mensagem: "" });
		} catch (err: any) {
			setEmailMsg(err.message || "Erro ao enviar email");
		} finally {
			setSending(false);
		}
	};

	const formatDate = (iso: string) => {
		const d = new Date(iso);
		return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
	};

	const roleClass = (role: string) => ROLE_CSS_CLASSES[role] || ROLE_CSS_CLASSES.ATENDENTE;

	if (loading) {
		return (
			<div className="page active">
				<div className="admin-loading">Carregando...</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="page active">
				<div className="admin-loading">Erro ao carregar dados</div>
			</div>
		);
	}

	const { resumoGeral, cursosRecentes, emailsStats } = data;

	const tabs = [
		{ key: "resumo", label: "Resumo" },
		{ key: "acessos", label: "Acessos Recentes" },
		{ key: "atividades", label: "Atividades" },
		{ key: "cursos", label: "Cursos" },
		{ key: "email", label: "Enviar Email" },
	];

	return (
		<div className="page active">
			<div className="page-header">
				<div>
					<div className="page-title">Dashboard Administrativo</div>
					<div className="page-subtitle">Visao geral do sistema</div>
				</div>
			</div>

			<div className="admin-stats-grid">
				{[
					{ val: resumoGeral.totalUsers, label: "Usuarios" },
					{ val: resumoGeral.totalModulos, label: "Modulos" },
					{ val: resumoGeral.totalAulas, label: "Aulas" },
					{ val: resumoGeral.totalCertificates, label: "Certificados" },
					{ val: resumoGeral.quizzesAprovados, label: "Quizzes Aprovados" },
					{ val: emailsStats.total, label: "Emails Enviados" },
				].map((item, i) => (
					<div key={i} className="stat-info">
						<div className="stat-info-top">
							<div className="stat-card-val" style={{ fontSize: "24px" }}>
								{item.val}
							</div>
						</div>
						<div className="stat-card-label">{item.label}</div>
					</div>
				))}
			</div>

			<div className="admin-tabs">
				{tabs.map((t) => (
					<button
						key={t.key}
						className={`admin-tab-btn ${activeTab === t.key ? "active" : ""}`}
						onClick={() => setActiveTab(t.key as any)}
					>
						{t.label}
					</button>
				))}
			</div>

			<div className="admin-tab-content">
				{activeTab === "resumo" && (
					<div className="admin-section-pad">
						<div className="admin-resumo-grid">
							<div>
								<div className="section-title section-mb">Acessos Recentes</div>
								{acessosRecentes.length === 0 ? (
									<div className="admin-empty">Nenhum acesso registrado</div>
								) : (
									<div className="admin-log-list">
										{acessosRecentes.slice(0, 5).map((log: any) => (
											<div key={log.id} className="admin-log-item">
												<div className="admin-log-item-body">
													<div className="admin-log-item-title">{log.user?.nome || log.user?.email}</div>
													<div className="admin-log-item-sub">{formatDate(log.createdAt)}</div>
												</div>
												<span className={`admin-role-badge ${roleClass(log.user?.role || "")}`}>{log.user?.role}</span>
											</div>
										))}
									</div>
								)}
							</div>
							<div>
								<div className="section-title section-mb">Atividade Recente</div>
								{atividadesRecentes.length === 0 ? (
									<div className="admin-empty">Nenhuma atividade</div>
								) : (
									<div className="admin-log-list">
										{atividadesRecentes.slice(0, 5).map((log: any) => (
											<div key={log.id} className="admin-log-item">
												<div className="admin-log-item-body">
													<div className="admin-log-item-title">{log.acao}</div>
													<div className="admin-log-item-sub">
														{log.user?.nome} — {formatDate(log.createdAt)}
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{activeTab === "acessos" && (
					<div className="admin-table-wrap">
						<table className="admin-table">
							<thead>
								<tr>
									<th style={{ width: "40px" }}></th>
									<th>Data/Hora</th>
									<th>Usuario</th>
									<th>Email</th>
									<th>Role</th>
								</tr>
							</thead>
							<tbody>
								{paginatedAcessos.map((log: any) => (
									<>
										<tr
											key={log.id}
											className={`row-clickable ${expandedRow === log.id ? "row-expanded" : ""}`}
											onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
										>
											<td>
												<span className={`row-expand-icon ${expandedRow === log.id ? "open" : ""}`}>
													<i className={`icon-chevron-${expandedRow === log.id ? "up" : "down"} icon-xs`} />
												</span>
											</td>
											<td className="date-col">{formatDate(log.createdAt)}</td>
											<td className="name-col">{log.user?.nome || "—"}</td>
											<td className="email-col">{log.user?.email}</td>
											<td>
												<span className={`admin-role-badge ${roleClass(log.user?.role || "")}`}>{log.user?.role}</span>
											</td>
										</tr>
										{expandedRow === log.id && (
											<tr key={`${log.id}-detail`} className="row-detail">
												<td colSpan={5}>
													<div className="row-detail-body">
														<div className="row-detail-grid">
															<div className="row-detail-item">
																<span className="row-detail-label">Data/Hora</span>
																<span className="row-detail-value">{formatDate(log.createdAt)}</span>
															</div>
															<div className="row-detail-item">
																<span className="row-detail-label">Nome</span>
																<span className="row-detail-value">{log.user?.nome || "—"}</span>
															</div>
															<div className="row-detail-item">
																<span className="row-detail-label">Email</span>
																<span className="row-detail-value">{log.user?.email}</span>
															</div>
															<div className="row-detail-item">
																<span className="row-detail-label">Perfil</span>
																<span className="row-detail-value">{log.user?.role}</span>
															</div>
														</div>
													</div>
												</td>
											</tr>
										)}
									</>
								))}
							</tbody>
						</table>
						<TablePagination
							page={acessosPage}
							totalItems={totalAcessos}
							itemsPerPage={10}
							onPageChange={setAcessosPage}
						/>
					</div>
				)}

				{activeTab === "atividades" && (
					<div className="admin-table-wrap">
						<table className="admin-table">
							<thead>
								<tr>
									<th style={{ width: "40px" }}></th>
									<th>Data/Hora</th>
									<th>Usuario</th>
									<th>Acao</th>
									<th>Detalhes</th>
								</tr>
							</thead>
							<tbody>
								{paginatedAtividades.map((log: any) => (
									<>
										<tr
											key={log.id}
											className={`row-clickable ${expandedRow === log.id ? "row-expanded" : ""}`}
											onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
										>
											<td>
												<span className={`row-expand-icon ${expandedRow === log.id ? "open" : ""}`}>
													<i className={`icon-chevron-${expandedRow === log.id ? "up" : "down"} icon-xs`} />
												</span>
											</td>
											<td className="date-col">{formatDate(log.createdAt)}</td>
											<td>
												<div className="name-col">{log.user?.nome || "—"}</div>
												<div className="admin-log-item-sub">{log.user?.email}</div>
											</td>
											<td className="action-col">{log.acao}</td>
											<td className="detail-col">{log.detalhes || "—"}</td>
										</tr>
										{expandedRow === log.id && (
											<tr key={`${log.id}-detail`} className="row-detail">
												<td colSpan={5}>
													<div className="row-detail-body">
														<div className="row-detail-grid">
															<div className="row-detail-item">
																<span className="row-detail-label">Data/Hora</span>
																<span className="row-detail-value">{formatDate(log.createdAt)}</span>
															</div>
															<div className="row-detail-item">
																<span className="row-detail-label">Usuario</span>
																<span className="row-detail-value">{log.user?.nome || "—"}</span>
															</div>
															<div className="row-detail-item">
																<span className="row-detail-label">Email</span>
																<span className="row-detail-value">{log.user?.email}</span>
															</div>
															<div className="row-detail-item">
																<span className="row-detail-label">Acao</span>
																<span className="row-detail-value">{log.acao}</span>
															</div>
															<div className="row-detail-item" style={{ gridColumn: "1 / -1" }}>
																<span className="row-detail-label">Detalhes</span>
																<span className="row-detail-value">{log.detalhes || "—"}</span>
															</div>
														</div>
													</div>
												</td>
											</tr>
										)}
									</>
								))}
							</tbody>
						</table>
						<TablePagination
							page={ativPage}
							totalItems={totalAtividades}
							itemsPerPage={10}
							onPageChange={setAtivPage}
						/>
					</div>
				)}

				{activeTab === "cursos" && (
					<div className="admin-section-pad">
						<div className="section-title section-mb-lg">Modulos com Mais Atividade</div>
						{cursosRecentes.length === 0 ? (
							<div className="admin-empty">Nenhum modulo com atividade</div>
						) : (
							<div className="admin-log-list" style={{ gap: "12px" }}>
								{cursosRecentes.map((curso: any) => (
									<div key={curso.id} className="admin-curso-card">
										<div className="admin-curso-header">
											<div className="admin-curso-title">{curso.titulo}</div>
											<div className="admin-curso-count">
												{curso.concluidos} / {curso.totalAulas} aulas
											</div>
										</div>
										<div className="admin-bar">
											<div className="admin-bar-fill" style={{ width: `${curso.percentual}%` }} />
										</div>
										<div className="admin-curso-footer">
											<span>{curso.acessos} acessos</span>
											<span>{curso.percentual}% concluido</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{activeTab === "email" && (
					<div className="admin-email-section">
						<div className="section-title section-mb-lg">Enviar Email para Usuario</div>
						<div className="admin-email-form">
							<div className="form-field">
								<label className="form-label">Destinatario</label>
								<select
									className="form-input"
									value={emailForm.userId}
									onChange={(e) => setEmailForm((prev) => ({ ...prev, userId: e.target.value }))}
								>
									<option value="">Selecione um usuario...</option>
									{users.map((u: any) => (
										<option key={u.id} value={u.id}>
											{u.nome || u.email} ({u.email})
										</option>
									))}
								</select>
							</div>
							<div className="form-field">
								<label className="form-label">Assunto</label>
								<input
									className="form-input"
									type="text"
									placeholder="Ex: Informacao importante..."
									value={emailForm.assunto}
									onChange={(e) => setEmailForm((prev) => ({ ...prev, assunto: e.target.value }))}
								/>
							</div>
							<div className="form-field">
								<label className="form-label">Mensagem</label>
								<textarea
									className="form-input admin-textarea"
									rows={6}
									placeholder="Digite a mensagem do email..."
									value={emailForm.mensagem}
									onChange={(e) => setEmailForm((prev) => ({ ...prev, mensagem: e.target.value }))}
								/>
							</div>
							{emailMsg && (
								<div
									className={`admin-email-msg ${emailMsg.includes("sucesso") || emailMsg.includes("enviado") ? "success" : "error"}`}
								>
									{emailMsg}
								</div>
							)}
							<button className="btn-primary admin-submit-btn" onClick={handleSendEmail} disabled={sending}>
								{sending ? "Enviando..." : "Enviar Email"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
