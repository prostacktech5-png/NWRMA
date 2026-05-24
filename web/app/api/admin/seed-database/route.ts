import { seedDatabaseFull } from '@/lib/db/seed-database'

/**
 * Loads demo data only — requires tables to exist already.
 * Guard with `SEED_SECRET` in `.env.local`; send header `x-seed-secret: <value>`.
 */
export async function POST(req: Request) {
  const secret = process.env.SEED_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'SEED_SECRET is not configured on the server.' }, { status: 503 })
  }
  const provided = req.headers.get('x-seed-secret')
  if (provided !== secret) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  try {
    await seedDatabaseFull()
    return Response.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Seed failed.'
    return Response.json({ error: message }, { status: 500 })
  }
}
