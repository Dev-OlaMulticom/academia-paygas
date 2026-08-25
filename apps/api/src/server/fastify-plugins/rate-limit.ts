import type { FastifyInstance, FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";

const isProd = process.env.NODE_ENV === "production";

/**
 * Global rate limit — mirrors the Express globalLimiter:
 *   200 req / 15 min in production, 5000 in development.
 *
 * Route-specific limits (auth login, register) are applied via
 * `fastify.register(rateLimit, { max, timeWindow })` in the route plugins.
 */
const rateLimitPlugin: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	fastify.register(import("@fastify/rate-limit"), {
		global: true,
		max: isProd ? 200 : 5000,
		timeWindow: "15 minutes",
		errorResponseBuilder: (_request, context) => ({
			error: "Demasiadas peticiones. Intenta de nuevo en 15 minutos.",
			code: context.statusCode,
		}),
		addHeaders: {
			"x-ratelimit-limit": true,
			"x-ratelimit-remaining": true,
			"x-ratelimit-reset": true,
			"retry-after": true,
		},
	});
	done();
};

export default fp(rateLimitPlugin, { name: "app-rate-limit" });

/**
 * Auth login rate limit — mirrors Express authLimiter:
 *   10 req / 15 min in production, 100 in development.
 */
export const authRateLimitConfig = {
	max: isProd ? 10 : 100,
	timeWindow: "15 minutes",
	errorResponseBuilder: (_request: any, context: any) => ({
		error: "Demasiados intentos de login. Intenta de nuevo en 15 minutos.",
		code: context.statusCode,
	}),
};

/**
 * Register rate limit — mirrors Express registerLimiter:
 *   5 req / 1 hour in production, 50 in development.
 */
export const registerRateLimitConfig = {
	max: isProd ? 5 : 50,
	timeWindow: "1 hour",
	errorResponseBuilder: (_request: any, context: any) => ({
		error: "Demasiados registros. Intenta de nuevo en 1 hora.",
		code: context.statusCode,
	}),
};
