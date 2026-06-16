import { useState, useEffect, useCallback } from 'react'
import { isOnline, processSyncQueue, getPendingCount, startAutoSync, stopAutoSync } from '../lib/sync'

export function useSync() {
  const [online, setOnline] = useState(isOnline())
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingCount()
    setPendingCount(count)
  }, [])

  const forceSync = useCallback(async () => {
    if (!isOnline() || isSyncing) return
    setIsSyncing(true)
    try {
      await processSyncQueue()
      await updatePendingCount()
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, updatePendingCount])

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      forceSync()
    }
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    updatePendingCount()
    startAutoSync(30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      stopAutoSync()
    }
  }, [])

  useEffect(() => {
    updatePendingCount()
  }, [pendingCount])

  return { isOnline: online, pendingCount, isSyncing, forceSync }
}
