import { jsonSessionUser, resolveSessionBootstrap } from '@/lib/session-bootstrap'

/** Resolves the signed-in user from Postgres `User` (session cookie). */
export async function GET(req: Request) {
  const { user, platformRoles, canAccessSuperAdmin } = await resolveSessionBootstrap(req)
  if (!user) {
    return Response.json({ user: null })
  }
  return Response.json({
    user: jsonSessionUser(user),
    platformRoles,
    canAccessSuperAdmin,
  })
}
