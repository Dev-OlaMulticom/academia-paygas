import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function AnaliticaPage() {
	const [overview, setOverview] = useState<any>(null);
	const [modules, setModules] = useState<any[]>([]);
	const [personas, setPersonas] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([api.getAnalyticsOverview(), api.getAnalyticsModules(), api.getAnalyticsPersonas()])
			.then(([o, m, p]) => {
				setOverview(o);
				setModules(m);
				setPersonas(p);
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div>
				<div className="page-header">
					<div className="page-title">Analytics</div>
				</div>
				<p className="anal-loading">Carregando dados...</p>
			</div>
		);
	}

	return (
		<div>
			<div className="page-header">
				<div className="page-title">Analytics</div>
			</div>

			<div className="cards-grid">
				{[
					{
						icon: "👥",
						val: overview?.totalUsers?.toLocaleString("pt-BR") || "0",
						label: "Usuários Ativos",
						trend: `↑ +${overview?.usersThisMonth || 0} este mês`,
						color: "#E6EEF9",
					},
					{
						icon: "📚",
						val: `${overview?.completionRate || 0}%`,
						label: "Taxa de Conclusão",
						trend: "↑ taxa geral",
						color: "#FEF3C7",
					},
					{
						icon: "🔁",
						val: `${overview?.returnRate || 0}%`,
						label: "Taxa de Retorno",
						trend: "↑ engajamento",
						color: "#DCFCE7",
					},
					{
						icon: "🏆",
						val: overview?.totalCertificates?.toLocaleString("pt-BR") || "0",
						label: "Certificados Emitidos",
						trend: `↑ +${overview?.progressThisMonth || 0} ações`,
						color: "#FEF0E6",
					},
				].map((c, i) => (
					<div key={i} className="stat-card">
						<div className="stat-card-icon" style={{ background: c.color }}>
							{c.icon}
						</div>
						<div className="stat-card-val">{c.val}</div>
						<div className="stat-card-label">{c.label}</div>
						<div className="stat-card-trend trend-up">{c.trend}</div>
					</div>
				))}
			</div>

			<div className="two-col">
				<div>
					<div className="section-title">Módulos Mais Acessados</div>
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Módulo</th>
									<th>Acessos</th>
									<th>Conclusão</th>
								</tr>
							</thead>
							<tbody>
								{modules.length === 0 ? (
									<tr>
										<td colSpan={3} className="anal-table-empty">
											Nenhum dado disponível
										</td>
									</tr>
								) : (
									modules.map((m, i) => (
										<tr key={i}>
											<td>
												<b>{m.titulo}</b>
											</td>
											<td>{m.acessos.toLocaleString("pt-BR")}</td>
											<td>
												<div className="progress-cell">
													<div className="progress-mini">
														<div className="progress-mini-fill" style={{ width: `${m.conclusao}%` }}></div>
													</div>
													{m.conclusao}%
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>

				<div>
					<div className="section-title">Personas Mais Ativas</div>
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Persona</th>
									<th>Usuários</th>
									<th>XP Médio</th>
								</tr>
							</thead>
							<tbody>
								{personas.length === 0 ? (
									<tr>
										<td colSpan={3} className="anal-table-empty">
											Nenhum dado disponível
										</td>
									</tr>
								) : (
									personas.map((p, i) => (
										<tr key={i}>
											<td>{p.persona}</td>
											<td>
												<b>{p.users.toLocaleString("pt-BR")}</b>
											</td>
											<td>
												<b className="anal-xp-val">{p.xp.toLocaleString("pt-BR")}</b>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
