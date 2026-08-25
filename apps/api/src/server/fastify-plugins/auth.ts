import type { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
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

export { JWT_SECRET };

// Augment FastifyRequest with auth fields
declare module "fastify" {
	interface FastifyRequest {
		userId?: string;
		userRole?: string;
		userGestorId?: string | null;
		ability?: any;
	}
}

/**
 * authenticate — Fastify preHandler that verifies the JWT Bearer token.
 * Mirrors the Express `authenticate` middleware.
 *
 * Usage:
 *   fastify.get("/route", { preHandler: [authenticate] }, handler)
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
	const authHeader = request.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		reply.code(401);
		throw new Error("Token não fornecido");
	}

	const token = authHeader.split(" ")[1];
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; gestorId?: string | null };
		request.userId = decoded.userId;
		request.userRole = decoded.role;
		request.userGestorId = decoded.gestorId || null;
	} catch {
		reply.code(401);
		throw new Error("Token inválido");
	}
}

/**
 * authorize — Fastify preHandler factory for role-based or CASL ability-based authorization.
 * Mirrors the Express `authorize(...args)` middleware.
 *
 * Usage (role-based):
 *   fastify.get("/route", { preHandler: [authenticate, authorize("ADMIN", "GESTOR")] }, handler)
 *
 * Usage (CASL ability-based):
 *   fastify.post("/route", { preHandler: [authenticate, authorize("create", "User")] }, handler)
 *
 * Usage (CASL with conditions):
 *   fastify.put("/route", { preHandler: [authenticate, authorize("update", "User", JSON.stringify({...}))] }, handler)
 */
export function authorize(...args: string[]) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		if (!request.userRole || !request.userId) {
			reply.code(403);
			throw new Error("Sem permissão");
		}

		// Detect pattern: if first arg is a known CASL action → ability check
		const isAbilityCheck = args.length >= 2 && KNOWN_ACTIONS.includes(args[0]);

		if (isAbilityCheck) {
			const action = args[0];
			const subject = args[1];
			const conditions = args[2] ? JSON.parse(args[2]) : undefined;

			const ability = await defineAbility({
				id: request.userId,
				role: request.userRole,
				gestorId: request.userGestorId,
			});

			const permitted = conditions ? ability.can(action, subject, conditions) : ability.can(action, subject);

			if (!permitted) {
				reply.code(403);
				throw new Error("Sem permissão");
			}
			request.ability = ability;
		} else {
			// Role-based authorization (backward compatible)
			if (!args.includes(request.userRole)) {
				reply.code(403);
				throw new Error("Sem permissão");
			}
		}
	};
}

const authPlugin: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// Decorate request with auth fields so TypeScript knows they exist
	fastify.decorateRequest("userId", undefined);
	fastify.decorateRequest("userRole", undefined);
	fastify.decorateRequest("userGestorId", undefined);
	fastify.decorateRequest("ability", undefined);
	done();
};

export default fp(authPlugin, { name: "app-auth" });
