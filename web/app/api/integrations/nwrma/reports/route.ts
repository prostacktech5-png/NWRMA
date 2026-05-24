import { NextResponse } from 'next/server'
import { readNwrmaAccessTokenFromRequest } from '@/lib/session-cookies'

/**
 * Proxies authenticated requests to the NWRMA API server (no Postgres from the browser).
 * Uses `Authorization: Bearer` when sent, otherwise the httpOnly `nwrma_access_token` cookie from login.
 */

function serverBase(): string | null {
  const u =
    process.env.NWRMA_SERVER_URL?.trim() ?? process.env.NEXT_PUBLIC_NWRMA_SERVER_URL?.trim()
  return u && u.length > 0 ? u.replace(/\/$/, '') : null
}

export async function GET(req: Request): Promise<Response> {
  const base = serverBase()
  if (!base) {
    return NextResponse.json(
      { error: 'NWRMA_SERVER_URL is not configured on the Next.js server.' },
      { status: 503 }
    )
  }

  const headerAuth = req.headers.get('authorization')
  const token = readNwrmaAccessTokenFromRequest(req)
  const auth =
    headerAuth?.startsWith('Bearer ') && headerAuth.length > 7
      ? headerAuth
      : token
        ? `Bearer ${token}`
        : null

  if (!auth) {
    return NextResponse.json(
      { error: 'Not signed in with NWRMA API token (upstream login), or missing Authorization.' },
      { status: 401 }
    )
  }

  const url = new URL(req.url)
  const search = url.searchParams.toString()
  const path = `/reports${search ? `?${search}` : ''}`

  const upstream = await fetch(`${base}${path}`, {
    method: 'GET',
    headers: {
      authorization: auth,
      accept: 'application/json',
    },
    cache: 'no-store',
  })

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
