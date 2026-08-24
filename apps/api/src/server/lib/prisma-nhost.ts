/**
 * Nhost PostgreSQL Prisma Client — backup/redundancy (third database).
 *
 * Uses the SAME Prisma schema as Supabase (PostgreSQL).
 * Writes are best-effort: failures logged but never block the application.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import logger from "./logger";

let prismaNhost: PrismaClient | null = null;

function createNhostClient(): PrismaClient | null {
	const url = process.env.NHOST_URL;
	if (!url) {
		logger.info("[DB] NHOST_URL not set — Nhost backup disabled");
		return null;
	}

	try {
		const adapter = new PrismaPg({
			connectionString: url,
			ssl: { rejectUnauthorized: false },
		});

		const client = new PrismaClient({
			adapter,
			log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
		});

		logger.info("[DB] Nhost backup client initialized");
		return client;
	} catch (error: any) {
		logger.error("[DB] Failed to initialize Nhost client:", error.message);
		return null;
	}
}

prismaNhost = createNhostClient();

export { prismaNhost };
