import { assignUserRoles, userHasSuperAdminRole } from '@/lib/db/rbac-persistence'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  createAdminUser,
  findUserIdByEmail,
  resetAdminUserPassword,
} from '@/lib/super-admin/users-admin'

export async function POST(req: Request) {
  const secret = process.env.SUPER_ADMIN_BOOTSTRAP_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'Bootstrap not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (auth !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { email?: string; password?: string; fullName?: string }
  try {
    body = (await req.json()) as { email?: string; password?: string; fullName?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) {
    return Response.json({ error: 'email required' }, { status: 400 })
  }
  const password = typeof body.password === 'string' ? body.password : undefined
  const fullName =
    typeof body.fullName === 'string' && body.fullName.trim()
      ? body.fullName.trim()
      : 'Super Admin'

  return tryRespondWithDbSetupHint(async () => {
    let userId = await findUserIdByEmail(email)
    let created = false

    if (!userId) {
      if (!password) {
        return Response.json(
          { error: 'User not found. Provide password to create the account.' },
          { status: 404 }
        )
      }
      const user = await createAdminUser({
        email,
        fullName,
        role: 'hod',
        department: 'hr',
        password,
        roleIds: ['role_super_admin'],
      })
      userId = user.id
      created = true
      await resetAdminUserPassword(userId, password, false)
      return Response.json({ ok: true, userId, created, superAdmin: true })
    }

    if (password) {
      await resetAdminUserPassword(userId, password, false)
    }

    if (!(await userHasSuperAdminRole(userId))) {
      await assignUserRoles(userId, ['role_super_admin'], 'role_super_admin')
    }

    return Response.json({
      ok: true,
      userId,
      created,
      superAdmin: true,
      message: (await userHasSuperAdminRole(userId))
        ? 'Super admin ready'
        : 'Role assigned',
    })
  })
}
