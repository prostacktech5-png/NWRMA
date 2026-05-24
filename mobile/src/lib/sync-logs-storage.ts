import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SyncLog } from './db-types'

const SYNC_LOGS_KEY = 'hydrogauge_sync_logs_v2'

function normalizeLog(l: SyncLog): SyncLog {
  return {
    id: String(l.id),
    readingId: String(l.readingId),
    status: l.status === 'failed' ? 'failed' : 'success',
    error: typeof l.error === 'string' ? l.error : undefined,
    timestamp: String(l.timestamp ?? new Date().toISOString()),
  }
}

export async function loadSyncLogs(): Promise<SyncLog[]> {
  const raw = await AsyncStorage.getItem(SYNC_LOGS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => normalizeLog(item as SyncLog))
  } catch {
    return []
  }
}

export async function saveSyncLogs(logs: SyncLog[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(logs.map(normalizeLog)))
}

export async function addSyncLog(log: SyncLog): Promise<void> {
  const list = await loadSyncLogs()
  list.unshift(normalizeLog(log))
  await saveSyncLogs(list)
}

export async function clearSyncLogs(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_LOGS_KEY)
}
