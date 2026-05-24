import { NextResponse } from 'next/server'
import { clearSessionOnResponse } from '@/lib/session-cookies'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  clearSessionOnResponse(res)
  return res
}
