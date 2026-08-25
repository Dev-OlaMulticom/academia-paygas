import type { NextFunction, Request, Response } from "express";
import logger from "../lib/logger";
import { decryptSync, encryptSync, getServerEncryptionKey } from "./encryption-core";

// Re-export for existing consumers (auth route imports getServerEncryptionKey)
export { getServerEncryptionKey };

// Combined middleware for encrypted payloads (Express — kept for legacy routes)
export function encryptedPayload(req: Request, res: Response, next: NextFunction) {
	// Decrypt incoming encrypted body
	if (req.body?.encrypted) {
		try {
			const decrypted = decryptSync(req.body.encrypted);
			req.body = JSON.parse(decrypted);
		} catch {
			return res.status(400).json({ error: "Dados encriptados inválidos" });
		}
	} else if (req.path?.includes("/auth/login") && req.body) {
		// Diagnostic: verify body is intact for login
		const hasFields = !!(req.body.email && req.body.password);
		if (!hasFields) {
			logger.warn("[ENCRYPTION MW] Login body missing email/password:", JSON.stringify(Object.keys(req.body)));
		}
	}

	// Encrypt outgoing response if client requests it
	const originalJson = res.json.bind(res);
	res.json = (body: any) => {
		if (req.headers["x-encrypted"] === "true" && body && typeof body === "object") {
			try {
				const encryptedPayload = encryptSync(JSON.stringify(body));
				return originalJson({ encrypted: encryptedPayload });
			} catch {
				return originalJson(body);
			}
		}
		return originalJson(body);
	};

	next();
}
