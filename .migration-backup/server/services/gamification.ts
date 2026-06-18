import { prisma } from '../lib/prisma'
import { PointsAction } from '@prisma/client'

const POINTS_MAP: Record<PointsAction, number> = {
  LOGIN: 10,
  MODULE_OPEN: 20,
  LESSON_COMPLETE: 50,
  MODULE_COMPLETE: 150,
  QUIZ_CORRECT: 30,
  QUIZ_PASS: 100,
  CERTIFICATE: 500,
}

export async function awardPoints(
  userId: string,
  action: PointsAction,
  details?: string
): Promise<number> {
  const points = POINTS_MAP[action]

  await prisma.$transaction([
    prisma.pointsTransaction.create({
      data: { userId, action, points, details },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: points } },
    }),
  ])

  return points
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
