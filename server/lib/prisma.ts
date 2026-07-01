/**
 * PostgreSQL Prisma Client — re-exports the primary client from the database registry.
 *
 * IMPORTANT: This module no longer creates its own PrismaClient at import
 * time. The previous implementation eagerly allocated a connection pool
 * using `PG_URL_1`, which produced a second pool parallel to the one owned
 * by `server/config/databases.ts`. Reads/writes could land on different
 * pools, wasting connections.
 *
 * Now `prisma` is a lazy Proxy: any property access goes through
 * `getPrimaryPrisma()`, which:
 *   1. Asks the database registry for the health-aware primary.
 *   2. Falls back to a one-off bootstrap client if the registry has no URLs
 *      configured (so cold-start consumers do not throw).
 *
 * This guarantees that `db.transaction()`, `db.queryRaw()`, and the multi-
 * database DAL all share the same connection pool.
 */

import type { PrismaClient } from "@prisma/client";

import { dbRegistry } from "../config/databases";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buildClient(url: string): PrismaClient {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

	const adapter = new PrismaPg({
		connectionString: url,
		ssl: { rejectUnauthorized: false },
		max: 5,
	});

	return new PrismaClient({
		adapter,
		log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
	});
}

function resolveBootstrapUrl(): string {
	return process.env.PG_URL_1 || process.env.DATABASE_URL || "";
}

function createBootstrapClient(): PrismaClient {
	const url = resolveBootstrapUrl();
	if (!url) {
		// No DB configured — return a stub-only client so importing `prisma` is
		// never fatal. Any actual query will fail at runtime, which is the
		// sensible behavior.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");
		return new PrismaClient();
	}
	return buildClient(url);
}

/**
 * Returns the primary PrismaClient — the one owned by the database registry.
 * Falls back to the bootstrap client if the registry is empty.
 */
export function getPrimaryPrisma(): PrismaClient {
	const entries = dbRegistry.getAll();
	if (entries.length > 0) {
		const primary = dbRegistry.getPrimary();
		if (primary?.client) return primary.client;
	}

	if (!globalForPrisma.prisma) {
		globalForPrisma.prisma = createBootstrapClient();
	}
	return globalForPrisma.prisma;
}

/**
 * `prisma` — kept as default export for backward compatibility with every
 * `from "../lib/prisma"` call site. Now delegates to `getPrimaryPrisma()`.
 *
 * A Proxy is used so the client is created lazily on first property access.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
	get(_target, prop) {
		const target = getPrimaryPrisma();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const value = (target as any)[prop];
		return typeof value === "function" ? value.bind(target) : value;
	},
}) as PrismaClient;
