import "dotenv/config";
import path from "node:path";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
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
import ssoRoutes from "./routes/sso";
import usuariosRoutes from "./routes/usuarios";
import xpconfigRoutes from "./routes/xpconfig";

const app = express();

// Trust the first proxy in front of the container (ingress/LoadBalancer).
// Required for express-rate-limit to correctly read X-Forwarded-For.
app.set("trust proxy", 1);

// Security headers — disabled for serverless/Vercel compatibility
// helmet 8.2.0 has a known compatibility issue with 'response.pipes' in serverless environments
// See: https://github.com/helmetjs/helmet/issues/2603
// We manually set the required headers instead of using helmet
app.use((_req, res, next) => {
	res.set("X-Content-Type-Options", "nosniff");
	res.set("X-Frame-Options", "DENY");
	res.set("X-XSS-Protection", "1; mode=block");
	res.set("Referrer-Policy", "origin-when-cross-origin");
	res.set(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'",
	);
	if (process.env.NODE_ENV === "production") {
		res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
	}
	next();
});

// CORS configuration — auto-allow localhost in development, restrict to ALLOWED_ORIGINS in production
const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

if (allowedOrigins.length === 0 && !isDev) {
	logger.error("ALLOWED_ORIGINS is required in production");
	process.exit(1);
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
app.use("/api", ssoRoutes);
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
	const { getMigrationStats } = await import("./services/db-migrations");
	const { getRealtimeStats } = await import("./services/db-realtime");

	const primary = dbRegistry.getPrimary();
	const healthyCount = dbRegistry.getHealthy().length;
	const totalCount = dbRegistry.getAll().length;
	const registryHealth = dbRegistry.getHealthSummary();
	const latencyStats = getLatencyStats();
	const syncStats = getSyncStats();
	const migrationStats = getMigrationStats();
	const realtimeStats = getRealtimeStats();

	res.json({
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
});

app.get("/api/config", (req, res) => {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Token não fornecido" });
	}
	try {
		const jwt = require("jsonwebtoken");
		const JWT_SECRET = process.env.JWT_SECRET;
		if (!JWT_SECRET) {
			return res.status(500).json({ error: "Server misconfiguration" });
		}
		jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
		res.json({ encryptionKey: getServerEncryptionKey() });
	} catch {
		res.status(401).json({ error: "Token inválido" });
	}
});

// Minimal health endpoint for Northflank/probes — does not require API auth and avoids dynamic imports.
app.get("/health", async (_req, res) => {
	try {
		const { dbRegistry } = await import("./config/databases");
		const primary = dbRegistry.getPrimary();
		if (!primary?.pool) {
			return res.status(503).json({ status: "error", message: "no database" });
		}
		await primary.pool.query("SELECT 1");
		res.status(200).json({ status: "ok", uptime: process.uptime() });
	} catch (err: any) {
		res.status(503).json({ status: "error", message: err.message });
	}
});

const clientDir = path.join(__dirname, "../client");
app.use(express.static(clientDir));
app.use((req, res, next) => {
	if (req.method !== "GET" || req.path.startsWith("/api")) return next();
	res.sendFile(path.join(clientDir, "index.html"));
});

// Listening, graceful shutdown, and DB infra services are now handled by
// fastify.ts (the Strangler Fig entry point). This file only exports the
// Express app for mounting via @fastify/express.

export default app;
