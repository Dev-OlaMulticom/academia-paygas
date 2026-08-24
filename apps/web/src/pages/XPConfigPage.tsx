import { useCallback, useEffect, useState } from "react";
import { ActionMenu } from "../components/ActionMenu";
import { useConfirm, useToast } from "../components/Toast";
import type { User } from "../hooks/useAuth";
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
}

export function XPConfigPage({ user: _user }: XPConfigPageProps) {
	const { toast } = useToast();
	const { confirm } = useConfirm();
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
			toast("Pontos deve ser um número válido e não negativo", "error");
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
			message: `Realmente deseja excluir a ação de XP "${config.label}" (${config.action})?\n\nEsta ação NÃO pode ser desfeita. Registros históricos de pontos já contabilizados NÃO serão alterados.`,
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

	const handleCreate = async () => {
		const action = newConfig.action.trim();
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
			toast("Pontos deve ser um numero valido e nao negativo", "error");
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
			loadConfigs();
		} catch (err: any) {
			toast(err.message || "Erro ao criar configuracao", "error");
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="page active">
			<div className="page-header">
				<div>
					<div className="page-title">Configuração de Pontos (XP)</div>
					<div className="page-subtitle">Ajuste os pontos acumulados por cada ação na plataforma</div>
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
					<b>Como funciona:</b> Cada vez que um usuário realiza uma ação (login, abrir módulo, ver lição, completar
					lição), ele acumula pontos de XP conforme configurado abaixo. Os pontos são somados automaticamente e o nível
					é calculado com base no total: <b>Nível = XP ÷ 2000 + 1</b>. Os valores podem ser decimais (ex: 0.05).
				</div>
			</div>

			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Ação</th>
							<th>Descrição</th>
							<th>Pontos (XP)</th>
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
						) : configs.length === 0 ? (
							<tr>
								<td colSpan={4} className="xp-table-empty">
									Nenhuma configuração encontrada
								</td>
							</tr>
						) : (
							configs.map((config) => (
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
											<>
												<b className="xp-edit-label">{config.label}</b>
												<div className="xp-edit-action">{config.action}</div>
											</>
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
											<b className="xp-edit-val">{config.points}</b>
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
														label: "Editar",
														icon: "icon-pencil",
														onClick: () => handleEdit(config),
													},
													{
														label: "Excluir",
														icon: "icon-trash-2",
														variant: "danger",
														onClick: () => handleDelete(config),
														disabled: deletingAction === config.action,
													},
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
								<label className="form-label">Chave da Ação *</label>
								<input
									className="form-input"
									placeholder="Ex: MY_CUSTOM_ACTION"
									value={newConfig.action}
									onChange={(e) =>
										setNewConfig({ ...newConfig, action: e.target.value.toUpperCase().replace(/\s+/g, "_") })
									}
								/>
								<div className="form-hint">Identificador unico (maiúsculas, sem espacos)</div>
							</div>
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
								<label className="form-label">Pontos (XP) *</label>
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
