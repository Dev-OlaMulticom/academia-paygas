import logger from "./logger";

export interface PayGasSSOResponse {
	success: boolean;
	sub: string;
	nome: string;
	email: string;
	telefone?: string;
	cpf?: string;
	perfil?: string;
	perfilRotulo?: string;
	setor?: string;
	estabelecimentoId?: string;
	estabelecimentoNome?: string;
	estabelecimentoCnpj?: string;
	estabelecimentoTipo?: string;
	estabelecimentoCidade?: string;
	estabelecimentoUf?: string;
	estabelecimentoAtivo?: boolean;
	marketplaceId?: string;
	retornoUrl?: string;
}

export interface PayGasSSOResult {
	data: PayGasSSOResponse;
	raw: unknown;
}

export class PayGasSSOError extends Error {
	status: 401 | 403 | 422 | 429 | 502 | 503 | 504;
	retryAfter?: number;
	raw?: unknown;

	constructor(status: PayGasSSOError["status"], message: string, retryAfter?: number, raw?: unknown) {
		super(message);
		this.status = status;
		this.retryAfter = retryAfter;
		this.raw = raw;
	}
}

function getSSOConfig() {
	const baseUrl = (process.env.PAYGAS_API_URL || "").replace(/\/+$/, "");
	const chave = process.env.PAYGAS_API_CHAVE || "";
	const secret = process.env.PAYGAS_API_SECRET || "";
	const timeoutMs = Number(process.env.PAYGAS_API_TIMEOUT_MS) || 10000;
	return { baseUrl, chave, secret, timeoutMs };
}

async function validateSSOTicketInternal(ticket: string): Promise<PayGasSSOResult> {
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
		let apiMessage = "";
		let raw: unknown;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const body: any = await res.json();
			raw = body;
			apiMessage = body?.error?.message || "";
		} catch {
			/* keep default message */
		}
		throw new PayGasSSOError(
			422,
			apiMessage || "Link expirado ou já utilizado. Gere um novo no PayGas.",
			undefined,
			raw,
		);
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

	if (!data?.success) {
		throw new PayGasSSOError(422, "Link expirado ou já utilizado. Gere um novo no PayGas.", undefined, data);
	}

	// The API wraps the user payload under `data`. Fall back to the top level
	// for safety so both shapes are accepted.
	const payload = data?.data && typeof data?.data === "object" ? data.data : data;

	if (!payload?.sub) {
		throw new PayGasSSOError(422, "Link expirado ou já utilizado. Gere um novo no PayGas.", undefined, data);
	}

	return {
		data: {
			success: true,
			sub: payload.sub,
			nome: payload.nome || "",
			email: payload.email || "",
			telefone: payload.telefone,
			cpf: payload.cpf,
			perfil: payload.perfil,
			perfilRotulo: payload.perfil_rotulo,
			setor: payload.setor,
			estabelecimentoId: payload.estabelecimento?.id !== undefined ? String(payload.estabelecimento.id) : undefined,
			estabelecimentoNome: payload.estabelecimento?.nome,
			estabelecimentoCnpj: payload.estabelecimento?.cnpj,
			estabelecimentoTipo: payload.estabelecimento?.tipo,
			estabelecimentoCidade: payload.estabelecimento?.cidade,
			estabelecimentoUf: payload.estabelecimento?.uf,
			estabelecimentoAtivo: payload.estabelecimento?.ativo,
			marketplaceId: payload.marketplace?.id !== undefined ? String(payload.marketplace.id) : undefined,
			retornoUrl: payload.retorno_url,
		},
		raw: data,
	};
}

export async function validateSSOTicket(ticket: string): Promise<PayGasSSOResponse> {
	return (await validateSSOTicketInternal(ticket)).data;
}

export async function validateSSOTicketWithRaw(ticket: string): Promise<PayGasSSOResult> {
	return validateSSOTicketInternal(ticket);
}
