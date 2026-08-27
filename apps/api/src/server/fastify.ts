import "dotenv/config";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import authPlugin from "./fastify-plugins/auth";
// Fastify-native plugins (Phase 2 of Strangler Fig migration)
import corsPlugin from "./fastify-plugins/cors";
import encryptionPlugin from "./fastify-plugins/encryption";
import rateLimitPlugin from "./fastify-plugins/rate-limit";
// Phase 4 — remaining routes migrated from Express
import adminDashboardRoutes from "./fastify-routes/admin-dashboard";
// Fastify-native routes (Phase 3 — migrated from Express)
import analyticsRoutes from "./fastify-routes/analytics";
import authRoutes from "./fastify-routes/auth";
import certificatesRoutes from "./fastify-routes/certificates";
import cmsRoutes from "./fastify-routes/cms";
import conquistasRoutes from "./fastify-routes/conquistas";
import dashboardRoutes from "./fastify-routes/dashboard";
import docsRoutes from "./fastify-routes/docs";
import forumRoutes from "./fastify-routes/forum";
import gamificationRoutes from "./fastify-routes/gamification";
import healthRoutes from "./fastify-routes/health";
import importExportRoutes from "./fastify-routes/import-export";
import logsRoutes from "./fastify-routes/logs";
import modulesRoutes from "./fastify-routes/modules";
import notificationsRoutes from "./fastify-routes/notifications";
import progressoRoutes from "./fastify-routes/progresso";
import publicRoutes from "./fastify-routes/public";
import rolePermissionsRoutes from "./fastify-routes/role-permissions";
import ssoRoutes from "./fastify-routes/sso";
import usuariosRoutes from "./fastify-routes/usuarios";
import xpconfigRoutes from "./fastify-routes/xpconfig";
import logger from "./lib/logger";
import { startHealthChecks } from "./services/db-health";
import { startRealtimeSync } from "./services/db-realtime";
import { startSyncWorker } from "./services/db-sync";
import { startKeepAlive } from "./services/keepalive";

const PORT = Number(process.env.PORT) || 3001;

const app = Fastify({
	logger: true,
	trustProxy: true,
});

// Error handler — devuelve JSON como el Express anterior.
// Si un preHandler ya seteo un status code (ej: reply.code(401) antes de throw),
// respeta ese code; si no, usa error.statusCode o 500.
app.setErrorHandler((error: any, _request, reply) => {
	const statusCode = error.statusCode || reply.statusCode || 500;
	// Auth errors (401/403) are expected — log as debug, not error
	if (statusCode === 401 || statusCode === 403) {
		logger.debug(`[FASTIFY ${statusCode}] ${error.message}`);
	} else {
		logger.error("[FASTIFY ERROR]", error);
	}
	reply.code(statusCode).send({ error: error.message || "Erro interno do servidor" });
});

// Security headers via onSend hook (same as Express middleware)
app.addHook("onSend", async (_request, reply, _payload) => {
	reply.header("X-Content-Type-Options", "nosniff");
	reply.header("X-Frame-Options", "DENY");
	reply.header("X-XSS-Protection", "1; mode=block");
	reply.header("Referrer-Policy", "origin-when-cross-origin");
	reply.header(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.google.com https://www.youtube.com; frame-src 'self' https://www.youtube.com https://*.youtube.com https://drive.google.com https://docs.google.com https://*.google.com; frame-ancestors 'none'",
	);
	reply.header(
		"Permissions-Policy",
		"fullscreen=*, picture-in-picture=*, accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
	);
	if (process.env.NODE_ENV === "production") {
		reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
	}
});

// Log memory usage every 60s
function startMemoryLogging(): void {
	setInterval(() => {
		const mu = process.memoryUsage();
		logger.info(`[MEM] rss=${mu.rss} heapUsed=${mu.heapUsed} external=${mu.external}`);
	}, 60_000);
}

const start = async () => {
	try {
		// ─── Register Fastify-native plugins (before Express mount) ───
		// These apply to ALL routes: native Fastify routes AND the Express fallback.
		await app.register(corsPlugin);
		await app.register(rateLimitPlugin);
		await app.register(authPlugin);
		await app.register(encryptionPlugin);

		// ─── Register Fastify-native routes (before Express mount) ───
		// These take precedence over the Express fallback.
		await app.register(publicRoutes, { prefix: "/api/public" });
		await app.register(docsRoutes, { prefix: "/api/docs" });
		await app.register(analyticsRoutes, { prefix: "/api/analytics" });
		await app.register(gamificationRoutes, { prefix: "/api/gamification" });
		await app.register(xpconfigRoutes, { prefix: "/api/xp-config" });
		await app.register(conquistasRoutes, { prefix: "/api/conquistas" });
		await app.register(certificatesRoutes, { prefix: "/api/certificates" });
		await app.register(cmsRoutes, { prefix: "/api/cms" });
		await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
		await app.register(forumRoutes, { prefix: "/api/forum" });
		await app.register(logsRoutes, { prefix: "/api/logs" });
		await app.register(modulesRoutes, { prefix: "/api/admin/modules" });
		await app.register(notificationsRoutes, { prefix: "/api/notifications" });
		await app.register(progressoRoutes, { prefix: "/api/progresso" });
		await app.register(rolePermissionsRoutes, { prefix: "/api/role-permissions" });
		await app.register(usuariosRoutes, { prefix: "/api/usuarios" });
		// Phase 4 — remaining Express routes migrated to Fastify
		await app.register(authRoutes, { prefix: "/api/auth" });
		await app.register(ssoRoutes, { prefix: "/api" });
		await app.register(adminDashboardRoutes, { prefix: "/api/admin/dashboard" });
		await app.register(healthRoutes);
		// Phase 5 — last Express route migrated; bodyLimit 10mb for large CSV payloads
		await app.register(
			async (importExportScope) => {
				await importExportScope.register(importExportRoutes, { prefix: "/api/import-export" });
			},
			{ bodyLimit: 10 * 1024 * 1024 },
		);

		// ─── Frontend SPA (restaura el comportamiento del Express legacy) ───
		// Sirve el build de Vite y hace fallback a index.html para los GET que
		// no son /api (deep links del React Router). Sin esto, GET / responde
		// 404 "Route GET:/ not found" cuando nginx/proxy manda todo al Node.
		const clientDirCandidates = [
			path.resolve(__dirname, "../client"), // bundle Docker: dist/server -> dist/client
			path.resolve(process.cwd(), "dist"), // deploy VPS: <app>/dist con index.html en la raíz
		];
		const clientDir = clientDirCandidates.find((dir) => fs.existsSync(path.join(dir, "index.html")));

		if (clientDir) {
			await app.register(fastifyStatic, {
				root: clientDir,
				prefix: "/",
				index: "index.html",
				setHeaders: (reply, filePath) => {
					const parts = filePath.split(path.sep);
					if (parts.includes("assets")) {
						reply.header("Cache-Control", "public, max-age=31536000, immutable");
					} else if (parts[parts.length - 1]?.endsWith(".html")) {
						reply.header("Cache-Control", "no-cache");
					}
				},
			});

			app.setNotFoundHandler((request, reply) => {
				const url = request.raw.url || "/";
				if ((request.method === "GET" || request.method === "HEAD") && !url.startsWith("/api")) {
					reply.header("Cache-Control", "no-cache");
					return reply.sendFile("index.html");
				}
				return reply.code(404).send({
					message: `Route ${request.method}:${url} not found`,
					error: "Not Found",
					statusCode: 404,
				});
			});
			logger.info(`[STATIC] SPA servido desde ${clientDir}`);
		} else {
			logger.warn("[STATIC] No se encontro el build del frontend (dist/client o dist); GET / respondera 404");
		}

		// ─── Strangler Fig complete ───
		// All routes are now Fastify-native; the legacy Express app was removed.

		const certPath = path.resolve(__dirname, "certs");
		const keyFile = path.join(certPath, "key.pem");
		const certFile = path.join(certPath, "cert.pem");

		let httpServer: any;

		if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
			const httpsOptions = {
				key: fs.readFileSync(keyFile),
				cert: fs.readFileSync(certFile),
			};
			httpServer = https.createServer(httpsOptions, app.server as any).listen(PORT, () => {
				logger.info(`🔒 HTTPS Server running on https://localhost:${PORT}`);
				startMemoryLogging();
			});
		} else {
			await app.listen({ port: PORT, host: "0.0.0.0" });
			httpServer = app.server;
			logger.info(`🚀 HTTP Server running on http://localhost:${PORT} (no SSL certs found)`);
			startMemoryLogging();
		}

		// Graceful shutdown
		const shutdown = async (signal: string) => {
			logger.info(`\n${signal} received. Shutting down gracefully...`);
			try {
				const { stopKeepAlive } = await import("./services/keepalive");
				const { stopHealthChecks } = await import("./services/db-health");
				const { stopSyncWorker } = await import("./services/db-sync");
				const { stopRealtimeSync } = await import("./services/db-realtime");
				stopKeepAlive();
				stopHealthChecks();
				stopSyncWorker();
				stopRealtimeSync();
			} catch {
				/* ignore */
			}
			try {
				if (httpServer?.close) await new Promise<void>((resolve) => httpServer.close(() => resolve()));
				await app.close();
			} catch {
				/* ignore */
			}
			process.exit(0);
		};

		process.on("SIGTERM", (s) => shutdown(String(s)));
		process.on("SIGINT", (s) => shutdown(String(s)));
		process.on("uncaughtException", (err) => {
			logger.error("[FATAL] Uncaught Exception:", err);
			process.exit(1);
		});
		process.on("unhandledRejection", (reason) => {
			logger.error("[FATAL] Unhandled Rejection:", reason);
			process.exit(1);
		});

		logger.info(`[${new Date().toISOString()}] Server initialization complete, PID: ${process.pid}`);

		// ─── Start Database Infrastructure Services ──────────────
		const disableInfra = process.env.DB_INFRA_OFF === "1" || process.env.DB_INFRA_OFF === "true";
		const microMode = process.env.MICRO_MODE === "1";
		if (disableInfra) {
			logger.info("[DB-INFRA] Desativado via DB_INFRA_OFF=1");
		} else if (microMode) {
			logger.info("[DB-INFRA] MICRO_MODE ativo: health (60s) + keep-alive");
			startHealthChecks();
			startKeepAlive();
		} else {
			startKeepAlive();
			startHealthChecks();
			startSyncWorker();
			startRealtimeSync();
			if (process.env.MIGRATIONS_SYNC_OFF === "1") {
				logger.info("[DB-INFRA] MIGRATIONS_SYNC_OFF=1: sync de migrations omitido");
			} else {
				void (async () => {
					try {
						await new Promise((r) => setTimeout(r, 8000));
						const { triggerMigrationSync } = await import("./services/db-migrations");
						await triggerMigrationSync();
						logger.info("[DB-INFRA] sync de migrations concluido");
					} catch (err: any) {
						logger.warn(`[DB-INFRA] sync de migrations falhou no startup: ${err?.message || err}`);
					}
				})();
			}
			logger.info("[DB-INFRA] keep-alive + health + sync + migrations iniciados");
		}
	} catch (err: any) {
		logger.error(err);
		process.exit(1);
	}
};

start();
