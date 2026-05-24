/**
 * Proxies field readings to the main ERP Next.js ingest endpoint so Hydrological → Water Level Readings stays in sync.
 *
 * Configure in `android app/.env.local` (server-side only — never commit secrets):
 * - `NWRMA_WEB_ORIGIN` — base URL of the ERP web app (default `http://127.0.0.1:3000`)
 * - `HYDRO_API_KEY` — must match `HYDRO_API_KEY` in the ERP `web/.env.local`
 */
export async function POST(req: Request) {
  const origin = (process.env.NWRMA_WEB_ORIGIN ?? 'http://127.0.0.1:3000').replace(/\/$/, '').trim()
  const key = process.env.HYDRO_API_KEY?.trim()
  if (!key) {
    return Response.json(
      {
        error:
          'Server misconfigured: set HYDRO_API_KEY in android app .env.local (same value as ERP web HYDRO_API_KEY).',
      },
      { status: 500 },
    )
  }

  const payload = await req.text()
  const upstream = await fetch(`${origin}/api/hydrological/readings`, {
    method: 'POST',
    headers: {
      'Content-Type': req.headers.get('content-type') || 'application/json',
      'X-Hydro-Api-Key': key,
    },
    body: payload,
  })

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
    },
  })
}

export async function GET() {
  return Response.json({
    message:
      'POST JSON readings here; they are forwarded to the ERP /api/hydrological/readings ingest (configure NWRMA_WEB_ORIGIN + HYDRO_API_KEY).',
    version: '2.0.0',
  })
}
