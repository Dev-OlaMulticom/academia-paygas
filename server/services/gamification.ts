import { prisma } from '../lib/prisma'
import { prismaMysql } from '../lib/prisma-mysql'
import { PointsAction } from '@prisma/client'

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
}

// In-memory cache of XP config from DB
let xpConfigCache: Record<string, number> | null = null
let xpConfigCacheTime = 0
const CACHE_TTL = 60000 // 1 minute

async function getXPConfig(): Promise<Record<string, number>> {
  const now = Date.now()
  if (xpConfigCache && now - xpConfigCacheTime < CACHE_TTL) {
    return xpConfigCache
  }

  try {
    const configs = await prisma.xPConfig.findMany()
    xpConfigCache = {}
    for (const c of configs) {
      xpConfigCache[c.action] = c.points
    }
    xpConfigCacheTime = now
    return xpConfigCache
  } catch {
    return DEFAULT_POINTS
  }
}

async function getPointsForAction(action: string): Promise<number> {
  const config = await getXPConfig()
  return config[action] ?? DEFAULT_POINTS[action] ?? 0
}

export async function awardPoints(
  userId: string,
  action: PointsAction,
  details?: string
): Promise<number> {
  const points = await getPointsForAction(action)

  if (points === 0) return 0

  await prisma.$transaction([
    prisma.pointsTransaction.create({
      data: { userId, action, points, details },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: points } },
    }),
  ])

  // Dual-write to MySQL
  if (prismaMysql) {
    try {
      await prismaMysql.$transaction([
        prismaMysql.pointsTransaction.create({
          data: { userId, action, points, details },
        }),
        prismaMysql.user.update({
          where: { id: userId },
          data: { xp: { increment: points } },
        }),
      ])
    } catch (error: any) {
      console.warn('[DUAL-WRITE] MySQL awardPoints failed:', error?.message)
    }
  }

  // Recalculate and persist level
  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true },
  })
  if (updated) {
    const newLevel = Math.floor(updated.xp / 2000) + 1
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    })

    // Dual-write level update to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.update({
          where: { id: userId },
          data: { level: newLevel },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL level update failed:', error?.message)
      }
    }
  }

  return points
}

/**
 * Award points only if no prior transaction exists with the same (userId, action, details).
 * The `dedupKey` is stored in the `details` field and used as the uniqueness check.
 * Returns 0 if already awarded, otherwise the points awarded.
 */
export async function awardPointsIfNotAwarded(
  userId: string,
  action: PointsAction,
  dedupKey: string
): Promise<number> {
  const existing = await prisma.pointsTransaction.findFirst({
    where: { userId, action, details: dedupKey },
  })
  if (existing) return 0
  return awardPoints(userId, action, dedupKey)
}

/**
 * Award LOGIN points at most once per calendar day per user.
 */
export async function awardLoginPointsDaily(userId: string): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const existing = await prisma.pointsTransaction.findFirst({
    where: {
      userId,
      action: 'LOGIN',
      createdAt: { gte: startOfDay },
    },
  })
  if (existing) return 0
  return awardPoints(userId, 'LOGIN', `LOGIN:${startOfDay.toISOString().split('T')[0]}`)
}

export async function getUserPoints(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true },
  })

  const transactions = await prisma.pointsTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const byAction = await prisma.pointsTransaction.groupBy({
    by: ['action'],
    where: { userId },
    _sum: { points: true },
    _count: { id: true },
  })

  return {
    totalXp: user?.xp || 0,
    level: Math.floor((user?.xp || 0) / 2000) + 1,
    transactions,
    byAction: byAction.map((b: any) => ({
      action: b.action,
      totalPoints: b._sum.points || 0,
      count: b._count.id,
    })),
  }
}

export async function getTeamPoints(gestorId?: string) {
  const where = gestorId ? { gestorId } : {}

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      xp: true,
    },
    orderBy: { xp: 'desc' },
  })

  const totalXp = users.reduce((sum: number, u: any) => sum + u.xp, 0)

  return {
    users: users.map((u: any, i: number) => ({
      ...u,
      rank: i + 1,
      level: Math.floor(u.xp / 2000) + 1,
    })),
    totalXp,
    averageXp: users.length > 0 ? Math.round(totalXp / users.length) : 0,
  }
}
