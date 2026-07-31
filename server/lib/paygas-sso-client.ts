import logger from "./logger";

export interface PayGasSSOResponse {
	success: boolean;
	sub: string;
	nome: string;
	email: string;
	telefone?: string;
	cpf?: string;
	perfil?: string;
	marketplace_id?: string;
	estabelecimento_id?: string;
}

export class PayGasSSOError extends Error {
	status: 401 | 403 | 422 | 429 | 502 | 503 | 504;
	retryAfter?: number;

	constructor(status: PayGasSSOError["status"], message: string, retryAfter?: number) {
		super(message);
		this.status = status;
		this.retryAfter = retryAfter;
	}
}

function getSSOConfig() {
	const baseUrl = (process.env.PAYGAS_API_URL || "").replace(/\/+$/, "");
	const chave = process.env.PAYGAS_API_CHAVE || "";
	const secret = process.env.PAYGAS_API_SECRET || "";
	const timeoutMs = Number(process.env.PAYGAS_API_TIMEOUT_MS) || 10000;
	return { baseUrl, chave, secret, timeoutMs };
}

export async function validateSSOTicket(ticket: string): Promise<PayGasSSOResponse> {
	const { baseUrl, chave, secret, timeoutMs } = getSSOConfig();

	if (!baseUrl || !chave || !secret) {
		throw new PayGasSSOError(503, "SSO não configurado no servidor.");
	}

	const endpoint = `${baseUrl}/sso/validate`;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	let res: Response;
	try {
		res = await fetch(endpoint, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${chave}:${secret}`,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({ ticket }),
			signal: controller.signal,
		});
	} catch (err: any) {
		clearTimeout(timeoutId);
		if (err?.name === "AbortError") {
			throw new PayGasSSOError(504, "Servidor SSO não respondeu a tempo.");
		}
		throw new PayGasSSOError(502, `Servidor SSO inacessível: ${err?.message || "erro desconhecido"}`);
	}
	clearTimeout(timeoutId);

	if (res.status === 401) {
		throw new PayGasSSOError(401, "Credenciais do servidor SSO inválidas.");
	}
	if (res.status === 403) {
		throw new PayGasSSOError(403, "Acesso negado pelo servidor SSO.");
	}
	if (res.status === 422) {
		throw new PayGasSSOError(422, "Link expirado ou já utilizado. Gere um novo no PayGas.");
	}
	if (res.status === 429) {
		const retryAfterHeader = res.headers.get("Retry-After");
		const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : 60;
		throw new PayGasSSOError(429, `Limite de requisições atingido.`, Number.isFinite(retryAfter) ? retryAfter : 60);
	}
	if (!res.ok) {
		logger.error(`[SSO] Validação falhou: HTTP ${res.status}`);
		throw new PayGasSSOError(502, `Erro inesperado do servidor SSO (HTTP ${res.status}).`);
	}

	let data: any;
	try {
		data = await res.json();
	} catch {
		throw new PayGasSSOError(502, "Servidor SSO retornou resposta inválida.");
	}

	if (!data?.success || !data?.sub) {
		throw new PayGasSSOError(422, "Link expirado ou já utilizado. Gere um novo no PayGas.");
	}

	return {
		success: true,
		sub: data.sub,
		nome: data.nome || "",
		email: data.email || "",
		telefone: data.telefone,
		cpf: data.cpf,
		perfil: data.perfil,
		marketplace_id: data.marketplace_id,
		estabelecimento_id: data.estabelecimento_id,
	};
}
