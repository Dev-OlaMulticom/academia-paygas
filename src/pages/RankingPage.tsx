import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";

const MEDALS = ["🥇", "🥈", "🥉"];

export function RankingPage() {
	const { user } = useAuth();
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api
			.getGamificationLeaderboard()
			.then(setData)
			.catch(() => setData([]))
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div>
				<div className="page-header">
					<div>
						<div className="page-title">Ranking Nacional 🥇</div>
						<div className="page-subtitle">Carregando...</div>
					</div>
				</div>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div>
				<div className="page-header">
					<div>
						<div className="page-title">Ranking Nacional 🥇</div>
						<div className="page-subtitle">Nenhum dado disponível ainda</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="page-header">
				<div>
					<div className="page-title">Ranking Nacional 🥇</div>
					<div className="page-subtitle">Top alunos da Academia PayGas no Brasil</div>
				</div>
			</div>
			<div>
				{data.map((r, i) => {
					const isMe = r.userId === user?.id;
					return (
						<div
							key={r.userId || i}
							className={`ranking-item ${isMe ? "me" : ""}`}
							style={{
								background: isMe ? "var(--pg-orange-lt)" : "#fff",
								border: `1px solid ${isMe ? "var(--pg-orange)" : "var(--gray-200)"}`,
							}}
						>
							<div
								className="rank-pos"
								style={{
									color: ["#F59E0B", "#9CA3AF", "#CD7F32"][i] || "var(--gray-500)",
									fontSize: i < 3 ? "20px" : "16px",
								}}
							>
								{MEDALS[i] || `#${i + 1}`}
							</div>
							<div className="rank-avatar" style={{ background: r.avatar || "var(--pg-orange)" }}>
								{r.avatar || r.nome?.charAt(0) || "?"}
							</div>
							<div className="rank-info">
								<b>
									{r.nome}
									{isMe && <span className="rank-you-badge">Você</span>}
								</b>
								<span>
									{r.cargo} · {r.estado}
								</span>
							</div>
							<div className="rank-xp-info">
								<div className="rank-xp">{(r.xp || 0).toLocaleString("pt-BR")}</div>
								<div className="rank-xp-label">XP</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
