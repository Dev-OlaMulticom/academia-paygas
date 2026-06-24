/**
 * Model configuration for the Data Access Layer.
 * Each model maps to its PG and MySQL delegate references.
 * Adding a new database means adding one line per model here.
 */
import { prisma } from './prisma'
import { prismaMysql } from './prisma-mysql'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModelDelegate = any

export interface ModelDelegates {
  pg: ModelDelegate
  mysql: ModelDelegate | null
}

export const MODELS: Record<string, ModelDelegates> = {
  user: {
    pg: prisma.user,
    mysql: prismaMysql ? (prismaMysql as any).user : null,
  },
  modulo: {
    pg: prisma.modulo,
    mysql: prismaMysql ? (prismaMysql as any).modulo : null,
  },
  aula: {
    pg: prisma.aula,
    mysql: prismaMysql ? (prismaMysql as any).aula : null,
  },
  licao: {
    pg: prisma.licao,
    mysql: prismaMysql ? (prismaMysql as any).licao : null,
  },
  quiz: {
    pg: prisma.quiz,
    mysql: prismaMysql ? (prismaMysql as any).quiz : null,
  },
  quizPergunta: {
    pg: prisma.quizPergunta,
    mysql: prismaMysql ? (prismaMysql as any).quizPergunta : null,
  },
  quizResponse: {
    pg: prisma.quizResponse,
    mysql: prismaMysql ? (prismaMysql as any).quizResponse : null,
  },
  progresso: {
    pg: prisma.progresso,
    mysql: prismaMysql ? (prismaMysql as any).progresso : null,
  },
  certificate: {
    pg: prisma.certificate,
    mysql: prismaMysql ? (prismaMysql as any).certificate : null,
  },
  notification: {
    pg: prisma.notification,
    mysql: prismaMysql ? (prismaMysql as any).notification : null,
  },
  activityLog: {
    pg: prisma.activityLog,
    mysql: prismaMysql ? (prismaMysql as any).activityLog : null,
  },
  pointsTransaction: {
    pg: prisma.pointsTransaction,
    mysql: prismaMysql ? (prismaMysql as any).pointsTransaction : null,
  },
  forumPost: {
    pg: prisma.forumPost,
    mysql: prismaMysql ? (prismaMysql as any).forumPost : null,
  },
  moduleConfig: {
    pg: prisma.moduleConfig,
    mysql: prismaMysql ? (prismaMysql as any).moduleConfig : null,
  },
  xPConfig: {
    pg: prisma.xPConfig,
    mysql: prismaMysql ? (prismaMysql as any).xPConfig : null,
  },
  conquista: {
    pg: prisma.conquista,
    mysql: prismaMysql ? (prismaMysql as any).conquista : null,
  },
  userConquista: {
    pg: prisma.userConquista,
    mysql: prismaMysql ? (prismaMysql as any).userConquista : null,
  },
}
