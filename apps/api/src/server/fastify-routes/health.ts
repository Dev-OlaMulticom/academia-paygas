import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../fastify-plugins/auth";
import { getServerEncryptionKey } from "../middleware/encryption";

/**
 * Health & config routes — migrated from Express routes/index.ts inline handlers.
 * GET /health — minimal liveness probe (no auth, no dynamic imports)
 * GET /api/health — detailed health with DB stats
 * GET /api/config — encryption key (requires auth)
 */
const healthRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// Minimal liveness probe for Northflank/probes — no auth, avoids dynamic imports
	fastify.get("/health", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { dbRegistry } = await import("../config/databases");
			const primary = dbRegistry.getPrimary();
			if (!primary?.pool) {
				return reply.code(503).send({ status: "error", message: "no database" });
			}
			await primary.pool.query("SELECT 1");
			return reply.code(200).send({ status: "ok", uptime: process.uptime() });
		} catch (err: any) {
			return reply.code(503).send({ status: "error", message: err.message });
		}
	});

	// Detailed health with DB stats
	fastify.get("/api/health", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { dbRegistry } = await import("../config/databases");
			const { getLatencyStats } = await import("../services/db-health");
			const { getSyncStats } = await import("../services/db-sync");
			const { getMigrationStats } = await import("../services/db-migrations");
			const { getRealtimeStats } = await import("../services/db-realtime");

			const primary = dbRegistry.getPrimary();
			const healthyCount = dbRegistry.getHealthy().length;
			const totalCount = dbRegistry.getAll().length;
			const registryHealth = dbRegistry.getHealthSummary();
			const latencyStats = getLatencyStats();
			const syncStats = getSyncStats();
			const migrationStats = getMigrationStats();
			const realtimeStats = getRealtimeStats();

			return reply.send({
				status: healthyCount > 0 ? "ok" : "degraded",
				primary: primary?.name || "unknown",
				databases: {
					registry: registryHealth,
					latency: latencyStats,
				},
				sync: syncStats,
				realtime: realtimeStats,
				migrations: migrationStats,
				summary: {
					total: totalCount,
					healthy: healthyCount,
					unhealthy: totalCount - healthyCount,
				},
				nodeEnv: process.env.NODE_ENV || "undefined",
				timestamp: new Date().toISOString(),
			});
		} catch (err: any) {
			return reply.code(500).send({ error: err.message });
		}
	});

	// Encryption config endpoint (requires auth)
	fastify.get(
		"/api/config",
		{
			preHandler: [
				async (request: FastifyRequest, reply: FastifyReply) => {
					const authHeader = request.headers.authorization;
					if (!authHeader?.startsWith("Bearer ")) {
						reply.code(401);
						throw new Error("Token não fornecido");
					}
					const token = authHeader.split(" ")[1];
					try {
						jwt.verify(token, JWT_SECRET);
					} catch {
						reply.code(401);
						throw new Error("Token inválido");
					}
				},
			],
		},
		async (_request: FastifyRequest, reply: FastifyReply) => {
			return reply.send({ encryptionKey: getServerEncryptionKey() });
		},
	);

	done();
};

export default healthRoutes;
