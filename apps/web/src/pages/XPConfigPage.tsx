import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionMenu } from "../components/ActionMenu";
import { useConfirm, useToast } from "../components/Toast";
import { XP_ACTIONS } from "../data/constants";
import type { User } from "../hooks/useAuth";
import { invalidateGameConfig, useGameConfig } from "../hooks/useGameConfig";
import { api } from "../lib/api";

interface XPConfigPageProps {
	user: User;
}

interface XPConfigItem {
	id: string;
	action: string;
	label: string;
	points: number;
	description: string | null;
	isDefault?: boolean;
}

const CUSTOM_ACTION = "__custom__";
const LEVEL_ACTION_RE = /^LEVEL_(\d+)$/;

export function XPConfigPage({ user: _user }: XPConfigPageProps) {
	const { toast } = useToast();
	const { confirm } = useConfirm();
	const gameConfig = useGameConfig();
	const xpPerLevel = gameConfig.xpPerLevel;
	const [configs, setConfigs] = useState<XPConfigItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editValues, setEditValues] = useState<{ points: string; label: string; description: string }>({
		points: "",
		label: "",
		description: "",
	});
	const [deletingAction, setDeletingAction] = useState<string | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [creating, setCreating] = useState(false);
	const [newConfig, setNewConfig] = useState({ action: "", label: "", points: "", description: "" });
	const [customAction, setCustomAction] = useState("");

	const isCustomAction = newConfig.action === CUSTOM_ACTION;
	const [newLevelXp, setNewLevelXp] = useState("");
	const [showNewLevel, setShowNewLevel] = useState(false);
	const [addingLevel, setAddingLevel] = useState(false);
	const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
	const [editLevelXp, setEditLevelXp] = useState("");

	const isLevelRow = useCallback((c: { action: string }) => LEVEL_ACTION_RE.test(c.action), []);

	const configuredActions = useMemo(() => new Set(configs.map((c) => c.action)), [configs]);

	const rows = useMemo<XPConfigItem[]>(() => {
		const defaults = XP_ACTIONS.filter((a) => !configuredActions.has(a.action)).map((a) => ({
			id: `default-${a.action}`,
			action: a.action,
			label: a.label,
			points: a.defaultXp,
			description: a.description,
			isDefault: true,
		}));
		return [...configs.filter((c) => !isLevelRow(c)), ...defaults].sort((a, b) =>
			a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
		);
	}, [configs, isLevelRow]);

	const levelRows = useMemo(
		() =>
			configs
				.filter(isLevelRow)
				.map((c) => ({ ...c, level: Number(LEVEL_ACTION_RE.exec(c.action)![1]) }))
				.sort((a, b) => a.points - b.points),
		[configs, isLevelRow],
	);
	const hasLevel1 = levelRows.some((r) => r.level === 1);
	const nextLevel = levelRows.length > 0 ? Math.max(...levelRows.map((r) => r.level)) + 1 : 2;
	const suggestedLevelXp =
		levelRows.length > 0 ? Math.round(Math.max(...levelRows.map((r) => r.points)) + xpPerLevel) : xpPerLevel;

	const loadConfigs = useCallback(async () => {
		try {
			const data = await api.getXPConfig();
			setConfigs(data);
		} catch {
			setConfigs([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadConfigs();
	}, [loadConfigs]);

	const handleEdit = (config: XPConfigItem) => {
		setEditingId(config.id);
		setEditValues({
			points: String(config.points),
			label: config.label,
			description: config.description || "",
		});
	};

	const handleSave = async (action: string) => {
		const points = parseFloat(editValues.points);
		if (Number.isNaN(points) || points < 0) {
			toast("O valor de XP deve ser um número válido e não negativo", "error");
			return;
		}

		try {
			await api.updateXPConfig(action, {
				points,
				label: editValues.label,
				description: editValues.description || undefined,
			});
			toast("Configuração atualizada!", "success");
			setEditingId(null);
			loadConfigs();
		} catch (err: any) {
			toast(err.message || "Erro ao atualizar", "error");
		}
	};

	const handleDelete = async (config: XPConfigItem) => {
		const ok = await confirm({
			title: "Excluir acao de XP",
			message: `Realmente deseja excluir a ação de XP "${config.label}" (${config.action})?\n\nEsta ação NÃO pode ser desfeita. Registros históricos de XP já contabilizados NÃO serão alterados.`,
			confirmLabel: "Sim, excluir",
			cancelLabel: "Cancelar",
			danger: true,
		});
		if (!ok) return;

		setDeletingAction(config.action);
		try {
			await api.deleteXPConfig(config.action);
			toast("Configuração XP excluída!", "success");
			loadConfigs();
		} catch (err: any) {
			toast(err.message || "Erro ao excluir", "error");
		} finally {
			setDeletingAction(null);
		}
	};

	const handleSelectAction = (value: string) => {
		if (value === CUSTOM_ACTION) {
			setNewConfig({ action: CUSTOM_ACTION, label: "", points: "", description: "" });
			return;
		}
		const cat = XP_ACTIONS.find((a) => a.action === value);
		setNewConfig({
			action: value,
			label: cat?.label || "",
			points: cat ? String(cat.defaultXp) : "",
			description: cat?.description || "",
		});
	};

	const handleCreate = async () => {
		const action = (isCustomAction ? customAction : newConfig.action).trim();
		const label = newConfig.label.trim();
		const points = parseFloat(newConfig.points);

		if (!action) {
			toast("Acao e obrigatoria", "error");
			return;
		}
		if (!label) {
			toast("Label e obrigatorio", "error");
			return;
		}
		if (Number.isNaN(points) || points < 0) {
			toast("O valor de XP deve ser um numero valido e nao negativo", "error");
			return;
		}

		setCreating(true);
		try {
			await api.createXPConfig({
				action,
				label,
				points,
				description: newConfig.description.trim() || undefined,
			});
			toast("Configuracao criada!", "success");
			setShowCreateModal(false);
			setNewConfig({ action: "", label: "", points: "", description: "" });
			setCustomAction("");
			loadConfigs();
		} catch (err: any) {
			toast(err.message || "Erro ao criar configuracao", "error");
		} finally {
			setCreating(false);
		}
	};

	const handleAddLevel = async () => {
		const xp = parseFloat(newLevelXp);
		if (Number.isNaN(xp) || xp < 0) {
			toast("Informe o XP mínimo do nível (número não negativo)", "error");
			return;
		}
		setAddingLevel(true);
		try {
			await api.createXPConfig({
				action: `LEVEL_${nextLevel}`,
				label: `Nível ${nextLevel}`,
				points: xp,
				description: `Requer ${xp} XP acumulados`,
			});
			toast(`Nível ${nextLevel} criado!`, "success");
			setNewLevelXp("");
			setShowNewLevel(false);
			invalidateGameConfig();
			loadConfigs();
		} catch (err: any) {
			toast(err.message || "Erro ao criar nível", "error");
		} finally {
			setAddingLevel(false);
		}
	};

	const handleSaveLevel = async (row: (typeof levelRows)[number]) => {
		const xp = parseFloat(editLevelXp);
		if (Number.isNaN(xp) || xp < 0) {
			toast("O XP mínimo deve ser um número válido e não negativo", "error");
			return;
		}
		try {
			await api.updateXPConfig(row.action, {
				points: xp,
				label: `Nível ${row.level}`,
				description: `Requer ${xp} XP acumulados`,
			});
			toast("Nível atualizado!", "success");
			setEditingLevelId(null);
			invalidateGameConfig();
			loadConfigs();
		} catch (err: any) {
			toast(err.message || "Erro ao atualizar nível", "error");
		}
	};

	const handleDeleteLevel = async (row: (typeof levelRows)[number]) => {
		const ok = await confirm({
			title: "Excluir nível",
			message: `Excluir o Nível ${row.level} (mínimo ${row.points} XP)?\n\nSem níveis configurados, o sistema volta a usar a fórmula linear (Nível = XP ÷ ${xpPerLevel} + 1).`,
			confirmLabel: "Sim, excluir",
			cancelLabel: "Cancelar",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.deleteXPConfig(row.action);
			toast("Nível excluído!", "success");
			invalidateGameConfig();
			loadConfigs();
		} catch (err: any) {
			toast(err.message || "Erro ao excluir nível", "error");
		}
	};

	return (
		<div className="page active">
			<div className="page-header">
				<div>
					<div className="page-title">Configuração de XP</div>
					<div className="page-subtitle">
					Defina quanto XP vale cada ação e as faixas de XP dos níveis dos usuários
				</div>
				</div>
				<div className="cms-header-actions">
					<button className="btn-primary" onClick={() => setShowCreateModal(true)}>
						+ Nova Configuração
					</button>
				</div>
			</div>

			<div className="xp-info-box">
				<i className="icon-info icon-md xp-info-icon" />
				<div className="xp-info-text">
					<b>O que é XP:</b> são os pontos que cada usuário (atendente, gestor ou admin) acumula ao usar a plataforma —
					fazer login, concluir lições, aprovar quizzes, ler notificações, etc. A tabela abaixo define quanto XP cada
					ação vale; itens com o selo <b>padrão</b> usam o valor de fábrica — clique em "Configurar" para
					personalizar. Na seção <b>Níveis</b> você define o XP mínimo de cada nível; sem níveis configurados, o
					sistema usa a fórmula linear: <b>Nível = XP ÷ {xpPerLevel} + 1</b>. Os valores aceitam decimais (ex: 0.05).
				</div>
			</div>

			<div className="xp-section-header">
				<h3 className="xp-section-title">Ações que geram XP</h3>
				<p className="xp-section-desc">
					Quanto XP o usuário ganha ao realizar cada ação reconhecida pelo sistema.
				</p>
			</div>

			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Ação</th>
							<th>Descrição</th>
							<th>XP</th>
							<th>Ações</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={4} className="xp-table-empty">
									Carregando...
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={4} className="xp-table-empty">
									Nenhuma configuração encontrada
								</td>
							</tr>
						) : (
							rows.map((config) => (
								<tr key={config.id}>
									<td>
										{editingId === config.id ? (
											<input
												className="form-input"
												style={{ width: "100%", minWidth: "180px" }}
												value={editValues.label}
												onChange={(e) => setEditValues({ ...editValues, label: e.target.value })}
											/>
										) : (
											<b className="xp-edit-label">{config.label}</b>
										)}
									</td>
									<td>
										{editingId === config.id ? (
											<input
												className="form-input"
												style={{ width: "100%", minWidth: "200px" }}
												value={editValues.description}
												placeholder="Descrição..."
												onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
											/>
										) : (
											<span className="xp-edit-desc">{config.description || "—"}</span>
										)}
									</td>
									<td>
										{editingId === config.id ? (
											<input
												className="form-input"
												type="number"
												step="0.01"
												min="0"
												style={{ width: "100px" }}
												value={editValues.points}
												onChange={(e) => setEditValues({ ...editValues, points: e.target.value })}
											/>
										) : (
											<>
												<b className="xp-edit-val">{config.points}</b>
												{config.isDefault && <span className="xp-default-badge">padrão</span>}
											</>
										)}
									</td>
									<td>
										{editingId === config.id ? (
											<div className="xp-edit-actions">
												<button className="btn-primary xp-edit-btn" onClick={() => handleSave(config.action)}>
													Salvar
												</button>
												<button className="btn-secondary xp-edit-btn" onClick={() => setEditingId(null)}>
													Cancelar
												</button>
											</div>
										) : (
											<ActionMenu
												align="right"
												items={[
													{
														label: config.isDefault ? "Configurar" : "Editar",
														icon: "icon-pencil",
														onClick: () => handleEdit(config),
													},
													...(!config.isDefault
														? [
																{
																	label: "Excluir",
																	icon: "icon-trash-2",
																	variant: "danger" as const,
																	onClick: () => handleDelete(config),
																	disabled: deletingAction === config.action,
																},
															]
														: []),
												]}
											/>
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			<div className="xp-section-header xp-section-header-row">
				<div>
					<h3 className="xp-section-title">Níveis por XP acumulado</h3>
					<p className="xp-section-desc">
						Faixas de XP que definem o nível exibido para cada usuário. O XP mínimo de um nível deve ser maior que
						o do nível anterior. Sem níveis configurados, vale a fórmula linear (Nível = XP ÷ {xpPerLevel} + 1).
					</p>
				</div>
				<button
					className="btn-primary"
					onClick={() => {
						setShowNewLevel((v) => !v);
						if (!newLevelXp) setNewLevelXp(String(suggestedLevelXp));
					}}
				>
					+ Novo Nível
				</button>
			</div>

			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Nível</th>
							<th>XP mínimo</th>
							<th>Descrição</th>
							<th>Ações</th>
						</tr>
					</thead>
					<tbody>
						{!hasLevel1 && (
							<tr>
								<td>
									<span className="xp-level-badge">Nível 1</span>
								</td>
								<td>
									<b className="xp-edit-val">0</b>
								</td>
								<td>
									<span className="xp-edit-desc">Nível inicial — todos os usuários começam aqui</span>
								</td>
								<td>
									<span className="xp-edit-desc">—</span>
								</td>
							</tr>
						)}
						{levelRows.map((row) => (
							<tr key={row.id}>
								<td>
									<span className="xp-level-badge">Nível {row.level}</span>
								</td>
								<td>
									{editingLevelId === row.id ? (
										<input
											className="form-input"
											type="number"
											step="0.01"
											min="0"
											style={{ width: "100px" }}
											value={editLevelXp}
											onChange={(e) => setEditLevelXp(e.target.value)}
										/>
									) : (
										<b className="xp-edit-val">{row.points}</b>
									)}
								</td>
								<td>
									<span className="xp-edit-desc">{row.description || `Requer ${row.points} XP acumulados`}</span>
								</td>
								<td>
									{editingLevelId === row.id ? (
										<div className="xp-edit-actions">
											<button className="btn-primary xp-edit-btn" onClick={() => handleSaveLevel(row)}>
												Salvar
											</button>
											<button className="btn-secondary xp-edit-btn" onClick={() => setEditingLevelId(null)}>
												Cancelar
											</button>
										</div>
									) : (
										<ActionMenu
											align="right"
											items={[
												{
													label: "Editar XP mínimo",
													icon: "icon-pencil",
													onClick: () => {
														setEditingLevelId(row.id);
														setEditLevelXp(String(row.points));
													},
												},
												{
													label: "Excluir",
													icon: "icon-trash-2",
													variant: "danger",
													onClick: () => handleDeleteLevel(row),
												},
											]}
										/>
									)}
								</td>
							</tr>
						))}
						{showNewLevel && (
							<tr className="xp-level-new-row">
								<td>
									<span className="xp-level-badge xp-level-badge-new">Nível {nextLevel}</span>
								</td>
								<td>
									<input
										className="form-input"
										type="number"
										step="0.01"
										min="0"
										style={{ width: "100px" }}
										placeholder={`Ex: ${suggestedLevelXp}`}
										value={newLevelXp}
										onChange={(e) => setNewLevelXp(e.target.value)}
									/>
								</td>
								<td>
									<span className="xp-edit-desc">
										Novo nível — XP mínimo para alcançar o <b>Nível {nextLevel}</b>
									</span>
								</td>
								<td>
									<div className="xp-edit-actions">
										<button
											className="btn-primary xp-edit-btn"
											disabled={addingLevel || !newLevelXp}
											onClick={handleAddLevel}
										>
											{addingLevel ? "Criando..." : "Criar nível"}
										</button>
										<button
											className="btn-secondary xp-edit-btn"
											disabled={addingLevel}
											onClick={() => {
												setShowNewLevel(false);
												setNewLevelXp("");
											}}
										>
											Cancelar
										</button>
									</div>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{showCreateModal && (
				<div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
					<div className="modal-card" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h4>Nova Configuração de XP</h4>
							<button className="btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
								<i className="icon-x icon-sm" />
							</button>
						</div>
						<div className="modal-body">
							<div className="form-field">
								<label className="form-label">Ação *</label>
								<select className="form-input" value={newConfig.action} onChange={(e) => handleSelectAction(e.target.value)}>
									<option value="">Selecione a ação...</option>
									{XP_ACTIONS.map((a) => (
										<option key={a.action} value={a.action} disabled={configuredActions.has(a.action)}>
											{a.label} ({a.action}){configuredActions.has(a.action) ? " — já configurada" : ""}
										</option>
									))}
									<option value={CUSTOM_ACTION}>Outra ação personalizada...</option>
								</select>
								<div className="form-hint">
									As ações do catálogo são reconhecidas automaticamente pelo sistema.
								</div>
							</div>
							{isCustomAction && (
								<div className="form-field">
									<label className="form-label">Chave da Ação *</label>
									<input
										className="form-input"
										placeholder="Ex: MY_CUSTOM_ACTION"
										value={customAction}
										onChange={(e) => setCustomAction(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
									/>
									<div className="form-hint">
										Identificador unico (maiúsculas, sem espacos). Ações personalizadas só geram XP se forem emitidas pelo
										código.
									</div>
								</div>
							)}
							<div className="form-field">
								<label className="form-label">Label (nome exibido) *</label>
								<input
									className="form-input"
									placeholder="Ex: Ação Personalizada"
									value={newConfig.label}
									onChange={(e) => setNewConfig({ ...newConfig, label: e.target.value })}
								/>
							</div>
							<div className="form-field">
								<label className="form-label">XP *</label>
								<input
									className="form-input"
									type="number"
									step="0.01"
									min="0"
									placeholder="Ex: 10"
									style={{ width: "120px" }}
									value={newConfig.points}
									onChange={(e) => setNewConfig({ ...newConfig, points: e.target.value })}
								/>
							</div>
							<div className="form-field">
								<label className="form-label">Descrição</label>
								<input
									className="form-input"
									placeholder="Descrição opcional..."
									value={newConfig.description}
									onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
								/>
							</div>
						</div>
						<div className="modal-footer">
							<button className="btn-secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>
								Cancelar
							</button>
							<button className="btn-primary" onClick={handleCreate} disabled={creating}>
								{creating ? "Criando..." : "Criar Configuração"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
