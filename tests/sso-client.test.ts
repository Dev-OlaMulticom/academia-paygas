/**
 * PayGas SSO client — server/lib/paygas-sso-client.ts
 *
 * Tests the validateSSOTicket function by mocking global fetch.
 * Covers: success, 401, 403, 422, 429 (with Retry-After), 502, timeout, network error.
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

// We need to import the module fresh each test to avoid env leaking.
// Use a helper to clear the require cache.
function clearModuleCache() {
	for (const key of Object.keys(require.cache || {})) {
		if (key.includes("paygas-sso-client")) {
			delete require.cache[key];
		}
	}
}

// Mock fetch helper
function mockFetch(status: number, body?: any, headers?: Record<string, string>) {
	const responseHeaders = new Map<string, string>();
	if (headers) {
		for (const [k, v] of Object.entries(headers)) {
			responseHeaders.set(k.toLowerCase(), v);
		}
	}

	const response = {
		status,
		ok: status >= 200 && status < 300,
		headers: {
			get: (name: string) => responseHeaders.get(name.toLowerCase()) ?? null,
		},
		json: async () => body,
	};

	(globalThis as any).fetch = async () => response;
}

function mockFetchError(error: Error) {
	(globalThis as any).fetch = async () => {
		throw error;
	};
}

describe("validateSSOTicket", () => {
	afterEach(() => {
		delete (globalThis as any).fetch;
		clearModuleCache();
	});

	it("throws 503 when env vars are missing", async () => {
		delete process.env.PAYGAS_API_URL;
		delete process.env.PAYGAS_API_CHAVE;
		delete process.env.PAYGAS_API_SECRET;
		clearModuleCache();

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("some-ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 503);
				return true;
			},
		);
	});

	it("returns data on success", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave123";
		process.env.PAYGAS_API_SECRET = "secret456";
		clearModuleCache();

		// Real PayGas contract: { success, data: { sub, ..., estabelecimento, marketplace } }
		const mockData = {
			success: true,
			data: {
				sub: "user-sub-123",
				nome: "João Silva",
				email: "joao@test.com",
				telefone: "11999999999",
				cpf: "12345678901",
				perfil: "administrador",
				perfil_rotulo: "Administrador do estabelecimento",
				setor: "administrador",
				estabelecimento: { id: 2, nome: "Posto Carvoeiro 1", cnpj: "54319411000173" },
				marketplace: { id: 8, nome: "Posto Carvoeiro" },
				retorno_url: "https://app.paygas.com.br/",
			},
		};
		mockFetch(200, mockData);

		const { validateSSOTicket } = require("../server/lib/paygas-sso-client");
		const result = await validateSSOTicket("valid-ticket");

		assert.equal(result.success, true);
		assert.equal(result.sub, "user-sub-123");
		assert.equal(result.nome, "João Silva");
		assert.equal(result.email, "joao@test.com");
		assert.equal(result.telefone, "11999999999");
		assert.equal(result.cpf, "12345678901");
		assert.equal(result.perfil, "administrador");
		assert.equal(result.perfilRotulo, "Administrador do estabelecimento");
		assert.equal(result.setor, "administrador");
		assert.equal(result.estabelecimentoId, "2");
		assert.equal(result.marketplaceId, "8");
		assert.equal(result.retornoUrl, "https://app.paygas.com.br/");
	});

	it("throws 401 on authentication failure", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "bad";
		process.env.PAYGAS_API_SECRET = "bad";
		clearModuleCache();

		mockFetch(401, { error: "Unauthorized" });

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 401);
				return true;
			},
		);
	});

	it("throws 403 on access denied", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		mockFetch(403, { error: "Forbidden" });

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 403);
				return true;
			},
		);
	});

	it("throws 422 on expired/used ticket", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		mockFetch(422, { error: "Ticket expired" });

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("expired-ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 422);
				assert.match(err.message, /expirado/i);
				return true;
			},
		);
	});

	it("throws 429 with Retry-After header", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		mockFetch(429, { error: "Rate limited" }, { "Retry-After": "30" });

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 429);
				assert.equal(err.retryAfter, 30);
				return true;
			},
		);
	});

	it("throws 429 with default retryAfter when header missing", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		mockFetch(429, { error: "Rate limited" });

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 429);
				assert.equal(err.retryAfter, 60);
				return true;
			},
		);
	});

	it("throws 502 on unexpected HTTP error", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		mockFetch(500, { error: "Internal error" });

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 502);
				return true;
			},
		);
	});

	it("throws 504 on network timeout", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		const abortError = new Error("The operation was aborted");
		abortError.name = "AbortError";
		mockFetchError(abortError);

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 504);
				return true;
			},
		);
	});

	it("throws 502 on network error", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		mockFetchError(new Error("ECONNREFUSED"));

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 502);
				return true;
			},
		);
	});

	it("throws 422 when response has success=false", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		mockFetch(200, { success: false });

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 422);
				return true;
			},
		);
	});

	it("throws 422 when response is missing sub", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		mockFetch(200, { success: true, data: { nome: "Test" } });

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 422);
				return true;
			},
		);
	});

	it("throws 422 with the API error message for expired/used tickets", async () => {
		process.env.PAYGAS_API_URL = "https://api.test.com/v1";
		process.env.PAYGAS_API_CHAVE = "chave";
		process.env.PAYGAS_API_SECRET = "secret";
		clearModuleCache();

		mockFetch(422, {
			success: false,
			error: { code: "unprocessable", message: "Este ticket já foi utilizado. Cada acesso gera um ticket novo." },
		});

		const { validateSSOTicket, PayGasSSOError } = require("../server/lib/paygas-sso-client");
		await assert.rejects(
			() => validateSSOTicket("used-ticket"),
			(err: PayGasSSOError) => {
				assert.equal(err.status, 422);
				assert.match(err.message, /já foi utilizado/);
				return true;
			},
		);
	});
});
