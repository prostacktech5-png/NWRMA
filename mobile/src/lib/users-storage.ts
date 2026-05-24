import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from './db-types'

const USERS_KEY = 'hydrogauge_users_v3'

function normalizeUser(u: User): User {
  return {
    id: String(u.id),
    phone: String(u.phone ?? '').trim(),
    name: String(u.name ?? '').trim(),
    password: String(u.password ?? ''),
    createdAt: String(u.createdAt ?? new Date().toISOString()),
  }
}

export async function loadUsers(): Promise<User[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => normalizeUser(item as User))
  } catch {
    return []
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users.map(normalizeUser)))
}

export async function upsertUser(user: User): Promise<void> {
  const u = normalizeUser(user)
  const list = await loadUsers()
  const i = list.findIndex((x) => x.id === u.id)
  if (i >= 0) list[i] = u
  else list.unshift(u)
  await saveUsers(list)
}

export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const p = phone.trim()
  const digits = p.replace(/\D/g, '')
  return (await loadUsers()).find((u) => {
    const up = u.phone.trim()
    if (up === p) return true
    const ud = up.replace(/\D/g, '')
    if (digits && ud && digits === ud) return true
    if (digits.length >= 8 && ud.length >= 8) {
      return digits.slice(-9) === ud.slice(-9)
    }
    return false
  })
}

export async function getUserById(id: string): Promise<User | undefined> {
  return (await loadUsers()).find((x) => x.id === id)
}
