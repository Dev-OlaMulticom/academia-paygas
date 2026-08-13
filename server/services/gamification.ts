import type { PointsAction } from "@prisma/client";
import { db } from "../lib/db";

// Default XP values — used as fallback if DB config is not available
const DEFAULT_POINTS: Record<string, number> = {
	LOGIN: 0.05,
	MODULE_OPEN: 0.05,
	LESSON_VIEW: 0.1,
	LESSON_COMPLETE: 1.0,
	MODULE_COMPLETE: 5.0,
	QUIZ_CORRECT: 0.5,
	QUIZ_PASS: 2.0,
	CERTIFICATE: 10.0,
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
		const configs = await db.findMany("xPConfig");
		xpConfigCache = {};
		for (const c of configs) {
			xpConfigCache[c.action] = c.points;
		}
		xpConfigCacheTime = now;
		return xpConfigCache;
	} catch {
		return DEFAULT_POINTS;
	}
}

async function getPointsForAction(action: string): Promise<number> {
	const config = await getXPConfig();
	return config[action] ?? DEFAULT_POINTS[action] ?? 0;
}

// Round up (ceil) to at most 2 decimal places so XP never accumulates
// float noise like 4.99999999999999. Snap to a 4-decimal grid first to kill
// float error (0.07 * 100 === 7.000000000000001) before taking the ceil.
export function roundXpUp(value: number): number {
	const scaled = Math.round(value * 10000);
	return Math.ceil(scaled / 100) / 100;
}

export async function awardPoints(userId: string, action: PointsAction, details?: string): Promise<number> {
	const points = await getPointsForAction(action);

	if (points === 0) return 0;

	await db.transaction(async (tx) => {
		await tx.pointsTransaction.create({
			data: { userId, action, points, details },
		});
		await tx.user.update({
			where: { id: userId },
			data: { xp: { increment: points } },
		});
	});

	// MySQL also gets the transaction via DAL (fire-and-forget)
	// db.create handles MySQL dual-write, but we also need the user XP update there
	await db.update("user", { id: userId }, { xp: { increment: points } } as any);

	// Normalize XP to at most 2 decimals (round up) and persist level.
	// `db.update` writes the absolute value to primary, backups and MySQL,
	// so every tier ends up with the same clean value.
	const updated = (await db.findUnique("user", { id: userId })) as { xp: number } | null;
	if (updated) {
		const roundedXp = roundXpUp(updated.xp || 0);
		const newLevel = Math.floor(roundedXp / 2000) + 1;
		await db.update("user", { id: userId }, { xp: roundedXp, level: newLevel });
	}

	return points;
}

/**
 * Award points only if no prior transaction exists with the same (userId, action, details).
 * The `dedupKey` is stored in the `details` field and used as the uniqueness check.
 * Returns 0 if already awarded, otherwise the points awarded.
 */
export async function awardPointsIfNotAwarded(userId: string, action: PointsAction, dedupKey: string): Promise<number> {
	const existing = await db.findFirst("pointsTransaction", { userId, action, details: dedupKey });
	if (existing) return 0;
	return awardPoints(userId, action, dedupKey);
}

/**
 * Award LOGIN points at most once per calendar day per user.
 */
export async function awardLoginPointsDaily(userId: string): Promise<number> {
	const startOfDay = new Date();
	startOfDay.setHours(0, 0, 0, 0);

	const existing = await db.findFirst("pointsTransaction", {
		userId,
		action: "LOGIN",
		createdAt: { gte: startOfDay },
	});
	if (existing) return 0;
	return awardPoints(userId, "LOGIN", `LOGIN:${startOfDay.toISOString().split("T")[0]}`);
}

export async function getUserPoints(userId: string) {
	const user = (await db.findUnique("user", { id: userId })) as { xp?: number } | null;

	const transactions = await db.findMany("pointsTransaction", {
		where: { userId },
		orderBy: { createdAt: "desc" },
		take: 50,
	});

	const byAction = await db.groupBy("pointsTransaction", {
		by: ["action"],
		where: { userId },
		_sum: { points: true },
		_count: { id: true },
	});

	return {
		totalXp: user?.xp || 0,
		level: Math.floor((user?.xp || 0) / 2000) + 1,
		transactions,
		byAction: (byAction as any[]).map((b) => ({
			action: b.action,
			totalPoints: b._sum?.points || 0,
			count: b._count?.id || 0,
		})),
	};
}

export async function getTeamPoints(gestorId?: string) {
	const where = gestorId ? { gestorId } : {};

	const users = (await db.findMany("user", {
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
			level: Math.floor((u.xp || 0) / 2000) + 1,
		})),
		totalXp,
		averageXp: users.length > 0 ? Math.round(totalXp / users.length) : 0,
	};
}
