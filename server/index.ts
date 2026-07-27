import "dotenv/config";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import logger from "./lib/logger";
import { encryptedPayload, getServerEncryptionKey } from "./middleware/encryption";
import adminDashboardRoutes from "./routes/admin-dashboard";
import analyticsRoutes from "./routes/analytics";
import authRoutes from "./routes/auth";
import certificatesRoutes from "./routes/certificates";
import cmsRoutes from "./routes/cms";
import conquistasRoutes from "./routes/conquistas";
import dashboardRoutes from "./routes/dashboard";
import docsRoutes from "./routes/docs";
import forumRoutes from "./routes/forum";
import gamificationRoutes from "./routes/gamification";
import importExportRoutes from "./routes/import-export";
import logsRoutes from "./routes/logs";
import modulesRoutes from "./routes/modules";
import notificationsRoutes from "./routes/notifications";
import progressoRoutes from "./routes/progresso";
import publicRoutes from "./routes/public";
import rolePermissionsRoutes from "./routes/role-permissions";
import usuariosRoutes from "./routes/usuarios";
import xpconfigRoutes from "./routes/xpconfig";
import { startHealthChecks } from "./services/db-health";
import { startSyncWorker } from "./services/db-sync";
import { startKeepAlive } from "./services/keepalive";

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(
	helmet({
		frameguard: false,
	}),
);

// CORS configuration — auto-allow localhost in development, restrict to ALLOWED_ORIGINS in production
const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

if (allowedOrigins.length === 0 && !isDev) {
	logger.warn("⚠️  ALLOWED_ORIGINS is not set. Cross-origin requests will be rejected.");
	logger.warn('   Set ALLOWED_ORIGINS in .env (e.g. "https://academia.paygas.com.br")');
}

if (isDev) {
	logger.info("🔓 Development mode: CORS allows all localhost origins (any port)");
}

const corsOptions: cors.CorsOptions = {
	origin: (origin, callback) => {
		// Allow same-origin requests (no Origin header — e.g. server-to-server)
		if (!origin) {
			return callback(null, true);
		}

		// In development: allow ALL localhost/127.0.0.1 origins (any port)
		if (isDev) {
			try {
				const url = new URL(origin);
				if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
					return callback(null, true);
				}
			} catch {
				/* not a valid URL, fall through */
			}
		}

		// In all environments: allow explicitly listed origins
		if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
			return callback(null, true);
		}

		// Reject everything else
		callback(new Error("No permitido por CORS"));
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Encrypted"],
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: "10mb" }));

// Rate limiting global — relaxed in development to avoid false positives
const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: process.env.NODE_ENV === "production" ? 200 : 5000,
	message: { error: "Demasiadas peticiones. Intenta de nuevo en 15 minutos." },
	standardHeaders: true,
	legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Rate limiting estricto para auth
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: process.env.NODE_ENV === "production" ? 10 : 100,
	message: { error: "Demasiados intentos de login. Intenta de nuevo en 15 minutos." },
	standardHeaders: true,
	legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);

// Rate limiting para registro de usuarios (solo POST)
const registerLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: process.env.NODE_ENV === "production" ? 5 : 50, // 5 registrations per hour in prod
	message: { error: "Demasiados registros. Intenta de nuevo en 1 hora." },
	standardHeaders: true,
	legacyHeaders: false,
});
app.use("/api/usuarios", (req, res, next) => {
	if (req.method === "POST") {
		registerLimiter(req, res, next);
	} else {
		next();
	}
});

// Global encryption middleware for all POST/PUT/PATCH
app.use((req, res, next) => {
	if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
		encryptedPayload(req, res, next);
	} else {
		next();
	}
});

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/certificates", certificatesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/progresso", progressoRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/docs", docsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/conquistas", conquistasRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin/modules", modulesRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/xp-config", xpconfigRoutes);
app.use("/api/import-export", importExportRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/role-permissions", rolePermissionsRoutes);

app.get("/api/health", async (_req, res) => {
	const { dbRegistry } = await import("./config/databases");
	const { getLatencyStats } = await import("./services/db-health");
	const { getSyncStats } = await import("./services/db-sync");

	const primary = dbRegistry.getPrimary();
	const healthyCount = dbRegistry.getHealthy().length;
	const totalCount = dbRegistry.getAll().length;
	const registryHealth = dbRegistry.getHealthSummary();
	const latencyStats = getLatencyStats();
	const syncStats = getSyncStats();

	res.json({
		status: healthyCount > 0 ? "ok" : "degraded",
		primary: primary?.name || "unknown",
		databases: {
			registry: registryHealth,
			latency: latencyStats,
		},
		sync: syncStats,
		summary: {
			total: totalCount,
			healthy: healthyCount,
			unhealthy: totalCount - healthyCount,
		},
		nodeEnv: process.env.NODE_ENV || "undefined",
		timestamp: new Date().toISOString(),
	});
});

app.get("/api/config", (req, res) => {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Token não fornecido" });
	}
	try {
		const jwt = require("jsonwebtoken");
		const JWT_SECRET_FALLBACK_FILE = ".jwt-secret";
		let JWT_SECRET = process.env.JWT_SECRET;
		if (!JWT_SECRET || JWT_SECRET.length < 16) {
			try {
				const fs = require("node:fs");
				if (fs.existsSync(JWT_SECRET_FALLBACK_FILE)) {
					const persisted = fs.readFileSync(JWT_SECRET_FALLBACK_FILE, "utf8").trim();
					if (persisted && persisted.length >= 16) JWT_SECRET = persisted;
				}
			} catch {
				/* */
			}
		}
		jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
		res.json({ encryptionKey: getServerEncryptionKey() });
	} catch {
		res.status(401).json({ error: "Token inválido" });
	}
});

// Only start listening when run directly (not when imported by Passenger or test)
if (require.main === module) {
	const certPath = path.resolve(__dirname, "certs");
	const keyFile = path.join(certPath, "key.pem");
	const certFile = path.join(certPath, "cert.pem");

	let server: ReturnType<typeof app.listen>;

	if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
		const httpsOptions = {
			key: fs.readFileSync(keyFile),
			cert: fs.readFileSync(certFile),
		};

		server = https.createServer(httpsOptions, app).listen(PORT, () => {
			logger.info(`🔒 HTTPS Server running on https://localhost:${PORT}`);
		});
	} else {
		server = app.listen(PORT, () => {
			logger.info(`🚀 HTTP Server running on http://localhost:${PORT} (no SSL certs found)`);
		});
	}

	// ─── Graceful Shutdown ──────────────────────────────────
	const shutdown = async (signal: string) => {
		logger.info(`\n${signal} received. Shutting down gracefully...`);
		server.close(async () => {
			try {
				const { stopKeepAlive } = await import("./services/keepalive");
				const { stopHealthChecks } = await import("./services/db-health");
				const { stopSyncWorker } = await import("./services/db-sync");
				stopKeepAlive();
				stopHealthChecks();
				stopSyncWorker();

				const { prisma } = await import("./lib/prisma");
				await prisma.$disconnect();
				logger.info("Database connection closed.");
			} catch {
				/* ignore */
			}
			process.exit(0);
		});
		// Force kill after 10 seconds
		setTimeout(() => {
			logger.error("Forced shutdown after timeout.");
			process.exit(1);
		}, 10000);
	};

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));

	// ─── Uncaught Error Handlers ────────────────────────────
	process.on("uncaughtException", (err) => {
		logger.error("[FATAL] Uncaught Exception:", err);
		process.exit(1);
	});

	process.on("unhandledRejection", (reason) => {
		logger.error("[FATAL] Unhandled Rejection:", reason);
		process.exit(1);
	});

	// Log startup completion
	logger.info(`[${new Date().toISOString()}] Server initialization complete, PID: ${process.pid}`);

	// ─── Start Database Infrastructure Services ──────────────
	// Keep-alive, health checks (with latency metrics) e sync por hash rodam
	// SEMPRE — em dev e em prod. Nao ha mais guarda por NODE_ENV; os free-tiers
	// Supabase/Nhost pausam apos 7 dias de inatividade, e sincronizacao em
	// background garante consistencia entre replicas depois de falhas.
	// Set DB_INFRA_OFF=1 para desativar tudo (ex: testes que usam DB mock).
	const disableInfra = process.env.DB_INFRA_OFF === "1" || process.env.DB_INFRA_OFF === "true";
	if (disableInfra) {
		logger.info("[DB-INFRA] Desativado via DB_INFRA_OFF=1");
	} else {
		// Keep-alive: evita pausa das free-tiers (Supabase/Nhost)
		startKeepAlive();

		// Health checks: monitora latencia, detecta offline/online, dispara sync na recuperacao
		startHealthChecks();

		// Background sync: reconcilia divergencias de dados entre replicas
		startSyncWorker();

		logger.info("[DB-INFRA] keep-alive + health + sync iniciados");
	}
}

export default app;
