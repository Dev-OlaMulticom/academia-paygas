import { useCallback, useEffect, useState } from "react";
import { AppSelect } from "../components/AppSelect";
import { PasswordInput } from "../components/PasswordInput";
import { TablePagination, useClientPagination } from "../components/TablePagination";
import { useConfirm, useToast } from "../components/Toast";
import { PERSONAS } from "../data/constants";
import { useAbility } from "../hooks/useAbility";
import type { User } from "../hooks/useAuth";
import { api } from "../lib/api";

interface UsuariosPageProps {
	user: User;
}

export function UsuariosPage({ user }: UsuariosPageProps) {
	const { toast } = useToast();
	const { confirm } = useConfirm();
	const { isAdmin, isGestor } = useAbility();
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingUser, setEditingUser] = useState<any>(null);
	const [newUser, setNewUser] = useState({ nome: "", email: "", senha: "", role: "", gestorId: "" });
	const [usuarios, setUsuarios] = useState<any[]>([]);
	const [gestores, setGestores] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [equipeDetalhe, setEquipeDetalhe] = useState<any[]>([]);
	const [expandedUser, setExpandedUser] = useState<string | null>(null);
	const [expandedRow, setExpandedRow] = useState<string | null>(null);
	const { page, setPage, paginatedItems: paginatedUsuarios, totalItems } = useClientPagination(usuarios, 10);

	const canValidate = isAdmin || isGestor;

	const loadUsuarios = useCallback(async () => {
		try {
			const result = await api.getUsuarios();
			setUsuarios(result);
		} catch {
			setUsuarios([]);
		} finally {
			setLoading(false);
		}
	}, []);

	const loadGestores = useCallback(async () => {
		try {
			const result = await api.getUsuarios();
			setGestores(result.filter((u: any) => u.role === "GESTOR"));
		} catch {
			setGestores([]);
		}
	}, []);

	const loadEquipeDetalhe = useCallback(async () => {
		try {
			const data = await api.getEquipeDetalhe();
			setEquipeDetalhe(data);
		} catch {
			setEquipeDetalhe([]);
		}
	}, []);

	useEffect(() => {
		loadUsuarios();
		loadGestores();
		loadEquipeDetalhe();
	}, [loadUsuarios, loadGestores, loadEquipeDetalhe]);

	const handleCreate = async () => {
		if (!newUser.nome || !newUser.email || !newUser.senha || !newUser.role) {
			toast("Preencha todos os campos!", "info");
			return;
		}
		if (newUser.role === "ATENDENTE" && !isGestor && !newUser.gestorId) {
			toast("Selecione um Gestor / Líder para o atendente!", "info");
			return;
		}
		try {
			await api.createUsuario({
				nome: newUser.nome,
				email: newUser.email,
				senha: newUser.senha,
				role: isGestor ? "ATENDENTE" : newUser.role,
				gestorId: isGestor ? user.id : newUser.role === "ATENDENTE" ? newUser.gestorId : undefined,
			});
			toast("Usuario criado com sucesso! Email de verificacao enviado.", "success");
			setShowCreateModal(false);
			setNewUser({ nome: "", email: "", senha: "", role: "", gestorId: "" });
			loadUsuarios();
		} catch (err: any) {
			toast(err.message || "Erro ao criar usuario", "error");
		}
	};

	const handleEdit = async () => {
		if (!editingUser) return;
		try {
			await api.updateUsuario(editingUser.id, {
				nome: editingUser.nome,
				email: editingUser.email,
				role: editingUser.role,
				gestorId: editingUser.role === "ATENDENTE" ? editingUser.gestorId : null,
			});
			toast("Usuario atualizado!", "success");
			setEditingUser(null);
			loadUsuarios();
		} catch (err: any) {
			toast(err.message || "Erro ao atualizar", "error");
		}
	};

	const handleDelete = async (id: string) => {
		const ok = await confirm({
			title: "Excluir usuario",
			message: "Excluir este usuario? Todos os dados serao removidos.",
			confirmLabel: "Excluir",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.deleteUsuario(id);
			toast("Usuario excluido!", "success");
			loadUsuarios();
		} catch (err: any) {
			toast(err.message || "Erro ao excluir", "error");
		}
	};

	const handleValidateAccount = async (id: string, nome: string) => {
		const ok = await confirm({
			title: "Validar conta",
			message: `Validar a conta de ${nome}? O usuario tera acesso imediato.`,
			confirmLabel: "Validar",
		});
		if (!ok) return;
		try {
			await api.validateAccount(id);
			toast("Conta validada com sucesso!", "success");
			loadUsuarios();
		} catch (err: any) {
			toast(err.message || "Erro ao validar conta", "error");
		}
	};

	const handleResendVerification = async (id: string, nome: string) => {
		const ok = await confirm({
			title: "Reenviar verificacao",
			message: `Reenviar email de verificacao para ${nome}?`,
			confirmLabel: "Reenviar",
		});
		if (!ok) return;
		try {
			await api.resendVerification(id);
			toast("Email de verificacao reenviado!", "success");
		} catch (err: any) {
			toast(err.message || "Erro ao reenviar verificacao", "error");
		}
	};

	const getGestorName = (gestorId: string) => {
		if (!gestorId) return "—";
		const gestor = gestores.find((g) => g.id === gestorId);
		return gestor?.nome || "Sem gestor";
	};

	const getPersonaIcon = (role: string) => {
		switch (role) {
			case "ADMIN":
				return <i className="icon-globe icon-sm" />;
			case "GESTOR":
				return <i className="icon-fuel icon-sm" />;
			case "ATENDENTE":
				return <i className="icon-user icon-sm" />;
			case "PARCEIRO_ACREDITADO":
				return <i className="icon-star icon-sm" />;
			case "ERPS_REPRESENTANTE":
				return <i className="icon-chart icon-sm" />;
			default:
				return <i className="icon-user icon-sm" />;
		}
	};

	return (
		<div className="page active">
			<div className="page-header">
				<div>
					<div className="page-title">{isGestor ? "Meu Time" : "Usuários da Plataforma"}</div>
					<div className="page-subtitle">
						{isGestor ? "Acompanhe o progresso dos seus atendentes" : "Gerencie todos os usuários do sistema"}
					</div>
				</div>
				<button className="btn-primary" onClick={() => setShowCreateModal(true)}>
					+ Novo Usuario
				</button>
			</div>
			<div className="cards-grid">
				<div className="stat-card">
					<div className="stat-card-icon user-stat-blue">
						<i className="icon-users icon-lg" />
					</div>
					<div className="stat-card-val">{usuarios.length}</div>
					<div className="stat-card-label">Total de Usuarios</div>
				</div>
				<div className="stat-card">
					<div className="stat-card-icon user-stat-green">
						<i className="icon-check icon-lg" />
					</div>
					<div className="stat-card-val">{usuarios.filter((u) => u.emailVerificado).length}</div>
					<div className="stat-card-label">Contas Verificadas</div>
				</div>
				<div className="stat-card">
					<div className="stat-card-icon user-stat-yellow">
						<i className="icon-alert-triangle icon-lg" />
					</div>
					<div className="stat-card-val">{usuarios.filter((u) => !u.emailVerificado).length}</div>
					<div className="stat-card-label">Pendente Verificacao</div>
				</div>
			</div>
			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<th style={{ width: "40px" }}></th>
							<th>Nome</th>
							<th>E-mail</th>
							<th>Perfil</th>
							<th>Gestor</th>
							<th>Status</th>
							<th>XP</th>
							<th>Ultimo Acesso</th>
							<th>Acoes</th>
						</tr>
					</thead>
					<tbody>
						{paginatedUsuarios.length > 0 ? (
							paginatedUsuarios.map((u) => (
								<>
									<tr
										key={u.id}
										className={`row-clickable ${expandedRow === u.id ? "row-expanded" : ""}`}
										onClick={() => setExpandedRow(expandedRow === u.id ? null : u.id)}
									>
										<td>
											<span className={`row-expand-icon ${expandedRow === u.id ? "open" : ""}`}>
												<i className={`icon-chevron-${expandedRow === u.id ? "up" : "down"} icon-xs`} />
											</span>
										</td>
										<td>
											<div className="user-row">
												<div
													className="user-avatar user-avatar-sm"
													style={{ background: PERSONAS[u.role as keyof typeof PERSONAS]?.color || "#999" }}
												>
													{u.nome
														?.split(" ")
														.map((n: string) => n[0])
														.slice(0, 2)
														.join("")}
												</div>
												<b>{u.nome}</b>
											</div>
										</td>
										<td className="user-td-email">{u.email}</td>
										<td>
											<span
												className="track-badge badge-new"
												style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
											>
												{getPersonaIcon(u.role)} {PERSONAS[u.role as keyof typeof PERSONAS]?.label}
											</span>
										</td>
										<td className="user-td-gestor">
											{u.role === "ATENDENTE" ? u.gestorNome || getGestorName(u.gestorId) : "—"}
										</td>
										<td>
											{u.emailVerificado ? (
												<span className="user-status-ok">
													<i className="icon-check-circle icon-xs" /> Verificado
												</span>
											) : (
												<span className="user-status-pending">
													<i className="icon-clock icon-xs" /> Pendente
												</span>
											)}
										</td>
										<td>
											<b className="user-xp">{u.xp || 0}</b>
										</td>
										<td className="user-td-last">
											{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("pt-BR") : "Nunca"}
										</td>
										<td className="user-actions" onClick={(e) => e.stopPropagation()}>
											<button className="btn-secondary user-action-btn" onClick={() => setEditingUser({ ...u })}>
												<i className="icon-pencil icon-xs" /> Editar
											</button>
											{canValidate && !u.emailVerificado && (
												<>
													<button
														className="btn-secondary user-action-btn user-action-green"
														onClick={() => handleValidateAccount(u.id, u.nome)}
													>
														<i className="icon-check icon-xs" /> Validar
													</button>
													<button
														className="btn-secondary user-action-btn user-action-blue"
														onClick={() => handleResendVerification(u.id, u.nome)}
													>
														<i className="icon-mail icon-xs" /> Reenviar
													</button>
												</>
											)}
											{isAdmin && (
												<button
													className="btn-secondary user-action-btn user-action-red"
													onClick={() => handleDelete(u.id)}
												>
													<i className="icon-trash-2 icon-xs" />
												</button>
											)}
										</td>
									</tr>
									{expandedRow === u.id && (
										<tr key={`${u.id}-detail`} className="row-detail">
											<td colSpan={9}>
												<div className="row-detail-body">
													<div className="row-detail-grid">
														<div className="row-detail-item">
															<span className="row-detail-label">Nome Completo</span>
															<span className="row-detail-value">{u.nome}</span>
														</div>
														<div className="row-detail-item">
															<span className="row-detail-label">E-mail</span>
															<span className="row-detail-value">{u.email}</span>
														</div>
														<div className="row-detail-item">
															<span className="row-detail-label">Perfil</span>
															<span className="row-detail-value">
																{PERSONAS[u.role as keyof typeof PERSONAS]?.label || u.role}
															</span>
														</div>
														<div className="row-detail-item">
															<span className="row-detail-label">Gestor</span>
															<span className="row-detail-value">
																{u.role === "ATENDENTE" ? u.gestorNome || getGestorName(u.gestorId) : "—"}
															</span>
														</div>
														<div className="row-detail-item">
															<span className="row-detail-label">Status</span>
															<span className="row-detail-value">{u.emailVerificado ? "Verificado" : "Pendente"}</span>
														</div>
														<div className="row-detail-item">
															<span className="row-detail-label">XP</span>
															<span className="row-detail-value">{u.xp || 0} pontos</span>
														</div>
														<div className="row-detail-item">
															<span className="row-detail-label">Nivel</span>
															<span className="row-detail-value">{Math.floor((u.xp || 0) / 2000) + 1}</span>
														</div>
														<div className="row-detail-item">
															<span className="row-detail-label">Ultimo Acesso</span>
															<span className="row-detail-value">
																{u.lastLogin
																	? new Date(u.lastLogin).toLocaleDateString("pt-BR") +
																		" " +
																		new Date(u.lastLogin).toLocaleTimeString("pt-BR", {
																			hour: "2-digit",
																			minute: "2-digit",
																		})
																	: "Nunca"}
															</span>
														</div>
													</div>
												</div>
											</td>
										</tr>
									)}
								</>
							))
						) : (
							<tr>
								<td colSpan={9} className="cms-table-empty">
									{loading ? "Carregando..." : "Dados nao carregados"}
								</td>
							</tr>
						)}
					</tbody>
				</table>
				<TablePagination page={page} totalItems={totalItems} itemsPerPage={10} onPageChange={setPage} />
			</div>

			{isGestor && equipeDetalhe.length > 0 && (
				<div className="user-equipe-section">
					<div className="section-title user-equipe-title">Progresso Detalhado da Equipe</div>
					{equipeDetalhe.map((member) => (
						<div key={member.id} className="user-equipe-card">
							<div
								className="user-equipe-header"
								onClick={() => setExpandedUser(expandedUser === member.id ? null : member.id)}
							>
								<div className="user-avatar user-equipe-avatar">
									{member.nome
										?.split(" ")
										.map((n: string) => n[0])
										.slice(0, 2)
										.join("")}
								</div>
								<div className="user-equipe-info">
									<b className="user-equipe-name">{member.nome}</b>
									<div className="user-equipe-email">{member.email}</div>
								</div>
								<div className="user-equipe-stats">
									<div className="user-equipe-stat">
										<div className="user-equipe-stat-val" style={{ color: "var(--pg-orange)" }}>
											{member.xp || 0}
										</div>
										<div className="user-equipe-stat-label">XP</div>
									</div>
									<div className="user-equipe-stat">
										<div className="user-equipe-stat-val" style={{ color: "var(--pg-green)" }}>
											{member.cursos?.filter((m: any) => m.aulasConcluidas === m.totalAulas && m.totalAulas > 0)
												.length || 0}
										</div>
										<div className="user-equipe-stat-label">Concluídos</div>
									</div>
									<i
										className={expandedUser === member.id ? "icon-chevron-up icon-sm" : "icon-chevron-down icon-sm"}
										style={{ color: "var(--gray-400)" }}
									/>
								</div>
							</div>

							{expandedUser === member.id && (
								<div className="user-equipe-body">
									{member.cursos?.map((mod: any) => {
										const percentual =
											mod.totalAulas > 0 ? Math.round((mod.aulasConcluidas / mod.totalAulas) * 100) : 0;
										return (
											<div key={mod.id} className="user-equipe-mod">
												<div className="user-equipe-mod-header">
													<b className="user-equipe-mod-title">{mod.titulo}</b>
													<span
														className="user-equipe-mod-pct"
														style={{ color: percentual === 100 ? "var(--pg-green)" : "var(--gray-500)" }}
													>
														{mod.aulasConcluidas}/{mod.totalAulas} aulas ({percentual}%)
													</span>
												</div>
												<div className="track-prog-bar user-equipe-mod-bar">
													<div
														className={`track-prog-fill ${percentual === 100 ? "done" : ""}`}
														style={{ width: `${percentual}%` }}
													/>
												</div>
												<div className="user-equipe-aulas">
													{mod.aulas?.map((aula: any) => (
														<div key={aula.id} className="user-equipe-aula">
															<i
																className={aula.concluido ? "icon-check-circle icon-xs" : "icon-circle icon-xs"}
																style={{ color: aula.concluido ? "var(--pg-green)" : "var(--gray-300)" }}
															/>
															<span
																className="user-equipe-aula-name"
																style={{ color: aula.concluido ? "var(--gray-700)" : "var(--gray-400)" }}
															>
																{aula.titulo}
															</span>
															{aula.licoes?.length > 0 && (
																<span className="user-equipe-aula-licoes">({aula.licoes.length} lições)</span>
															)}
														</div>
													))}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{showCreateModal && (
				<div className="modal-overlay">
					<div className="modal-card">
						<h3 className="modal-title-mb">{isGestor ? "Novo Atendente" : "Novo Usuario"}</h3>
						<div className="form-field">
							<label className="form-label">Nome Completo</label>
							<input
								className="form-input"
								value={newUser.nome}
								onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
							/>
						</div>
						<div className="form-field">
							<label className="form-label">E-mail</label>
							<input
								className="form-input"
								type="email"
								value={newUser.email}
								onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
							/>
						</div>
						<div className="form-field">
							<label className="form-label">Senha</label>
							<PasswordInput
								value={newUser.senha}
								onChange={(v) => setNewUser({ ...newUser, senha: v })}
								autoComplete="new-password"
							/>
						</div>
						{!isGestor && (
							<div className="form-field">
								<label className="form-label">Perfil</label>
								<AppSelect
									id="criar-usuario-perfil"
									options={[
										...(isAdmin ? [{ value: "ADMIN", label: "SuperAdministrador" }] : []),
										{ value: "GESTOR", label: "Gestor / Líder" },
										{ value: "ATENDENTE", label: "Atendente/Frentista" },
										{ value: "PARCEIRO_ACREDITADO", label: "Administrador" },
										{ value: "ERPS_REPRESENTANTE", label: "ERPs Representante" },
									]}
									value={newUser.role || null}
									onChange={(v) =>
										setNewUser({
											...newUser,
											role: v || "",
											gestorId: v !== "ATENDENTE" ? "" : newUser.gestorId,
										})
									}
									placeholder="— Selecione —"
									isClearable
								/>
							</div>
						)}
						{(newUser.role === "ATENDENTE" || isGestor) && !isGestor && (
							<div className="form-field">
								<label className="form-label">Gestor / Líder</label>
								<AppSelect
									id="criar-usuario-gestor"
									options={gestores.map((g) => ({ value: g.id, label: g.nome }))}
									value={newUser.gestorId || null}
									onChange={(v) => setNewUser({ ...newUser, gestorId: v || "" })}
									placeholder="— Selecione o Gestor —"
									isClearable
								/>
							</div>
						)}
						{isGestor && (
							<div className="modal-gestor-note">O atendente sera automaticamente associado a sua equipe.</div>
						)}
						<p className="modal-hint">Um email de verificacao sera enviado para o usuario ativar a conta.</p>
						<div className="modal-actions">
							<button className="btn-primary" onClick={handleCreate}>
								Criar e Enviar Verificacao
							</button>
							<button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			)}

			{editingUser && (
				<div className="modal-overlay">
					<div className="modal-card">
						<h3 className="modal-title-mb">Editar Usuario</h3>
						<div className="form-field">
							<label className="form-label">Nome</label>
							<input
								className="form-input"
								value={editingUser.nome}
								onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
							/>
						</div>
						<div className="form-field">
							<label className="form-label">E-mail</label>
							<input
								className="form-input"
								type="email"
								value={editingUser.email}
								onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
							/>
						</div>
						<div className="form-field">
							<label className="form-label">Perfil</label>
							<AppSelect
								id="editar-usuario-perfil"
								options={[
									{ value: "ADMIN", label: "SuperAdministrador" },
									{ value: "GESTOR", label: "Gestor / Líder" },
									{ value: "ATENDENTE", label: "Atendente" },
									{ value: "PARCEIRO_ACREDITADO", label: "Administrador" },
									{ value: "ERPS_REPRESENTANTE", label: "ERPs Representante" },
								]}
								value={editingUser.role || null}
								onChange={(v) =>
									setEditingUser({
										...editingUser,
										role: v || "",
										gestorId: v !== "ATENDENTE" ? null : editingUser.gestorId || "",
									})
								}
							/>
						</div>
						{editingUser.role === "ATENDENTE" && (
							<div className="form-field">
								<label className="form-label">Gestor / Líder</label>
								<AppSelect
									id="editar-usuario-gestor"
									options={gestores.map((g) => ({ value: g.id, label: g.nome }))}
									value={editingUser.gestorId || null}
									onChange={(v) => setEditingUser({ ...editingUser, gestorId: v || "" })}
									placeholder="— Selecione o Gestor —"
									isClearable
								/>
							</div>
						)}
						<div className="modal-actions">
							<button className="btn-primary" onClick={handleEdit}>
								Salvar
							</button>
							<button className="btn-secondary" onClick={() => setEditingUser(null)}>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
