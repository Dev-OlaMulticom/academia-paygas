import type { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import logger from "../lib/logger";
import { decryptSync, encryptSync } from "../middleware/encryption-core";

/**
 * Fastify encryption plugin — mirrors the Express `encryptedPayload` middleware.
 *
 * 1. preHandler: decrypts `request.body.encrypted` → replaces `request.body`
 *    with the decrypted JSON (same as Express middleware).
 * 2. onSend: if `X-Encrypted: true` header is present and the payload is a
 *    JSON object, encrypts it → sends `{ encrypted: "..." }` instead.
 *
 * Only applies to POST/PUT/PATCH (same as Express).
 */
const encryptionPlugin: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	fastify.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
		const method = request.method.toUpperCase();
		if (method !== "POST" && method !== "PUT" && method !== "PATCH") return;

		const body = request.body as any;
		if (body?.encrypted) {
			try {
				const decrypted = decryptSync(body.encrypted);
				request.body = JSON.parse(decrypted);
			} catch {
				reply.code(400);
				throw new Error("Dados encriptados inválidos");
			}
		} else if (request.url?.includes("/auth/login") && body) {
			// Diagnostic: verify body is intact for login (mirrors Express behavior)
			const hasFields = !!(body.email && body.password);
			if (!hasFields) {
				logger.warn("[ENCRYPTION FASTIFY] Login body missing email/password:", JSON.stringify(Object.keys(body)));
			}
		}
	});

	fastify.addHook("onSend", async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
		const method = request.method.toUpperCase();
		if (method !== "POST" && method !== "PUT" && method !== "PATCH") return payload;

		if (request.headers["x-encrypted"] !== "true") return payload;
		if (!payload || typeof payload !== "string") return payload;

		// Only encrypt JSON object responses (not strings, not already-encrypted)
		const trimmed = payload.trimStart();
		if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return payload;

		try {
			const parsed = JSON.parse(payload);
			if (parsed && typeof parsed === "object" && !parsed.encrypted) {
				const encryptedPayload = encryptSync(JSON.stringify(parsed));
				reply.header("Content-Type", "application/json; charset=utf-8");
				return JSON.stringify({ encrypted: encryptedPayload });
			}
		} catch {
			// Not valid JSON — send as-is
		}

		return payload;
	});

	done();
};

export default fp(encryptionPlugin, { name: "app-encryption" });
