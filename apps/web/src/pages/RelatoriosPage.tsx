import { useCallback, useEffect, useState } from "react";
import { useAbility } from "../hooks/useAbility";
import type { User } from "../hooks/useAuth";
import { api } from "../lib/api";

interface RelatoriosPageProps {
	user: User;
}

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

const ACTION_LABELS: Record<string, string> = {
	LOGIN: "Acesso",
	MODULE_OPEN: "Abriu Curso",
	LESSON_COMPLETE: "Aula Concluida",
	MODULE_COMPLETE: "Curso Concluido",
	QUIZ_CORRECT: "Quiz Correto",
	QUIZ_PASS: "Quiz Aprovado",
	CERTIFICATE: "Certificado",
};

const ACTION_COLORS: Record<string, string> = {
	LOGIN: "#6366f1",
	MODULE_OPEN: "#8b5cf6",
	LESSON_COMPLETE: "#06b6d4",
	MODULE_COMPLETE: "#10b981",
	QUIZ_CORRECT: "#f59e0b",
	QUIZ_PASS: "#22c55e",
	CERTIFICATE: "#f47c20",
};

export function RelatoriosPage({ user }: RelatoriosPageProps) {
	const { isAdmin, isGestor } = useAbility();
	const [stats, setStats] = useState<any>(null);
	const [leaderboard, setLeaderboard] = useState<any[]>([]);
	const [moduleStats, setModuleStats] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	const loadRelatorios = useCallback(async () => {
		try {
			const [dashboardData, leaderData] = await Promise.all([api.getDashboard(), api.getDashboardLeaderboard()]);
			setStats(dashboardData);
			setLeaderboard(leaderData.users || []);

			const cursos = await api.getCmsModulos();
			const progress = await api.getProgresso();
			const modStats = cursos.map((m: any) => {
				const modProgress = progress.filter((p: any) => p.cursoId === m.id);
				const completed = modProgress.filter((p: any) => p.concluido).length;
				const total = m._count?.aulas || m.aulas?.length || 0;
				return {
					nome: m.titulo,
					concluidos: completed,
					emAndamento: modProgress.length - completed,
					total,
					taxaConclusao: total > 0 ? Math.round((completed / total) * 100) : 0,
				};
			});
			setModuleStats(modStats);
		} catch {
			setStats({ aulasConcluidas: 0, totalQuizzes: 0, totalCertificados: 0, xp: 0 });
			setLeaderboard([]);
			setModuleStats([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadRelatorios();
	}, [loadRelatorios]);

	const handleExportCsv = () => {
		const rows: string[][] = [];
		const headers = ["Curso", "Concluidos", "Em Andamento", "Total Aulas", "Taxa Conclusao (%)"];
		rows.push(headers.map(escapeCsvField));
		for (const mod of moduleStats) {
			rows.push([
				escapeCsvField(mod.nome),
				escapeCsvField(mod.concluidos),
				escapeCsvField(mod.emAndamento),
				escapeCsvField(mod.total),
				escapeCsvField(mod.taxaConclusao),
			]);
		}
		if (leaderboard.length > 0) {
			rows.push([]);
			rows.push(["Ranking XP"]);
			rows.push(["#", "Usuario", "Perfil", "Nivel", "XP"]);
			for (const u of leaderboard) {
				rows.push([
					escapeCsvField(u.rank),
					escapeCsvField(u.nome),
					escapeCsvField(u.role),
					escapeCsvField(`Lv. ${u.level}`),
					escapeCsvField(u.xp),
				]);
			}
		}
		if (stats?.pointsByAction && stats.pointsByAction.length > 0) {
			rows.push([]);
			rows.push(["Pontos por Acao"]);
			rows.push(["Acao", "Total XP", "Quantidade"]);
			for (const item of stats.pointsByAction) {
				rows.push([
					escapeCsvField(ACTION_LABELS[item.action] || item.action),
					escapeCsvField(item.totalPoints),
					escapeCsvField(item.count),
				]);
			}
		}
		const csv = rows.map((r) => r.join(",")).join("\n");
		downloadCsv(`relatorios-${Date.now()}.csv`, csv);
	};

	if (loading) {
		return (
			<div className="page active">
				<div className="page-header">
					<div className="page-title">Carregando...</div>
				</div>
			</div>
		);
	}

	const rankBg = (rank: number) => {
		if (rank === 1) return "#FFD700";
		if (rank === 2) return "#C0C0C0";
		if (rank === 3) return "#CD7F32";
		return "var(--gray-100)";
	};

	return (
		<div className="page active">
			<div className="page-header">
				<div className="page-title">Relatorios</div>
				<div className="cms-header-actions">
					<button className="btn-secondary" onClick={handleExportCsv}>
						<i className="icon-download icon-xs" /> Baixar CSV
					</button>
				</div>
			</div>

			<div className="section-title">Gamificacao</div>
			<div className="cards-grid section-mb-xl">
				{[
					{ val: stats?.xp || 0, label: "XP Total", icon: "icon-zap", bg: "#FEF0E6" },
					{ val: stats?.aulasConcluidas || 0, label: "Aulas Concluidas", icon: "icon-bar-chart-3", bg: "#E6EEF9" },
					{ val: stats?.totalQuizzes || 0, label: "Quizzes Aprovados", icon: "icon-check-circle", bg: "#DCFCE7" },
					{ val: stats?.totalCertificados || 0, label: "Certificados", icon: "icon-award", bg: "#FEF3C7" },
				].map((item, i) => (
					<div key={i} className="stat-info">
						<div className="stat-info-top">
							<div className="stat-card-icon" style={{ background: item.bg }}>
								<i className={`${item.icon} icon-lg`} />
							</div>
							<div className="stat-card-val">{item.val}</div>
						</div>
						<div className="stat-card-label">{item.label}</div>
					</div>
				))}
			</div>

			{stats?.pointsByAction && stats.pointsByAction.length > 0 && (
				<>
					<div className="section-title">Pontos por Acao</div>
					<div className="rel-action-grid">
						{stats.pointsByAction.map((item: any) => (
							<div
								key={item.action}
								className="rel-action-card"
								style={{ borderLeftColor: ACTION_COLORS[item.action] || "#666" }}
							>
								<div className="rel-action-label">{ACTION_LABELS[item.action] || item.action}</div>
								<div className="rel-action-val" style={{ color: ACTION_COLORS[item.action] || "#666" }}>
									{item.totalPoints} XP
								</div>
								<div className="rel-action-count">{item.count}x realizado</div>
							</div>
						))}
					</div>
				</>
			)}

			{(isAdmin || isGestor) && leaderboard.length > 0 && (
				<>
					<div className="section-title">Leaderboard - Ranking de XP</div>
					<div className="table-wrap rel-table-wrap">
						<table>
							<thead>
								<tr>
									<th>#</th>
									<th>Usuario</th>
									<th>Perfil</th>
									<th>Nivel</th>
									<th>XP</th>
								</tr>
							</thead>
							<tbody>
								{leaderboard.map((u: any) => (
									<tr key={u.id} style={{ background: u.id === user?.id ? "#f0f9ff" : undefined }}>
										<td>
											<span
												className={`rel-rank-badge ${u.rank <= 3 ? "top3" : "normal"}`}
												style={{ background: u.rank <= 3 ? rankBg(u.rank) : undefined }}
											>
												{u.rank}
											</span>
										</td>
										<td>
											<b>{u.nome}</b>
										</td>
										<td style={{ color: "var(--gray-500)" }}>{u.role}</td>
										<td>
											<span className="rel-level-badge">Lv. {u.level}</span>
										</td>
										<td>
											<b className="rel-xp-val">{u.xp} XP</b>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}

			<div className="section-title">Desempenho por Curso</div>
			<div className="table-wrap rel-table-wrap">
				<table>
					<thead>
						<tr>
							<th>Curso</th>
							<th>Concluidos</th>
							<th>Em Andamento</th>
							<th>Taxa Conclusao</th>
						</tr>
					</thead>
					<tbody>
						{moduleStats.length > 0 ? (
							moduleStats.map((mod: any, i: number) => (
								<tr key={i}>
									<td>
										<b>{mod.nome}</b>
									</td>
									<td>{mod.concluidos}</td>
									<td>{mod.emAndamento}</td>
									<td>
										<div className="rel-progress-wrap">
											<div className="rel-progress-bar">
												<div
													className={`rel-progress-fill ${mod.taxaConclusao === 100 ? "done" : "partial"}`}
													style={{ width: `${mod.taxaConclusao}%` }}
												/>
											</div>
											<span className="rel-progress-label">{mod.taxaConclusao}%</span>
										</div>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={4} className="rel-empty">
									Nenhum dado de desempenho disponivel
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
