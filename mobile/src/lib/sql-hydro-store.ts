/**
 * Offline-first store. Users + sync logs use AsyncStorage (avoids expo-sqlite Android bind errors).
 * Water readings use readings-storage (AsyncStorage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SyncLog, User, WaterReading } from './db-types'
import {
  deleteReadingsForPhone as deleteReadingsStorage,
  loadReadings,
  normalizeReading,
  patchReading,
  readingsForPhone,
  saveReadings,
  upsertReading as upsertReadingStorage,
} from './readings-storage'
import {
  addSyncLog as addSyncLogStorage,
  clearSyncLogs as clearSyncLogsStorage,
  loadSyncLogs,
} from './sync-logs-storage'
import {
  getUserById as getUserByIdStorage,
  getUserByPhone as getUserByPhoneStorage,
  loadUsers,
  upsertUser as upsertUserStorage,
} from './users-storage'

export {
  parseRiverLocationOption,
  RIVER_LOCATION_OPTIONS,
  RIVER_OTHER_VALUE,
  RIVER_OPTION_SEPARATOR,
} from './db-types'
export type { User, WaterReading, SyncLog } from './db-types'

const LEGACY = {
  users: 'hydrogauge_users_v1',
  readings: 'hydrogauge_readings_v1',
  syncLogs: 'hydrogauge_sync_logs_v1',
} as const

let legacyMigrated = false

async function migrateLegacyFromAsync(): Promise<void> {
  if (legacyMigrated) return
  legacyMigrated = true

  try {
    const rawReadings = await AsyncStorage.getItem(LEGACY.readings)
    if (rawReadings) {
      const readings = JSON.parse(rawReadings) as WaterReading[]
      for (const r of readings) {
        await upsertReadingStorage(normalizeReading(r))
      }
      await AsyncStorage.removeItem(LEGACY.readings)
    }

    const rawUsers = await AsyncStorage.getItem(LEGACY.users)
    if (rawUsers) {
      const users = JSON.parse(rawUsers) as User[]
      for (const u of users) {
        await upsertUserStorage(u)
      }
      await AsyncStorage.removeItem(LEGACY.users)
    }

    const rawLogs = await AsyncStorage.getItem(LEGACY.syncLogs)
    if (rawLogs) {
      const logs = JSON.parse(rawLogs) as SyncLog[]
      for (const l of logs) {
        await addSyncLogStorage(l)
      }
      await AsyncStorage.removeItem(LEGACY.syncLogs)
    }
  } catch (e) {
    console.warn('Legacy AsyncStorage migration skipped:', e)
  }
}

export const hydroStore = {
  async getUsers(): Promise<User[]> {
    await migrateLegacyFromAsync()
    const users = await loadUsers()
    return [...users].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  },

  async addUser(user: User): Promise<void> {
    await migrateLegacyFromAsync()
    await upsertUserStorage(user)
  },

  async getUserByPhone(phone: string): Promise<User | undefined> {
    await migrateLegacyFromAsync()
    return getUserByPhoneStorage(phone)
  },

  async getUserById(id: string): Promise<User | undefined> {
    await migrateLegacyFromAsync()
    return getUserByIdStorage(id)
  },

  async getReadings(): Promise<WaterReading[]> {
    return loadReadings()
  },

  async addReading(r: WaterReading): Promise<void> {
    await upsertReadingStorage(normalizeReading(r))
  },

  async updateReading(id: string, patch: Partial<WaterReading>): Promise<void> {
    await patchReading(id, patch)
  },

  async readingsWherePhone(phone: string): Promise<WaterReading[]> {
    return readingsForPhone(phone)
  },

  async readingsBySyncStatuses(
    statuses: Array<WaterReading['syncStatus']>,
  ): Promise<WaterReading[]> {
    const all = await hydroStore.getReadings()
    return all.filter((r) => statuses.includes(r.syncStatus))
  },

  async readingsBySyncStatusesForPhone(
    phone: string,
    statuses: Array<WaterReading['syncStatus']>,
  ): Promise<WaterReading[]> {
    const p = phone.trim()
    if (!p) return []
    const mine = await readingsForPhone(p)
    return mine.filter((r) => statuses.includes(r.syncStatus))
  },

  async deleteReadingsForPhone(phone: string): Promise<void> {
    await deleteReadingsStorage(phone)
  },

  async setAllFailedToPending(): Promise<void> {
    const list = await loadReadings()
    let changed = false
    for (const r of list) {
      if (r.syncStatus === 'failed') {
        r.syncStatus = 'pending'
        r.syncError = undefined
        changed = true
      }
    }
    if (changed) await saveReadings(list)
  },

  async setFailedToPendingForPhone(phone: string): Promise<void> {
    const p = phone.trim()
    if (!p) return
    const list = await loadReadings()
    let changed = false
    for (const r of list) {
      if (r.officerPhone.trim() === p && r.syncStatus === 'failed') {
        r.syncStatus = 'pending'
        r.syncError = undefined
        changed = true
      }
    }
    if (changed) await saveReadings(list)
  },

  async getSyncLogs(): Promise<SyncLog[]> {
    await migrateLegacyFromAsync()
    return loadSyncLogs()
  },

  async addSyncLog(log: SyncLog): Promise<void> {
    await migrateLegacyFromAsync()
    await addSyncLogStorage(log)
  },

  async clearSyncLogs(): Promise<void> {
    await clearSyncLogsStorage()
  },

  async recentSyncLogs(limit: number): Promise<SyncLog[]> {
    const logs = await hydroStore.getSyncLogs()
    return [...logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  },

  async recentSyncLogsForPhone(limit: number, phone: string): Promise<SyncLog[]> {
    const p = phone.trim()
    if (!p) return []
    const mine = await readingsForPhone(p)
    const readingIds = new Set(mine.map((r) => r.id))
    const logs = await hydroStore.getSyncLogs()
    return [...logs]
      .filter((l) => readingIds.has(l.readingId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  },
}
