import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

interface SsoCallbackPageProps {
	onLogin: (user: any, token: string) => Promise<void>;
}

export function SsoCallbackPage({ onLogin }: SsoCallbackPageProps) {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState<"loading" | "error">("loading");
	const [message, setMessage] = useState("");

	useEffect(() => {
		const token = searchParams.get("token");
		if (!token) {
			setStatus("error");
			setMessage("Token SSO não encontrado. Tente novamente pelo PayGas.");
			return;
		}

		api.setToken(token);
		api
			.getMe()
			.then(async (user: any) => {
				await onLogin(user, token);
				navigate("/", { replace: true });
			})
			.catch(() => {
				setStatus("error");
				setMessage("Falha ao autenticar. O token pode ter expirado. Tente novamente.");
			});
	}, [searchParams, onLogin, navigate]);

	return (
		<div className="verify-page">
			<div className="verify-card">
				{status === "loading" && (
					<>
						<div className="verify-icon">⏳</div>
						<h2 className="verify-title loading">Autenticando...</h2>
						<p className="verify-desc">Aguarde enquanto processamos seu acesso.</p>
					</>
				)}

				{status === "error" && (
					<>
						<div className="verify-icon">❌</div>
						<h2 className="verify-title error">Erro no SSO</h2>
						<p className="verify-desc">{message}</p>
						<button className="verify-btn-secondary" onClick={() => navigate("/login")}>
							Voltar ao Login
						</button>
					</>
				)}
			</div>
		</div>
	);
}
