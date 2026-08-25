import type { FastifyInstance, FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";

const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

if (allowedOrigins.length === 0 && !isDev) {
	// Mirror Express behavior: fail fast in production without allowed origins
	console.error("ALLOWED_ORIGINS is required in production");
	process.exit(1);
}

/**
 * Origin validator that mirrors the Express corsOptions.origin callback:
 *  - No Origin header (same-origin / server-to-server) → allow
 *  - Dev mode: allow any localhost/127.0.0.1 origin (any port)
 *  - Explicitly listed origins in ALLOWED_ORIGINS → allow
 *  - Everything else → reject
 */
function isOriginAllowed(origin: string | undefined): boolean {
	if (!origin) return true;

	if (isDev) {
		try {
			const url = new URL(origin);
			if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
				return true;
			}
		} catch {
			/* not a valid URL, fall through */
		}
	}

	if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
		return true;
	}

	return false;
}

const corsPlugin: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	fastify.register(import("@fastify/cors"), {
		origin: (origin, cb) => {
			if (isOriginAllowed(origin)) {
				cb(null, true);
			} else {
				cb(new Error("No permitido por CORS"), false);
			}
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Encrypted"],
	});
	done();
};

export default fp(corsPlugin, { name: "app-cors" });
