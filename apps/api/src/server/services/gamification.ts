type XpAction = string;

import { drizzleDb } from "../lib/drizzle-db";

// XP needed per level — linear fallback when no LEVEL_<n> rows exist in XPConfig.
// Exposed to the frontend via GET /api/public/config (xpPerLevel + levels).
export const XP_PER_LEVEL = 2000;

// Level thresholds configured via XPConfig rows with action "LEVEL_<n>"
// (points = XP mínimo para alcançar o nível n). Null = not loaded yet;
// empty array = loaded, no custom levels (linear formula applies).
let levelThresholdsCache: { level: number; xp: number }[] | null = null;

export function levelForXp(xp: number): number {
	if (levelThresholdsCache && levelThresholdsCache.length > 0) {
		let level = 1;
		for (const t of levelThresholdsCache) {
			if (xp >= t.xp && t.level > level) level = t.level;
		}
		return level;
	}
	return Math.floor(xp / XP_PER_LEVEL) + 1;
}

// Absolute XP required to reach the next level; null when already at max level.
export function xpForNextLevel(xp: number): number | null {
	if (levelThresholdsCache && levelThresholdsCache.length > 0) {
		const next = levelThresholdsCache.find((t) => xp < t.xp);
		return next ? next.xp : null;
	}
	return levelForXp(xp) * XP_PER_LEVEL;
}

// Loads (and caches) XPConfig including LEVEL_<n> thresholds.
export async function getLevelThresholds(): Promise<{ level: number; xp: number }[]> {
	await getXPConfig();
	return levelThresholdsCache ?? [];
}

// Default XP values — used as fallback if DB config is not available
const DEFAULT_XP: Record<string, number> = {
	LOGIN: 0.05,
	MODULE_OPEN: 0.05,
	LESSON_VIEW: 0.1,
	LESSON_COMPLETE: 1.0,
	MODULE_COMPLETE: 5.0,
	QUIZ_CORRECT: 0.5,
	QUIZ_PASS: 2.0,
	CERTIFICATE: 10.0,
	NOTIFICATION_READ: 0.05,
};

// In-memory cache of XP config from DB
let xpConfigCache: Record<string, number> | null = null;
let xpConfigCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

async function getXPConfig(): Promise<Record<string, number>> {
	const now = Date.now();
	if (xpConfigCache && now - xpConfigCacheTime < CACHE_TTL) {
		return xpConfigCache;
	}

	try {
		const configs = await drizzleDb.findMany("xPConfig");
		const thresholds: { level: number; xp: number }[] = [];
		xpConfigCache = {};
		for (const c of configs) {
			const lvl = /^LEVEL_(\d+)$/.exec(c.action);
			if (lvl) {
				thresholds.push({ level: Number(lvl[1]), xp: c.points });
				continue;
			}
			xpConfigCache[c.action] = c.points;
		}
		levelThresholdsCache = thresholds.sort((a, b) => a.xp - b.xp);
		xpConfigCacheTime = now;
		return xpConfigCache;
	} catch {
		return DEFAULT_XP;
	}
}

async function getXpForAction(action: string): Promise<number> {
	const config = await getXPConfig();
	return config[action] ?? DEFAULT_XP[action] ?? 0;
}

// Round up (ceil) to at most 2 decimal places so XP never accumulates
// float noise like 4.99999999999999. Snap to a 4-decimal grid first to kill
// float error (0.07 * 100 === 7.000000000000001) before taking the ceil.
export function roundXpUp(value: number): number {
	const scaled = Math.round(value * 10000);
	return Math.ceil(scaled / 100) / 100;
}

export async function awardXp(userId: string, action: XpAction, details?: string): Promise<number> {
	const xp = await getXpForAction(action);

	if (xp === 0) return 0;

	// drizzleDb does not support Prisma-style transactions or atomic increments,
	// so we create the transaction record and read the current XP in parallel
	// (independent ops), then set the rounded total + derived level directly.
	await drizzleDb.create("pointsTransaction", { userId, action, points: xp, details });
	const before = (await drizzleDb.findUnique("user", { id: userId })) as { xp?: number } | null;
	const currentXp = before?.xp || 0;
	const roundedXp = roundXpUp(currentXp + xp);
	const newLevel = levelForXp(roundedXp);
	await drizzleDb.update("user", { id: userId }, { xp: roundedXp, level: newLevel });

	return xp;
}

/**
 * Award XP only if no prior transaction exists with the same (userId, action, details).
 * The `dedupKey` is stored in the `details` field and used as the uniqueness check.
 * Returns 0 if already awarded, otherwise the XP awarded.
 */
export async function awardXpOnce(userId: string, action: XpAction, dedupKey: string): Promise<number> {
	const existing = await drizzleDb.findFirst("pointsTransaction", { userId, action, details: dedupKey });
	if (existing) return 0;
	return awardXp(userId, action, dedupKey);
}

/**
 * Award LOGIN XP at most once per calendar day per user.
 */
export async function awardLoginXpDaily(userId: string): Promise<number> {
	const startOfDay = new Date();
	startOfDay.setHours(0, 0, 0, 0);

	const existing = await drizzleDb.findFirst("pointsTransaction", {
		userId,
		action: "LOGIN",
		createdAt: { gte: startOfDay },
	});
	if (existing) return 0;
	return awardXp(userId, "LOGIN", `LOGIN:${startOfDay.toISOString().split("T")[0]}`);
}

export async function getUserXp(userId: string) {
	await getXPConfig(); // warm level thresholds before levelForXp
	// Lecturas independientes en paralelo (ahorra 2 RTT de ~15ms c/u contra DB remota)
	const [user, transactions, byActionAgg] = (await Promise.all([
		drizzleDb.findUnique("user", { id: userId }) as Promise<{ xp?: number } | null>,
		drizzleDb.findMany("pointsTransaction", {
			where: { userId },
			orderBy: { createdAt: "desc" },
			take: 50,
		}),
		drizzleDb.groupBy("pointsTransaction", {
			by: ["action"],
			where: { userId },
			_sum: { points: true },
			_count: { id: true },
		}),
	])) as [any, any[], any[]];

	return {
		totalXp: user?.xp || 0,
		level: levelForXp(user?.xp || 0),
		transactions,
		byAction: byActionAgg.map((b: any) => ({
			action: b.action,
			totalXp: b._sum?.points || 0,
			count: b._count?.id || 0,
		})),
	};
}

export async function getTeamXp(gestorId?: string) {
	await getXPConfig(); // warm level thresholds before levelForXp
	const where = gestorId ? { gestorId } : ({} as Record<string, any>);

	const users = (await drizzleDb.findMany("user", {
		where,
		orderBy: { xp: "desc" },
	})) as any[];

	const totalXp = users.reduce((sum: number, u: any) => sum + (u.xp || 0), 0);

	return {
		users: users.map((u: any, i: number) => ({
			id: u.id,
			nome: u.nome,
			email: u.email,
			role: u.role,
			xp: u.xp,
			rank: i + 1,
			level: levelForXp(u.xp || 0),
		})),
		totalXp,
		averageXp: users.length > 0 ? Math.round(totalXp / users.length) : 0,
	};
}
