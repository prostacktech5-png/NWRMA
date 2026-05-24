import { NextResponse } from 'next/server'
import { verifyInviteToken } from '@/lib/invite-token'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')?.trim()
  if (!token) {
    return NextResponse.json({ valid: false, error: 'Missing token' }, { status: 400 })
  }

  const payload = verifyInviteToken(token)
  if (!payload) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired link' }, { status: 400 })
  }

  return NextResponse.json({
    valid: true,
    email: payload.email,
    fullName: payload.fullName,
    username: payload.username,
    role: payload.role,
    department: payload.department,
  })
}
