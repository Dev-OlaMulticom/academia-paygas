/**
 * Model configuration for the Data Access Layer.
 *
 * Three-tier redundancy:
 *   1. Supabase / PG_URL_1 (primary)
 *   2. Nhost / PG_URL_2 (backup PostgreSQL)
 *   3. MySQL (backup, different engine)
 *
 * Each model maps to PG, Nhost, and MySQL delegate references.
 * Adding a new database means adding one line per model here.
 */
import { prisma } from './prisma'
import { prismaNhost } from './prisma-nhost'
import { prismaMysql } from './prisma-mysql'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModelDelegate = any

export interface ModelDelegates {
  pg: ModelDelegate
  nhost: ModelDelegate | null
  mysql: ModelDelegate | null
}

export const MODELS: Record<string, ModelDelegates> = {
  user: {
    pg: prisma.user,
    nhost: prismaNhost ? (prismaNhost as any).user : null,
    mysql: prismaMysql ? (prismaMysql as any).user : null,
  },
  modulo: {
    pg: prisma.modulo,
    nhost: prismaNhost ? (prismaNhost as any).modulo : null,
    mysql: prismaMysql ? (prismaMysql as any).modulo : null,
  },
  aula: {
    pg: prisma.aula,
    nhost: prismaNhost ? (prismaNhost as any).aula : null,
    mysql: prismaMysql ? (prismaMysql as any).aula : null,
  },
  licao: {
    pg: prisma.licao,
    nhost: prismaNhost ? (prismaNhost as any).licao : null,
    mysql: prismaMysql ? (prismaMysql as any).licao : null,
  },
  quiz: {
    pg: prisma.quiz,
    nhost: prismaNhost ? (prismaNhost as any).quiz : null,
    mysql: prismaMysql ? (prismaMysql as any).quiz : null,
  },
  quizPergunta: {
    pg: prisma.quizPergunta,
    nhost: prismaNhost ? (prismaNhost as any).quizPergunta : null,
    mysql: prismaMysql ? (prismaMysql as any).quizPergunta : null,
  },
  quizResponse: {
    pg: prisma.quizResponse,
    nhost: prismaNhost ? (prismaNhost as any).quizResponse : null,
    mysql: prismaMysql ? (prismaMysql as any).quizResponse : null,
  },
  progresso: {
    pg: prisma.progresso,
    nhost: prismaNhost ? (prismaNhost as any).progresso : null,
    mysql: prismaMysql ? (prismaMysql as any).progresso : null,
  },
  certificate: {
    pg: prisma.certificate,
    nhost: prismaNhost ? (prismaNhost as any).certificate : null,
    mysql: prismaMysql ? (prismaMysql as any).certificate : null,
  },
  notification: {
    pg: prisma.notification,
    nhost: prismaNhost ? (prismaNhost as any).notification : null,
    mysql: prismaMysql ? (prismaMysql as any).notification : null,
  },
  activityLog: {
    pg: prisma.activityLog,
    nhost: prismaNhost ? (prismaNhost as any).activityLog : null,
    mysql: prismaMysql ? (prismaMysql as any).activityLog : null,
  },
  pointsTransaction: {
    pg: prisma.pointsTransaction,
    nhost: prismaNhost ? (prismaNhost as any).pointsTransaction : null,
    mysql: prismaMysql ? (prismaMysql as any).pointsTransaction : null,
  },
  forumPost: {
    pg: prisma.forumPost,
    nhost: prismaNhost ? (prismaNhost as any).forumPost : null,
    mysql: prismaMysql ? (prismaMysql as any).forumPost : null,
  },
  moduleConfig: {
    pg: prisma.moduleConfig,
    nhost: prismaNhost ? (prismaNhost as any).moduleConfig : null,
    mysql: prismaMysql ? (prismaMysql as any).moduleConfig : null,
  },
  xPConfig: {
    pg: prisma.xPConfig,
    nhost: prismaNhost ? (prismaNhost as any).xPConfig : null,
    mysql: prismaMysql ? (prismaMysql as any).xPConfig : null,
  },
  conquista: {
    pg: prisma.conquista,
    nhost: prismaNhost ? (prismaNhost as any).conquista : null,
    mysql: prismaMysql ? (prismaMysql as any).conquista : null,
  },
  userConquista: {
    pg: prisma.userConquista,
    nhost: prismaNhost ? (prismaNhost as any).userConquista : null,
    mysql: prismaMysql ? (prismaMysql as any).userConquista : null,
  },
}
