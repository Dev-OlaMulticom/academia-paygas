/**
 * Database Registry
 *
 * Parses PG_URL_1, PG_URL_2, PG_URL_3... from environment variables.
 * Falls back to legacy DATABASE_URL + NHOST_URL for backward compatibility.
 * Each database gets a Prisma client + health status.
 *
 * Usage:
 *   import { dbRegistry } from '../config/databases'
 *   const primary = dbRegistry.getPrimary()  // first healthy PG
 *   const allHealthy = dbRegistry.getHealthy()
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import logger from "../lib/logger";

export type DatabaseStatus = "connected" | "degraded" | "disconnected" | "unknown";

/**
 * Resolve the `ssl` option for the `pg` adapter based on the connection
 * string's host. Managed providers with a valid public CA (Neon, Supabase's
 * pooler, etc.) can verify the certificate chain; providers behind
 * self-signed certs need `rejectUnauthorized: false`. Defaults to the
 * permissive (legacy) behavior when the host doesn't match a known
 * verifiable provider, to avoid breaking existing self-hosted setups.
 */
export function resolveSslOption(url: string): { rejectUnauthorized: boolean } {
	const verifiableHosts = [".neon.tech", ".vercel-storage.com"];
	try {
		const { hostname } = new URL(url.replace(/^postgres(ql)?:\/\//, "https://"));
		if (verifiableHosts.some((suffix) => hostname.endsWith(suffix))) {
			return { rejectUnauthorized: true };
		}
	} catch {
		/* fall through to permissive default */
	}
	return { rejectUnauthorized: false };
}

export interface DatabaseEntry {
	name: string;
	url: string;
	client: PrismaClient | null;
	status: DatabaseStatus;
	lastCheck: Date | null;
	lastError: string | null;
	consecutiveFailures: number;
	priority: number; // lower = preferred for reads
}

class DatabaseRegistry {
	private entries: DatabaseEntry[] = [];
	private initialized = false;

	/**
	 * Initialize registry by parsing environment variables.
	 * Backward-compatible: also reads DATABASE_URL, NHOST_URL, MYSQL_URL.
	 */
	init() {
		if (this.initialized) return;
		this.initialized = true;

		let priority = 0;

		// === New format: PG_URL_1, PG_URL_2, PG_URL_3... ===
		for (let i = 1; i <= 10; i++) {
			const url = process.env[`PG_URL_${i}`];
			if (url) {
				this.entries.push(this.createEntry(`PG_${i}`, url, priority++));
			}
		}

		// === Legacy format fallback ===
		// If no PG_URL_* were found, fall back to legacy env vars
		if (this.entries.length === 0) {
			const dbUrl = process.env.DATABASE_URL;
			if (dbUrl) {
				this.entries.push(this.createEntry("supabase", dbUrl, priority++));
			}

			const nhostUrl = process.env.NHOST_URL;
			if (nhostUrl) {
				this.entries.push(this.createEntry("nhost", nhostUrl, priority++));
			}
		}

		// MySQL stays as a separate system (different driver, different schema)
		// It's handled by prismaMysql in db.ts — not part of PG registry

		if (this.entries.length === 0) {
			logger.warn("[DB-REGISTRY] No PostgreSQL databases configured! Set PG_URL_1 or DATABASE_URL");
		} else {
			logger.info(
				`[DB-REGISTRY] ${this.entries.length} database(s) registered: ${this.entries.map((e) => e.name).join(", ")}`,
			);
		}
	}

	private createEntry(name: string, url: string, priority: number): DatabaseEntry {
		let client: PrismaClient | null = null;

		try {
			const adapter = new PrismaPg({
				connectionString: url,
				ssl: resolveSslOption(url),
				max: 10,
			});
			client = new PrismaClient({
				adapter,
				log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
			});
		} catch (error: any) {
			logger.error(`[DB-REGISTRY] Failed to create client for ${name}:`, error.message);
		}

		return {
			name,
			url,
			client,
			status: "unknown",
			lastCheck: null,
			lastError: null,
			consecutiveFailures: 0,
			priority,
		};
	}

	/** Get all registered entries */
	getAll(): DatabaseEntry[] {
		this.init();
		return this.entries;
	}

	/** Get the primary database (first healthy, or first available) */
	getPrimary(): DatabaseEntry | null {
		this.init();
		// Prefer connected > degraded > unknown > disconnected
		const connected = this.entries.filter((e) => e.status === "connected");
		if (connected.length > 0) return connected.sort((a, b) => a.priority - b.priority)[0];

		const degraded = this.entries.filter((e) => e.status === "degraded");
		if (degraded.length > 0) return degraded.sort((a, b) => a.priority - b.priority)[0];

		const unknown = this.entries.filter((e) => e.status === "unknown");
		if (unknown.length > 0) return unknown.sort((a, b) => a.priority - b.priority)[0];

		return this.entries.sort((a, b) => a.priority - b.priority)[0] || null;
	}

	/** Get all healthy databases (connected or degraded) */
	getHealthy(): DatabaseEntry[] {
		this.init();
		return this.entries
			.filter((e) => e.status === "connected" || e.status === "degraded")
			.sort((a, b) => a.priority - b.priority);
	}

	/** Get all databases that need sync (disconnected then reconnected) */
	getNeedSync(): DatabaseEntry[] {
		this.init();
		return this.entries.filter((e) => e.status === "disconnected" && e.consecutiveFailures === 0);
	}

	/** Update health status for a database */
	setStatus(name: string, status: DatabaseStatus, error?: string) {
		const entry = this.entries.find((e) => e.name === name);
		if (!entry) return;

		entry.status = status;
		entry.lastCheck = new Date();
		entry.lastError = error || null;

		if (status === "connected" || status === "degraded") {
			entry.consecutiveFailures = 0;
		} else {
			entry.consecutiveFailures++;
		}
	}

	/** Get a PrismaClient by name */
	getClient(name: string): PrismaClient | null {
		this.init();
		return this.entries.find((e) => e.name === name)?.client || null;
	}

	/** Get summary for health endpoint */
	getHealthSummary(): Record<string, { status: string; lastCheck: string | null; errors: number }> {
		this.init();
		const summary: Record<string, { status: string; lastCheck: string | null; errors: number }> = {};
		for (const entry of this.entries) {
			summary[entry.name] = {
				status: entry.status,
				lastCheck: entry.lastCheck?.toISOString() || null,
				errors: entry.consecutiveFailures,
			};
		}
		return summary;
	}
}

export const dbRegistry = new DatabaseRegistry();
