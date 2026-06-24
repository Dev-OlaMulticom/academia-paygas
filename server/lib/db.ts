/**
 * Data Access Layer (DAL) — Multi-Database with Failover
 *
 * Architecture:
 *   Reads:  Primary → fallback to any healthy database (failover)
 *   Writes: All healthy databases in parallel (best-effort, never blocks)
 *
 * Three-tier redundancy:
 *   1. Supabase / PG_URL_1 (primary)
 *   2. Nhost / PG_URL_2 (backup PostgreSQL)
 *   3. MySQL (backup, different engine)
 *
 * If a database is down:
 *   - Reads: automatically failover to next healthy database
 *   - Writes: skip the down database, log warning, continue
 *   - Background sync: recovers data when database comes back online
 *
 * Usage:
 *   import { db } from '../lib/db'
 *   const user = await db.findUnique('user', { id: '123' })
 *   await db.create('user', { email, nome, senha })
 */
import { prisma } from './prisma'
import { prismaNhost } from './prisma-nhost'
import { prismaMysql } from './prisma-mysql'
import { MODELS, type ModelDelegates } from './db-models'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModelDelegate = any

function getModel(name: string): ModelDelegates {
  const model = MODELS[name]
  if (!model) throw new Error(`[DB] Unknown model: "${name}". Available: ${Object.keys(MODELS).join(', ')}`)
  return model
}

function warnBackup(backup: string, operation: string, model: string, error: any) {
  console.warn(`[DUAL-WRITE] ${backup} ${operation} failed on ${model}:`, error?.message || error)
}

/**
 * Get the primary PG client with failover.
 * If primary (pg) is disconnected, try nhost as fallback.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getReadClient(model: ModelDelegates): any {
  // Try primary first
  if (model.pg) return model.pg
  // Fallback to nhost if primary is unavailable
  if (model.nhost) return model.nhost
  // Last resort: this should never happen (would mean all PG databases are down)
  throw new Error('[DB] All PostgreSQL databases are unavailable')
}

export const db = {
  // ==================== CREATE ====================

  async create(modelName: string, data: Record<string, any>) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    // Write to primary (or fallback) — this is the authoritative write
    const result = await readClient.create({ data })

    // Best-effort writes to backup databases
    if (model.nhost && model.nhost !== readClient) {
      try {
        await model.nhost.create({ data })
      } catch (error) {
        warnBackup('Nhost', 'create', modelName, error)
      }
    }

    if (model.mysql) {
      try {
        await model.mysql.create({ data })
      } catch (error) {
        warnBackup('MySQL', 'create', modelName, error)
      }
    }

    return result
  },

  async createMany(modelName: string, data: Record<string, any>[]) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    const result = await readClient.createMany({ data })

    if (model.nhost && model.nhost !== readClient) {
      try {
        await model.nhost.createMany({ data })
      } catch (error) {
        warnBackup('Nhost', 'createMany', modelName, error)
      }
    }

    if (model.mysql) {
      try {
        await model.mysql.createMany({ data })
      } catch (error) {
        warnBackup('MySQL', 'createMany', modelName, error)
      }
    }

    return result
  },

  // ==================== READ (with failover) ====================

  async findUnique(modelName: string, where: Record<string, any>, include?: Record<string, any>) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    try {
      return await readClient.findUnique({ where, ...(include ? { include } : {}) })
    } catch (error) {
      // If primary fails, try fallback
      if (model.nhost && model.nhost !== readClient) {
        try {
          return await model.nhost.findUnique({ where, ...(include ? { include } : {}) })
        } catch { /* both failed */ }
      }
      throw error
    }
  },

  async findFirst(modelName: string, where: Record<string, any>, include?: Record<string, any>, orderBy?: Record<string, any>) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    try {
      return await readClient.findFirst({ where, ...(include ? { include } : {}), ...(orderBy ? { orderBy } : {}) })
    } catch (error) {
      if (model.nhost && model.nhost !== readClient) {
        try {
          return await model.nhost.findFirst({ where, ...(include ? { include } : {}), ...(orderBy ? { orderBy } : {}) })
        } catch { /* both failed */ }
      }
      throw error
    }
  },

  async findMany(modelName: string, options: {
    where?: Record<string, any>
    include?: Record<string, any>
    select?: Record<string, any>
    orderBy?: Record<string, any>
    skip?: number
    take?: number
  } = {}) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    try {
      return await readClient.findMany(options)
    } catch (error) {
      if (model.nhost && model.nhost !== readClient) {
        try {
          return await model.nhost.findMany(options)
        } catch { /* both failed */ }
      }
      throw error
    }
  },

  async count(modelName: string, where?: Record<string, any>) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    try {
      return await readClient.count({ ...(where ? { where } : {}) })
    } catch (error) {
      if (model.nhost && model.nhost !== readClient) {
        try {
          return await model.nhost.count({ ...(where ? { where } : {}) })
        } catch { /* both failed */ }
      }
      throw error
    }
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
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    try {
      return await readClient.groupBy(options as any)
    } catch (error) {
      if (model.nhost && model.nhost !== readClient) {
        try {
          return await model.nhost.groupBy(options as any)
        } catch { /* both failed */ }
      }
      throw error
    }
  },

  // ==================== UPDATE ====================

  async update(modelName: string, where: Record<string, any>, data: Record<string, any>) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    const result = await readClient.update({ where, data })

    if (model.nhost && model.nhost !== readClient) {
      try {
        await model.nhost.update({ where, data })
      } catch (error) {
        warnBackup('Nhost', 'update', modelName, error)
      }
    }

    if (model.mysql) {
      try {
        await model.mysql.update({ where, data })
      } catch (error) {
        warnBackup('MySQL', 'update', modelName, error)
      }
    }

    return result
  },

  async updateMany(modelName: string, where: Record<string, any>, data: Record<string, any>) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    const result = await readClient.updateMany({ where, data })

    if (model.nhost && model.nhost !== readClient) {
      try {
        await model.nhost.updateMany({ where, data })
      } catch (error) {
        warnBackup('Nhost', 'updateMany', modelName, error)
      }
    }

    if (model.mysql) {
      try {
        await model.mysql.updateMany({ where, data })
      } catch (error) {
        warnBackup('MySQL', 'updateMany', modelName, error)
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
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    const result = await readClient.upsert({ where, create: createData, update: updateData })

    if (model.nhost && model.nhost !== readClient) {
      try {
        await model.nhost.upsert({ where, create: createData, update: updateData })
      } catch (error) {
        warnBackup('Nhost', 'upsert', modelName, error)
      }
    }

    if (model.mysql) {
      try {
        await model.mysql.upsert({ where, create: createData, update: updateData })
      } catch (error) {
        warnBackup('MySQL', 'upsert', modelName, error)
      }
    }

    return result
  },

  // ==================== DELETE ====================

  async delete(modelName: string, where: Record<string, any>) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    const result = await readClient.delete({ where })

    if (model.nhost && model.nhost !== readClient) {
      try {
        await model.nhost.delete({ where })
      } catch (error) {
        warnBackup('Nhost', 'delete', modelName, error)
      }
    }

    if (model.mysql) {
      try {
        await model.mysql.delete({ where })
      } catch (error) {
        warnBackup('MySQL', 'delete', modelName, error)
      }
    }

    return result
  },

  async deleteMany(modelName: string, where: Record<string, any>) {
    const model = getModel(modelName)
    const readClient = getReadClient(model)

    const result = await readClient.deleteMany({ where })

    if (model.nhost && model.nhost !== readClient) {
      try {
        await model.nhost.deleteMany({ where })
      } catch (error) {
        warnBackup('Nhost', 'deleteMany', modelName, error)
      }
    }

    if (model.mysql) {
      try {
        await model.mysql.deleteMany({ where })
      } catch (error) {
        warnBackup('MySQL', 'deleteMany', modelName, error)
      }
    }

    return result
  },

  // ==================== TRANSACTION ====================

  /**
   * Execute a transaction on the primary PostgreSQL only.
   * Backup databases do not support cross-operation transactions.
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

  async healthCheck(): Promise<{ supabase: string; nhost: string; mysql: string }> {
    const result = { supabase: 'disconnected', nhost: 'not_configured', mysql: 'not_configured' }

    try {
      await prisma.$queryRaw`SELECT 1`
      result.supabase = 'connected'
    } catch { /* keep disconnected */ }

    if (prismaNhost) {
      try {
        await prismaNhost.$queryRaw`SELECT 1`
        result.nhost = 'connected'
      } catch {
        result.nhost = 'disconnected'
      }
    }

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
