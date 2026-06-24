/**
 * Data Access Layer (DAL)
 *
 * Centralizes all database operations across multiple databases.
 * PostgreSQL is the source of truth. MySQL is a redundant backup.
 * MySQL failures are logged but never block the application.
 *
 * Usage:
 *   import { db } from '../lib/db'
 *   const user = await db.findUnique('user', { id: '123' })
 *   await db.create('user', { email, nome, senha })
 *   await db.update('user', { id: '123' }, { nome: 'New' })
 *   await db.upsert('progresso',
 *     { moduloId_aulaId_userId: { moduloId, aulaId, userId } },
 *     { moduloId, aulaId, userId, concluido: true },
 *     { concluido: true }
 *   )
 */
import { prisma } from './prisma'
import { prismaMysql } from './prisma-mysql'
import { MODELS, type ModelDelegates } from './db-models'

function getModel(name: string): ModelDelegates {
  const model = MODELS[name]
  if (!model) throw new Error(`[DB] Unknown model: "${name}". Available: ${Object.keys(MODELS).join(', ')}`)
  return model
}

function warnMySQL(operation: string, model: string, error: any) {
  console.warn(`[DUAL-WRITE] MySQL ${operation} failed on ${model}:`, error?.message || error)
}

export const db = {
  // ==================== CREATE ====================

  async create(modelName: string, data: Record<string, any>) {
    const { pg, mysql } = getModel(modelName)

    const result = await pg.create({ data })

    if (mysql) {
      try {
        await mysql.create({ data })
      } catch (error) {
        warnMySQL('create', modelName, error)
      }
    }

    return result
  },

  async createMany(modelName: string, data: Record<string, any>[]) {
    const { pg, mysql } = getModel(modelName)

    const result = await pg.createMany({ data })

    if (mysql) {
      try {
        await mysql.createMany({ data })
      } catch (error) {
        warnMySQL('createMany', modelName, error)
      }
    }

    return result
  },

  // ==================== READ ====================

  async findUnique(modelName: string, where: Record<string, any>, include?: Record<string, any>) {
    const { pg } = getModel(modelName)
    return pg.findUnique({ where, ...(include ? { include } : {}) })
  },

  async findFirst(modelName: string, where: Record<string, any>, include?: Record<string, any>, orderBy?: Record<string, any>) {
    const { pg } = getModel(modelName)
    return pg.findFirst({ where, ...(include ? { include } : {}), ...(orderBy ? { orderBy } : {}) })
  },

  async findMany(modelName: string, options: {
    where?: Record<string, any>
    include?: Record<string, any>
    select?: Record<string, any>
    orderBy?: Record<string, any>
    skip?: number
    take?: number
  } = {}) {
    const { pg } = getModel(modelName)
    return pg.findMany(options)
  },

  async count(modelName: string, where?: Record<string, any>) {
    const { pg } = getModel(modelName)
    return pg.count({ ...(where ? { where } : {}) })
  },

  async groupBy(
    modelName: string,
    options: {
      by: string[]
      where?: Record<string, any>
      _sum?: Record<string, boolean>
      _count?: Record<string, boolean> | Record<string, Record<string, boolean>>
      orderBy?: Record<string, any>
    }
  ) {
    const { pg } = getModel(modelName)
    return pg.groupBy(options as any)
  },

  // ==================== UPDATE ====================

  async update(modelName: string, where: Record<string, any>, data: Record<string, any>) {
    const { pg, mysql } = getModel(modelName)

    const result = await pg.update({ where, data })

    if (mysql) {
      try {
        await mysql.update({ where, data })
      } catch (error) {
        warnMySQL('update', modelName, error)
      }
    }

    return result
  },

  async updateMany(modelName: string, where: Record<string, any>, data: Record<string, any>) {
    const { pg, mysql } = getModel(modelName)

    const result = await pg.updateMany({ where, data })

    if (mysql) {
      try {
        await mysql.updateMany({ where, data })
      } catch (error) {
        warnMySQL('updateMany', modelName, error)
      }
    }

    return result
  },

  // ==================== UPSERT ====================

  async upsert(
    modelName: string,
    where: Record<string, any>,
    createData: Record<string, any>,
    updateData: Record<string, any>
  ) {
    const { pg, mysql } = getModel(modelName)

    const result = await pg.upsert({ where, create: createData, update: updateData })

    if (mysql) {
      try {
        await mysql.upsert({ where, create: createData, update: updateData })
      } catch (error) {
        warnMySQL('upsert', modelName, error)
      }
    }

    return result
  },

  // ==================== DELETE ====================

  async delete(modelName: string, where: Record<string, any>) {
    const { pg, mysql } = getModel(modelName)

    const result = await pg.delete({ where })

    if (mysql) {
      try {
        await mysql.delete({ where })
      } catch (error) {
        warnMySQL('delete', modelName, error)
      }
    }

    return result
  },

  async deleteMany(modelName: string, where: Record<string, any>) {
    const { pg, mysql } = getModel(modelName)

    const result = await pg.deleteMany({ where })

    if (mysql) {
      try {
        await mysql.deleteMany({ where })
      } catch (error) {
        warnMySQL('deleteMany', modelName, error)
      }
    }

    return result
  },

  // ==================== TRANSACTION ====================

  /**
   * Execute a transaction on PostgreSQL only.
   * MySQL does not support cross-operation transactions through this layer.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn as any) as Promise<T>
  },

  // ==================== RAW QUERIES ====================

  async queryRaw(query: TemplateStringsArray, ...values: any[]) {
    return prisma.$queryRaw(query, ...values)
  },

  // ==================== HEALTH CHECK ====================

  async healthCheck(): Promise<{ postgresql: string; mysql: string }> {
    const result = { postgresql: 'disconnected', mysql: 'not_configured' }

    try {
      await prisma.$queryRaw`SELECT 1`
      result.postgresql = 'connected'
    } catch { /* keep disconnected */ }

    if (prismaMysql) {
      try {
        await prismaMysql.$queryRaw`SELECT 1`
        result.mysql = 'connected'
      } catch {
        result.mysql = 'disconnected'
      }
    }

    return result
  },
}
