import { prismaMysql } from '../lib/prisma-mysql'

/**
 * Dual-write helper: executes both PG and MySQL operations.
 * PG is source of truth. MySQL failures are logged but do not block.
 */
export async function dualWrite<T>(
  pgOp: () => Promise<T>,
  mysqlOp: () => Promise<any>,
  label?: string
): Promise<T> {
  const [pgResult, mysqlResult] = await Promise.allSettled([pgOp(), mysqlOp()])

  if (pgResult.status === 'rejected') {
    throw pgResult.reason
  }

  if (mysqlResult.status === 'rejected') {
    console.warn(
      `[DUAL-WRITE] MySQL fallback${label ? ` (${label})` : ''}:`,
      mysqlResult.reason?.message || mysqlResult.reason
    )
  }

  return pgResult.value
}

/**
 * Dual-write for create operations: creates in PG first, then MySQL.
 * Returns the PG result. MySQL errors are logged but don't block.
 */
export async function dualCreate<T>(
  pgOp: () => Promise<T>,
  mysqlOp: () => Promise<any>,
  label?: string
): Promise<T> {
  const pgResult = await pgOp()

  if (prismaMysql) {
    try {
      await mysqlOp()
    } catch (error: any) {
      console.warn(
        `[DUAL-WRITE] MySQL create failed${label ? ` (${label})` : ''}:`,
        error?.message || error
      )
    }
  }

  return pgResult
}

/**
 * Dual-write for update operations: updates in PG first, then MySQL.
 */
export async function dualUpdate<T>(
  pgOp: () => Promise<T>,
  mysqlOp: () => Promise<any>,
  label?: string
): Promise<T> {
  const pgResult = await pgOp()

  if (prismaMysql) {
    try {
      await mysqlOp()
    } catch (error: any) {
      console.warn(
        `[DUAL-WRITE] MySQL update failed${label ? ` (${label})` : ''}:`,
        error?.message || error
      )
    }
  }

  return pgResult
}

/**
 * Dual-write for delete operations: deletes in PG first, then MySQL.
 */
export async function dualDelete(
  pgOp: () => Promise<any>,
  mysqlOp: () => Promise<any>,
  label?: string
): Promise<any> {
  const pgResult = await pgOp()

  if (prismaMysql) {
    try {
      await mysqlOp()
    } catch (error: any) {
      console.warn(
        `[DUAL-WRITE] MySQL delete failed${label ? ` (${label})` : ''}:`,
        error?.message || error
      )
    }
  }

  return pgResult
}

/**
 * Dual-write for upsert operations.
 */
export async function dualUpsert<T>(
  pgOp: () => Promise<T>,
  mysqlOp: () => Promise<any>,
  label?: string
): Promise<T> {
  const pgResult = await pgOp()

  if (prismaMysql) {
    try {
      await mysqlOp()
    } catch (error: any) {
      console.warn(
        `[DUAL-WRITE] MySQL upsert failed${label ? ` (${label})` : ''}:`,
        error?.message || error
      )
    }
  }

  return pgResult
}

/**
 * Dual-write for transactions: runs full transaction on PG, then replays on MySQL.
 */
export async function dualTransaction<T>(
  pgOp: () => Promise<T>,
  mysqlOp: () => Promise<any>,
  label?: string
): Promise<T> {
  const pgResult = await pgOp()

  if (prismaMysql) {
    try {
      await mysqlOp()
    } catch (error: any) {
      console.warn(
        `[DUAL-WRITE] MySQL transaction failed${label ? ` (${label})` : ''}:`,
        error?.message || error
      )
    }
  }

  return pgResult
}
