import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { KNOWN_ACTIONS } from "../auth/casl/actions";
import { defineAbility } from "../auth/casl/defineAbility";
import logger from "../lib/logger";

function getJWTSecret(): string {
	const secret = process.env.JWT_SECRET;
	if (!secret || secret.length < 32) {
		logger.error("JWT_SECRET is required and must be at least 32 characters");
		process.exit(1);
	}
	return secret;
}

const JWT_SECRET = getJWTSecret();

export interface AuthRequest extends Request {
	userId?: string;
	userRole?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Token não fornecido" });
	}

	const token = authHeader.split(" ")[1];
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; gestorId?: string | null };
		req.userId = decoded.userId;
		req.userRole = decoded.role;
		(req as any).userGestorId = decoded.gestorId || null;
		next();
	} catch {
		return res.status(401).json({ error: "Token inválido" });
	}
}

/**
 * authorize() — role-based or CASL ability-based authorization.
 *
 * Supports two usage patterns:
 *
 * 1. Role-based (backward compatible):
 *    authorize('ADMIN', 'GESTOR')
 *    → checks if user.role is in the allowed roles
 *
 * 2. CASL ability-based (new):
 *    authorize('update', 'User')
 *    → checks if user can perform 'update' on 'User'
 *
 * 3. CASL with conditions:
 *    authorize('update', 'User', { gestorId: req.userId })
 *    → checks with additional conditions
 */
export function authorize(...args: string[]) {
	return async (req: AuthRequest, res: Response, next: NextFunction) => {
		if (!req.userRole || !req.userId) {
			return res.status(403).json({ error: "Sem permissão" });
		}

		// Detect pattern: if first arg is a known CASL action → ability check
		const knownActions = KNOWN_ACTIONS;
		const isAbilityCheck = args.length >= 2 && knownActions.includes(args[0]);

		if (isAbilityCheck) {
			// CASL ability-based authorization
			const action = args[0];
			const subject = args[1];
			const conditions = args[2] ? JSON.parse(args[2]) : undefined;

			const ability = await defineAbility({
				id: req.userId,
				role: req.userRole,
				gestorId: (req as any).userGestorId,
			});

			const permitted = conditions ? ability.can(action, subject, conditions) : ability.can(action, subject);

			if (!permitted) {
				return res.status(403).json({
					error: "Sem permissão",
					required: { action, subject, conditions },
					role: req.userRole,
				});
			}
			// Attach ability to request for downstream use
			(req as any).ability = ability;
			next();
		} else {
			// Role-based authorization (backward compatible)
			if (!args.includes(req.userRole)) {
				return res.status(403).json({ error: "Sem permissão" });
			}
			next();
		}
	};
}

export { JWT_SECRET };
