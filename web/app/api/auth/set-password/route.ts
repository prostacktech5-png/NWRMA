import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import { verifyInviteToken } from '@/lib/invite-token'
import {
  coerceHydroNavAccess,
  defaultFullHydroNavAccess,
  hydroNavAccessAllowsAny,
} from '@/lib/hydro-nav-access'
import { upsertPasswordRecord } from '@/lib/local-password-store'
import { clearInviteExpiryForEmail } from '@/lib/user-invite-persistence'
import type { HydroNavAccess } from '@/lib/types'

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const payload = verifyInviteToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired invitation link' }, { status: 400 })
  }

  try {
    return await tryRespondWithDbSetupHint(async () => {
      const passwordHash = await bcrypt.hash(password, 12)

      let hydroNavAccess: HydroNavAccess | null = null
      if (payload.role === 'staff' && payload.department === 'hydrological') {
        hydroNavAccess =
          payload.hydroNavAccess != null
            ? coerceHydroNavAccess(payload.hydroNavAccess)
            : defaultFullHydroNavAccess()
        if (!hydroNavAccessAllowsAny(hydroNavAccess)) {
          hydroNavAccess = defaultFullHydroNavAccess()
        }
      }

      await upsertPasswordRecord({
        email: payload.email,
        passwordHash,
        username: payload.username,
        fullName: payload.fullName,
        role: payload.role,
        department: payload.role === 'dg' ? null : payload.department,
        hydroNavAccess,
      })
      await clearInviteExpiryForEmail(payload.email)
      return NextResponse.json({ ok: true })
    })
  } catch (e) {
    console.error('[set-password]', e)
    const message =
      e instanceof Error ? e.message : 'Could not save password. Try again later.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
