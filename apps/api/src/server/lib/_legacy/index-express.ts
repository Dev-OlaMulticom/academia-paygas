import "dotenv/config";
import path from "node:path";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import logger from "./lib/logger";
import { encryptedPayload } from "./middleware/encryption";
import adminDashboardRoutes from "./routes/admin-dashboard";
import authRoutes from "./routes/auth";
import certificatesRoutes from "./routes/certificates";
import cmsRoutes from "./routes/cms";
import dashboardRoutes from "./routes/dashboard";
import forumRoutes from "./routes/forum";
import importExportRoutes from "./routes/import-export";
import logsRoutes from "./routes/logs";
import modulesRoutes from "./routes/modules";
import notificationsRoutes from "./routes/notifications";
import progressoRoutes from "./routes/progresso";
import rolePermissionsRoutes from "./routes/role-permissions";
import ssoRoutes from "./routes/sso";
import usuariosRoutes from "./routes/usuarios";

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
		"default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.google.com https://www.youtube.com; frame-src 'self' https://www.youtube.com https://*.youtube.com https://drive.google.com https://docs.google.com https://*.google.com; frame-ancestors 'none'",
	);
	res.set(
		"Permissions-Policy",
		"fullscreen=*, picture-in-picture=*, accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
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

// Body parsing: only for remaining Express routes (import-export)
// Fastify handles body parsing natively for all Fastify-native routes.
app.use("/api/import-export", express.json({ limit: "10mb" }));

// Rate limiting global — relaxed in development to avoid false positives
const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: process.env.NODE_ENV === "production" ? 200 : 5000,
	message: { error: "Demasiadas peticiones. Intenta de nuevo en 15 minutos." },
	standardHeaders: true,
	legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Rate limiting para registro de usuarios (solo POST) — for import-export only
const registerLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: process.env.NODE_ENV === "production" ? 5 : 50,
	message: { error: "Demasiados registros. Intenta de nuevo en 1 hora." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Global encryption middleware for remaining Express routes (import-export)
app.use((req, res, next) => {
	if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
		encryptedPayload(req, res, next);
	} else {
		next();
	}
});

// ─── Migrated to Fastify-native routes (see fastify-routes/auth.ts) ───
// app.use("/api/auth", authRoutes);
// app.use("/api", ssoRoutes);
// ─── Migrated to Fastify-native routes (see fastify-routes/) ───
// app.use("/api/usuarios", usuariosRoutes);
// app.use("/api/cms", cmsRoutes);
// app.use("/api/certificates", certificatesRoutes);
// app.use("/api/notifications", notificationsRoutes);
// app.use("/api/progresso", progressoRoutes);
// app.use("/api/dashboard", dashboardRoutes);
// ─── Migrated to Fastify-native routes (see fastify-routes/) ───
// app.use("/api/docs", docsRoutes);
// app.use("/api/analytics", analyticsRoutes);
// app.use("/api/forum", forumRoutes);
// app.use("/api/gamification", gamificationRoutes);
// app.use("/api/conquistas", conquistasRoutes);
// app.use("/api/public", publicRoutes);
// app.use("/api/admin/modules", modulesRoutes);
// app.use("/api/logs", logsRoutes);
// app.use("/api/xp-config", xpconfigRoutes);
app.use("/api/import-export", importExportRoutes);
// app.use("/api/admin/dashboard", adminDashboardRoutes);
// app.use("/api/role-permissions", rolePermissionsRoutes);

// Health, config, and /health endpoints migrated to fastify-routes/health.ts

const clientDir = path.join(__dirname, "../client");
app.use(express.static(clientDir));
app.use((req, res, next) => {
	// Skip catch-all for API routes and /health (handled by Fastify)
	if (req.method !== "GET" || req.path.startsWith("/api") || req.path === "/health") return next();
	res.sendFile(path.join(clientDir, "index.html"));
});

// Listening, graceful shutdown, and DB infra services are now handled by
// fastify.ts (the Strangler Fig entry point). This file only exports the
// Express app for mounting via @fastify/express.

export default app;
