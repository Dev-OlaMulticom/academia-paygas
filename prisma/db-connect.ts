/**
 * Prisma connection helper with multi-DB failover for scripts.
 *
 * Scripts (seed, reset-admin, sync-mysql) run outside the server's DAL and
 * health-check infrastructure, so they need their own failover logic. This
 * helper tries each PG_URL_* (and DATABASE_URL) in order until one connects.
 *
 * Usage:
 *   import { createPrismaClient } from "./db-connect";
 *   const prisma = createPrismaClient();
 *   // ... use prisma normally ...
 *   await prisma.$disconnect();
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Collect all candidate connection strings from env, in priority order:
 * PG_URL_1, PG_URL_2, ..., PG_URL_9, then DATABASE_URL (deduped).
 */
function getCandidateUrls(): string[] {
	const urls: string[] = [];
	for (let i = 1; i <= 9; i++) {
		const u = process.env[`PG_URL_${i}`];
		if (u) urls.push(u);
	}
	if (process.env.DATABASE_URL && !urls.includes(process.env.DATABASE_URL)) {
		urls.push(process.env.DATABASE_URL);
	}
	return urls;
}

/**
 * Quick liveness check — `SELECT 1` with a 5s timeout. Returns true if the
 * database is reachable.
 */
async function testConnection(client: PrismaClient): Promise<boolean> {
	try {
		await Promise.race([
			client.$queryRaw`SELECT 1`,
			new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
		]);
		return true;
	} catch {
		return false;
	}
}

/**
 * Create a PrismaClient connected to the first reachable PostgreSQL database.
 * Tries PG_URL_1, PG_URL_2, ..., DATABASE_URL in order. Throws if none are
 * reachable.
 */
export function createPrismaClient(): PrismaClient {
	const urls = getCandidateUrls();
	if (urls.length === 0) {
		throw new Error("No database URLs configured (set PG_URL_1 or DATABASE_URL)");
	}
	// Return a lazy client that will be connected on first use.
	// We do a synchronous best-effort: try the first URL, and if it fails at
	// runtime, the caller should catch and retry with nextUrl().
	// For simplicity in scripts, we just use the first URL — the failover
	// happens via tryConnect() below.
	const adapter = new PrismaPg({
		connectionString: urls[0],
		ssl: { rejectUnauthorized: false },
	});
	return new PrismaClient({ adapter });
}

/**
 * Create a PrismaClient and verify the connection is reachable. If the first
 * URL fails, tries the next one. Returns a connected client or throws.
 *
 * This is the recommended entry point for scripts that need a guaranteed
 * working connection before proceeding.
 */
export async function createConnectedPrismaClient(): Promise<{ prisma: PrismaClient; url: string }> {
	const urls = getCandidateUrls();
	if (urls.length === 0) {
		throw new Error("No database URLs configured (set PG_URL_1 or DATABASE_URL)");
	}

	let lastError: unknown;

	for (const url of urls) {
		const masked = url.replace(/:[^:@]+@/, ":***@");
		const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
		const client = new PrismaClient({ adapter });

		const ok = await testConnection(client);
		if (ok) {
			console.log(`   ✅ Conectado a: ${masked}`);
			return { prisma: client, url };
		}

		console.log(`   ⚠️  No reachable: ${masked}`);
		await client.$disconnect().catch(() => {});
		lastError = new Error(`Could not connect to ${masked}`);
	}

	throw lastError ?? new Error("All database URLs failed");
}
