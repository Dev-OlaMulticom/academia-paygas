import { db } from './db'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''
const MAX_RETRIES = 5

export function isOnline(): boolean {
  return navigator.onLine
}

export async function queueSync(method: string, path: string, body?: any): Promise<void> {
  await db.syncQueue.add({
    method,
    path,
    body: body ? JSON.stringify(body) : '',
    createdAt: new Date().toISOString(),
    retryCount: 0,
  })
}

export async function processSyncQueue(): Promise<{ sent: number; failed: number }> {
  const pending = await db.syncQueue.orderBy('id').toArray()
  let sent = 0
  let failed = 0
  const token = localStorage.getItem('token')

  for (const item of pending) {
    if (item.retryCount >= MAX_RETRIES) {
      failed++
      continue
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (API_KEY) headers['X-API-Key'] = API_KEY
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}${item.path}`, {
        method: item.method,
        headers,
        body: item.body || undefined,
      })

      if (res.ok) {
        await db.syncQueue.delete(item.id!)
        sent++
      } else {
        await db.syncQueue.update(item.id!, { retryCount: item.retryCount + 1 })
        failed++
      }
    } catch {
      await db.syncQueue.update(item.id!, { retryCount: item.retryCount + 1 })
      failed++
    }
  }

  return { sent, failed }
}

export async function getPendingCount(): Promise<number> {
  return await db.syncQueue.count()
}

export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear()
}

let syncInterval: ReturnType<typeof setInterval> | null = null

export function startAutoSync(intervalMs = 30000): void {
  stopAutoSync()
  syncInterval = setInterval(async () => {
    if (isOnline()) {
      const pending = await getPendingCount()
      if (pending > 0) {
        await processSyncQueue()
      }
    }
  }, intervalMs)
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}
