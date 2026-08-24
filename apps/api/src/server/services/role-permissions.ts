/**
 * Role Permissions Service — database-driven CASL ability builder.
 *
 * Reads role definitions and their permission rules from the RoleConfig table.
 * Caches in memory for 60s to avoid hitting the DB on every request.
 *
 * To add a new role: just INSERT into RoleConfig. No code changes needed.
 */

import logger from "../lib/logger";
import { prisma } from "../lib/prisma";

const CACHE_TTL_MS = 60_000; // 60 seconds

interface PermissionRule {
	action: string;
	subject: string;
	conditions?: Record<string, any>;
}

interface RoleConfigRecord {
	role: string;
	label: string;
	description: string | null;
	ativo: boolean;
	permissions: PermissionRule[];
}

let cache = new Map<string, RoleConfigRecord>();
let lastFetch = 0;
let refreshPromise: Promise<void> | null = null;

async function refreshCache(): Promise<void> {
	const rows = await prisma.roleConfig.findMany({
		where: { ativo: true },
		orderBy: { ordem: "asc" },
	});

	// Build new map first, then atomically swap (avoids empty window)
	const newCache = new Map<string, RoleConfigRecord>();
	for (const row of rows) {
		const perms = row.permissions as unknown as PermissionRule[];
		newCache.set(row.role, {
			role: row.role,
			label: row.label,
			description: row.description,
			ativo: row.ativo,
			permissions: Array.isArray(perms) ? perms : [],
		});
	}
	cache = newCache;
	lastFetch = Date.now();
}

/**
 * Ensure cache is fresh. Uses promise dedup to prevent thundering herd.
 */
async function ensureCache(): Promise<void> {
	if (Date.now() - lastFetch > CACHE_TTL_MS || cache.size === 0) {
		if (!refreshPromise) {
			refreshPromise = refreshCache()
				.catch((err) => {
					logger.error("[ROLE-PERMS] Cache refresh failed:", err);
				})
				.then(() => {
					refreshPromise = null;
				});
		}
		await refreshPromise;
	}
}

/**
 * Get the permission rules for a given role.
 * Uses in-memory cache with 60s TTL.
 */
export async function getRolePermissions(role: string): Promise<PermissionRule[]> {
	await ensureCache();
	const config = cache.get(role);
	return config?.permissions || [];
}

/**
 * Get all active role configs (for admin UI / API).
 */
export async function getAllRoleConfigs(): Promise<RoleConfigRecord[]> {
	await ensureCache();
	return Array.from(cache.values());
}

/**
 * Invalidate the cache (call after role config updates).
 */
export function invalidateRoleCache(): void {
	cache.clear();
	lastFetch = 0;
}

/**
 * Resolve condition placeholders like __userId__ with actual values.
 */
export function resolveConditions(
	conditions: Record<string, any> | undefined,
	userId: string,
	gestorId?: string | null,
): Record<string, any> | undefined {
	if (!conditions) return undefined;

	const resolved: Record<string, any> = {};
	for (const [key, value] of Object.entries(conditions)) {
		if (value === "__userId__") {
			resolved[key] = userId;
		} else if (value === "__gestorId__") {
			resolved[key] = gestorId;
		} else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			resolved[key] = resolveConditions(value, userId, gestorId) || value;
		} else {
			resolved[key] = value;
		}
	}
	return resolved;
}
