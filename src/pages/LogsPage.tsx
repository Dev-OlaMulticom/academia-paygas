import { useCallback, useEffect, useState } from "react";
import { ActionMenu } from "../components/ActionMenu";
import { AppSelect } from "../components/AppSelect";
import { useConfirm, useToast } from "../components/Toast";
import { ROLE_COLORS } from "../data/constants";
import type { User } from "../hooks/useAuth";
import { api } from "../lib/api";

function downloadCsv(filename: string, csv: string) {
	const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

function escapeCsvField(value: string | number | boolean | null | undefined): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

interface LogsPageProps {
	user: User;
}

interface ActivityLog {
	id: string;
	userId: string;
	acao: string;
	detalhes: string | null;
	createdAt: string;
	user: { id: string; nome: string; email: string; role: string };
}

export function LogsPage({ user: _user }: LogsPageProps) {
	const { toast } = useToast();
	const { confirm } = useConfirm();
	const [logs, setLogs] = useState<ActivityLog[]>([]);
	const [users, setUsers] = useState<any[]>([]);
	const [stats, setStats] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [expandedRow, setExpandedRow] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [bulkDeleting, setBulkDeleting] = useState(false);

	const [filters, setFilters] = useState({
		userId: "",
		acao: "",
		startDate: "",
		endDate: "",
	});

	const loadUsers = useCallback(async () => {
		try {
			const data = await api.getActivityUsers();
			setUsers(data);
		} catch {
			/* */
		}
	}, []);

	const loadStats = useCallback(async () => {
		try {
			const params: any = {};
			if (filters.startDate) params.startDate = filters.startDate;
			if (filters.endDate) params.endDate = filters.endDate;
			const data = await api.getActivityStats(params);
			setStats(data);
		} catch {
			/* */
		}
	}, [filters.startDate, filters.endDate]);

	const loadLogs = useCallback(async () => {
		setLoading(true);
		try {
			const params: any = { page, limit: 50 };
			if (filters.userId) params.userId = filters.userId;
			if (filters.acao) params.acao = filters.acao;
			if (filters.startDate) params.startDate = filters.startDate;
			if (filters.endDate) params.endDate = filters.endDate;

			const result = await api.getActivityLogs(params);
			setLogs(result.data || []);
			setTotal(result.pagination?.total || 0);
			setTotalPages(result.pagination?.totalPages || 1);
		} catch {
			setLogs([]);
		} finally {
			setLoading(false);
		}
	}, [page, filters.userId, filters.acao, filters.startDate, filters.endDate]);

	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	useEffect(() => {
		loadLogs();
		loadStats();
	}, [loadLogs, loadStats]);

	const handleFilterChange = (key: keyof typeof filters, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setPage(1);
	};

	const clearFilters = () => {
		setFilters({ userId: "", acao: "", startDate: "", endDate: "" });
		setPage(1);
	};

	const handleDeleteLog = async (log: ActivityLog) => {
		const ok = await confirm({
			title: "Excluir registro",
			message: "¿Realmente deseas borrar este registro de atividade?\n\nEsta ação NÃO pode ser desfeita.",
			confirmLabel: "Sim, excluir",
			cancelLabel: "Cancelar",
			danger: true,
		});
		if (!ok) return;

		setDeletingId(log.id);
		try {
			await api.deleteActivityLog(log.id);
			toast("Registro excluído!", "success");
			setLogs((prev) => prev.filter((l) => l.id !== log.id));
			if (expandedRow === log.id) setExpandedRow(null);
			loadStats();
			setTotal((t) => Math.max(0, t - 1));
		} catch (err: any) {
			toast(err.message || "Erro ao excluir", "error");
		} finally {
			setDeletingId(null);
		}
	};

	const handleBulkDelete = async () => {
		const hasFilters = Boolean(filters.userId || filters.acao || filters.startDate || filters.endDate);
		if (!hasFilters) {
			toast("Aplique ao menos um filtro antes de excluir registros.", "info");
			return;
		}
		const ok = await confirm({
			title: "Excluir registros filtrados",
			message:
				"¿Realmente deseas borrar TODOS os registros que correspondem aos filtros atuais?\n\nEsta ação NÃO pode ser desfeita.",
			confirmLabel: "Sim, excluir em massa",
			cancelLabel: "Cancelar",
			danger: true,
		});
		if (!ok) return;

		setBulkDeleting(true);
		try {
			const res = await api.bulkDeleteActivityLogs({
				userId: filters.userId || undefined,
				acao: filters.acao || undefined,
				startDate: filters.startDate || undefined,
				endDate: filters.endDate || undefined,
			});
			toast(`${res.deleted} registro(s) excluído(s).`, "success");
			clearFilters();
			loadLogs();
			loadStats();
		} catch (err: any) {
			toast(err.message || "Erro ao excluir registros", "error");
		} finally {
			setBulkDeleting(false);
		}
	};

	const formatDate = (iso: string) => {
		const d = new Date(iso);
		return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
	};

	const roleColor = (role: string) => ROLE_COLORS[role] || ROLE_COLORS.ATENDENTE;

	const handleExportCsv = () => {
		const headers = ["Data", "Usuario", "Email", "Perfil", "Acao", "Detalhes"];
		const rows: string[][] = [headers.map(escapeCsvField)];
		for (const log of logs) {
			rows.push([
				escapeCsvField(formatDate(log.createdAt)),
				escapeCsvField(log.user?.nome),
				escapeCsvField(log.user?.email),
				escapeCsvField(log.user?.role),
				escapeCsvField(log.acao),
				escapeCsvField(log.detalhes),
			]);
		}
		const csv = rows.map((r) => r.join(",")).join("\n");
		downloadCsv(`logs-atividade-${Date.now()}.csv`, csv);
	};

	return (
		<div className="page active">
			<div className="page-header">
				<div className="page-title">Logs de Atividade</div>
				<div className="cms-header-actions">
					<button className="btn-secondary" onClick={handleExportCsv} disabled={logs.length === 0}>
						<i className="icon-download icon-xs" /> Baixar CSV
					</button>
				</div>
			</div>

			{stats && (
				<div className="cards-grid logs-stats-grid">
					<div className="stat-card">
						<div className="stat-card-val logs-stat-val">{stats.totalLogs || 0}</div>
						<div className="stat-card-label">Total de Registros</div>
					</div>
					{stats.byAction?.slice(0, 3).map((a: any, i: number) => (
						<div className="stat-card" key={i}>
							<div className="stat-card-val logs-stat-val-sm">{a.count}</div>
							<div className="stat-card-label logs-stat-label-trunc">{a.acao}</div>
						</div>
					))}
				</div>
			)}

			<div className="logs-filters">
				<div className="section-title logs-filters-title">Filtros</div>
				<div className="logs-filters-grid">
					<div className="form-field">
						<label className="form-label logs-filters-label">Usuário</label>
						<AppSelect
							id="logs-filtro-usuario"
							options={[
								...users.map((u: any) => ({
									value: u.id,
									label: `${u.nome} (${u.email})`,
								})),
							]}
							value={filters.userId || null}
							onChange={(v) => handleFilterChange("userId", v || "")}
							placeholder="Todos"
							isClearable
							isSearchable
						/>
					</div>
					<div className="form-field">
						<label className="form-label logs-filters-label">Ação</label>
						<input
							className="form-input"
							type="text"
							placeholder="Ex: Login, Criar, Quiz..."
							value={filters.acao}
							onChange={(e) => handleFilterChange("acao", e.target.value)}
						/>
					</div>
					<div className="form-field">
						<label className="form-label logs-filters-label">Data Inicial</label>
						<input
							className="form-input"
							type="date"
							value={filters.startDate}
							onChange={(e) => handleFilterChange("startDate", e.target.value)}
						/>
					</div>
					<div className="form-field">
						<label className="form-label logs-filters-label">Data Final</label>
						<input
							className="form-input"
							type="date"
							value={filters.endDate}
							onChange={(e) => handleFilterChange("endDate", e.target.value)}
						/>
					</div>
				</div>
				<div className="logs-filters-actions">
					<button
						className="btn-secondary"
						onClick={() => {
							loadLogs();
							loadStats();
						}}
					>
						Aplicar Filtros
					</button>
					<button className="btn-secondary logs-clear-btn" onClick={clearFilters}>
						Limpar
					</button>
					<button
						className="btn-secondary logs-bulk-delete-btn"
						onClick={handleBulkDelete}
						disabled={bulkDeleting}
						title="Excluir todos os registros que correspondem aos filtros"
					>
						<i className="icon-trash-2 icon-xs" /> Excluir filtrados
					</button>
				</div>
			</div>

			<div className="logs-table-wrap">
				<div className="logs-table-header">
					<b className="logs-table-title">Registros ({total})</b>
					{totalPages > 1 && (
						<div className="logs-table-page">
							<button
								className="btn-secondary logs-page-btn"
								disabled={page <= 1}
								onClick={() => setPage((p) => p - 1)}
							>
								Anterior
							</button>
							<span className="logs-page-info">
								{page} / {totalPages}
							</span>
							<button
								className="btn-secondary logs-page-btn"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => p + 1)}
							>
								Próximo
							</button>
						</div>
					)}
				</div>

				{loading ? (
					<div className="logs-loading">Carregando...</div>
				) : logs.length === 0 ? (
					<div className="logs-empty">Nenhum registro encontrado</div>
				) : (
					<div className="logs-table-scroll">
						<table className="logs-table">
							<thead>
								<tr>
									<th style={{ width: "40px" }}></th>
									<th>Data e Hora</th>
									<th>Usuário</th>
									<th>Role</th>
									<th>Ação</th>
									<th>Detalhes</th>
									<th style={{ width: "60px" }}></th>
								</tr>
							</thead>
							<tbody>
								{logs.map((log) => (
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
											<td className="logs-td-date">{formatDate(log.createdAt)}</td>
											<td>
												<b className="logs-td-user-name">{log.user?.nome || "—"}</b>
												<div className="logs-td-user-email">{log.user?.email}</div>
											</td>
											<td>
												<span className="logs-role-badge" style={{ background: roleColor(log.user?.role || "") }}>
													{log.user?.role}
												</span>
											</td>
											<td className="logs-td-acao">{log.acao}</td>
											<td className="logs-td-detalhes">{log.detalhes || "—"}</td>
											<td onClick={(e) => e.stopPropagation()}>
												<ActionMenu
													align="right"
													items={[
														{
															label: "Excluir",
															icon: "icon-trash-2",
															variant: "danger",
															onClick: () => handleDeleteLog(log),
															disabled: deletingId === log.id,
														},
													]}
												/>
											</td>
										</tr>
										{expandedRow === log.id && (
											<tr key={`${log.id}-detail`} className="row-detail">
												<td colSpan={7}>
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
					</div>
				)}
			</div>

			{stats?.byUser && stats.byUser.length > 0 && (
				<div className="logs-most-active">
					<div className="section-title logs-most-active-title">Usuários Mais Ativos</div>
					<div className="logs-most-active-list">
						{stats.byUser.map((u: any, i: number) => (
							<div key={i} className="logs-most-active-item">
								<span className="logs-most-active-rank">#{i + 1}</span>
								<div className="logs-most-active-info">
									<b className="logs-most-active-name">{u.nome}</b>
									<span className="logs-most-active-email">{u.email}</span>
								</div>
								<span className="logs-role-badge" style={{ background: roleColor(u.role || "") }}>
									{u.role}
								</span>
								<span className="logs-most-active-count">{u.count}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
