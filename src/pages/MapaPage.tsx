import { useEffect, useState } from "react";
import { api } from "../lib/api";

const BAR_COLORS = ["#16A34A", "#F47C20", "#D97706", "#0A2E6E", "#7C3AED"];

export function MapaPage() {
	const [regions, setRegions] = useState<any[]>([]);
	const [municipios, setMunicipios] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([api.getAnalyticsRegions(), api.getAnalyticsMunicipios()])
			.then(([r, m]) => {
				setRegions(r);
				setMunicipios(m);
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div>
				<div className="page-header">
					<div>
						<div className="page-title">Mapa Nacional PayGas</div>
						<div className="page-subtitle">Carregando...</div>
					</div>
				</div>
			</div>
		);
	}

	const total = regions.reduce((a, r) => a + r.users, 0);

	return (
		<div>
			<div className="page-header">
				<div>
					<div className="page-title">Mapa Nacional PayGas</div>
					<div className="page-subtitle">Distribuição de usuários e engajamento por região</div>
				</div>
			</div>

			<div className="cards-grid nat-grid section-mb-xl">
				{regions.map((r, i) => (
					<div key={i} className="region-card">
						<div className="mapa-region-icon">{r.icon}</div>
						<div className="region-count">{r.users.toLocaleString("pt-BR")}</div>
						<div className="region-name">{r.name}</div>
						<div className="region-pct">
							{total > 0 ? Math.round((r.users / total) * 100) : 0}% do Brasil · {r.growth}
						</div>
						<div className="track-prog-bar section-mb">
							<div className="track-prog-fill" style={{ width: `${r.pct}%` }}></div>
						</div>
						<div className="mapa-region-pct">{r.pct}% engajamento</div>
					</div>
				))}
			</div>

			<div className="nat-section section-mb-xl">
				<div className="section-title nat-section-title-lg">Engajamento por Região</div>
				{regions.map((r, i) => (
					<div key={i} className="nat-region-row">
						<div className="nat-region-header mapa-region-header-bold">
							<span>
								{r.icon} {r.name}
							</span>
							<span className="mapa-engajamento-stats">
								{r.pct}% · {r.users.toLocaleString("pt-BR")} usuários ·{" "}
								<span className="mapa-engajamento-growth">{r.growth}</span>
							</span>
						</div>
						<div className="nat-bar">
							<div className="nat-bar-fill" style={{ width: `${r.pct}%`, background: BAR_COLORS[i] }}>
								{r.pct}%
							</div>
						</div>
					</div>
				))}
			</div>

			<div className="nat-section">
				<div className="section-title nat-section-title-lg">Top Municípios</div>
				<div className="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Pos.</th>
								<th>Município</th>
								<th>Postos</th>
								<th>Usuários</th>
								<th>Engajamento</th>
							</tr>
						</thead>
						<tbody>
							{municipios.length === 0 ? (
								<tr>
									<td colSpan={5} className="nat-municipio-empty">
										Nenhum dado disponível
									</td>
								</tr>
							) : (
								municipios.map((m, i) => {
									const maxUsuarios = Math.max(...municipios.map((x) => x.usuarios));
									const pct = maxUsuarios > 0 ? Math.round((m.usuarios / maxUsuarios) * 100) : 0;
									return (
										<tr key={i}>
											<td>
												<b>{m.pos}</b>
											</td>
											<td>
												<b>{m.cidade}</b>
											</td>
											<td>{m.postos}</td>
											<td>{m.usuarios.toLocaleString("pt-BR")}</td>
											<td>
												<div className="progress-cell">
													<div className="progress-mini">
														<div className="progress-mini-fill" style={{ width: `${pct}%` }}></div>
													</div>
													<span>{pct}%</span>
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
