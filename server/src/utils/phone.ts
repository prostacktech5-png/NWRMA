import type { User } from '@prisma/client'
import prisma from '../prisma/client.js'

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

/** Loose match for international vs national formatting (last 9 digits). */
export function phonesRoughlyEqual(a: string, b: string): boolean {
  const da = digitsOnly(a)
  const db = digitsOnly(b)
  if (!da || !db) return false
  if (da === db) return true
  if (da.length >= 8 && db.length >= 8) {
    return da.slice(-9) === db.slice(-9)
  }
  return false
}

/** Single stored form: digits with Sierra Leone country code when applicable. */
export function canonicalPhone(phone: string): string {
  const d = digitsOnly(phone.trim())
  if (!d) return ''
  if (d.startsWith('232')) return d
  if (d.startsWith('0') && d.length >= 9) return `232${d.slice(1)}`
  if (d.length === 8 || d.length === 9) return `232${d.replace(/^0+/, '')}`
  return d
}

export async function findUserByPhone(input: string): Promise<User | null> {
  const trimmed = input.trim()
  if (!trimmed) return null

  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    take: 500,
  })

  return users.find((u) => u.phone && phonesRoughlyEqual(u.phone, trimmed)) ?? null
}
