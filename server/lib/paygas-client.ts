/**
 * PayGas external API client (Acesso PayGas flow).
 *
 * Provides a single function to verify an employee by CPF or Email via the
 * external PayGas API. Returns a normalised shape that the route handler
 * maps to a User record (existing or auto-created as ATENDENTE).
 *
 * Configuration (see .env.example):
 *   PAYGAS_API_URL       — base URL (e.g. https://api-paygas.example.com/v1)
 *   PAYGAS_API_KEY       — bearer token / api key
 *   PAYGAS_API_TIMEOUT_MS — request timeout, default 10000
 *
 * NOTE: The exact contract (path, headers, response shape) is a TODO and
 * must be supplied by the PayGas team. The implementation below defines a
 * reasonable default and a fallback so the route returns a clear error
 * when not configured.
 */
export interface PayGasLookupInput {
	cpf?: string;
	email?: string;
}

export interface PayGasEmployee {
	name: string;
	email: string;
	cpf: string;
}

export interface PayGasLookupResult {
	exists: boolean;
	employee?: PayGasEmployee;
	reason?: string;
}

export class PayGasApiError extends Error {
	code:
		| "PAYGAS_API_NOT_CONFIGURED"
		| "PAYGAS_API_TIMEOUT"
		| "PAYGAS_API_UPSTREAM"
		| "PAYGAS_API_BAD_RESPONSE"
		| "PAYGAS_API_NOT_FOUND";
	constructor(code: PayGasApiError["code"], message: string) {
		super(message);
		this.code = code;
	}
}

function getConfig() {
	const baseUrl = (process.env.PAYGAS_API_URL || "").replace(/\/+$/, "");
	const apiKey = process.env.PAYGAS_API_KEY || "";
	const timeoutMs = Number(process.env.PAYGAS_API_TIMEOUT_MS) || 10000;
	return { baseUrl, apiKey, timeoutMs };
}

function buildEndpoint(input: PayGasLookupInput, baseUrl: string): string {
	// Default path used by this stub. Update when PayGas team supplies the
	// real endpoint contract.
	const params = new URLSearchParams();
	if (input.cpf) params.set("cpf", input.cpf);
	if (input.email) params.set("email", input.email);
	return `${baseUrl}/employees/lookup?${params.toString()}`;
}

/**
 * Lookup an employee in the external PayGas API.
 *
 * TODO: replace `buildEndpoint` and `normalize` when the real API contract
 * is provided.
 */
export async function lookupPayGasEmployee(input: PayGasLookupInput): Promise<PayGasLookupResult> {
	const { baseUrl, apiKey, timeoutMs } = getConfig();

	if (!baseUrl || !apiKey) {
		throw new PayGasApiError(
			"PAYGAS_API_NOT_CONFIGURED",
			"External PayGas API is not configured. Set PAYGAS_API_URL and PAYGAS_API_KEY in .env",
		);
	}

	const endpoint = buildEndpoint(input, baseUrl);
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	let res: Response;
	try {
		res = await fetch(endpoint, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				Accept: "application/json",
			},
			signal: controller.signal,
		});
	} catch (err: any) {
		clearTimeout(timeoutId);
		if (err?.name === "AbortError") {
			throw new PayGasApiError("PAYGAS_API_TIMEOUT", "External PayGas API timed out");
		}
		throw new PayGasApiError(
			"PAYGAS_API_UPSTREAM",
			`External PayGas API unreachable: ${err?.message || "unknown error"}`,
		);
	}
	clearTimeout(timeoutId);

	if (res.status === 404) {
		return { exists: false };
	}

	if (!res.ok) {
		throw new PayGasApiError("PAYGAS_API_UPSTREAM", `External PayGas API returned HTTP ${res.status}`);
	}

	let data: any;
	try {
		data = await res.json();
	} catch {
		throw new PayGasApiError("PAYGAS_API_BAD_RESPONSE", "External PayGas API returned non-JSON body");
	}

	// Normalised response. The shape below is the requested contract; adjust
	// field names if/when the real API differs.
	const employee: PayGasEmployee | undefined = data?.employee ?? data;
	if (!employee?.email || !employee?.name || !employee?.cpf) {
		throw new PayGasApiError(
			"PAYGAS_API_BAD_RESPONSE",
			"External PayGas API response missing required fields (name/email/cpf)",
		);
	}

	return { exists: true, employee };
}

/**
 * Generate a 10-character temporary password (alphanumeric).
 * Long enough to be safe, short enough to communicate via email.
 */
export function generateTemporaryPassword(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
	let out = "";
	const bytes = require("node:crypto").randomBytes(10);
	for (let i = 0; i < 10; i++) {
		out += chars[bytes[i] % chars.length];
	}
	return out;
}

/**
 * Strip non-digits and ensure 11-digit CPF format (Brazilian standard).
 * Returns null if the cleaned value is not a valid 11-digit string.
 */
export function sanitizeCpf(raw: string): string | null {
	const digits = String(raw || "").replace(/\D/g, "");
	return digits.length === 11 ? digits : null;
}

/**
 * Trim, lowercase, and run a basic email regex. Returns null on invalid.
 */
export function sanitizeEmail(raw: string): string | null {
	const value = String(raw || "")
		.trim()
		.toLowerCase();
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
