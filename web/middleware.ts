import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEMO_ACTING_USER_COOKIE } from '@/lib/demo-acting-user'
import { isPublicSitePath } from '@/lib/nwrma-site/public-paths'
import { isMarketingPath } from '@/lib/nwrma-site/static-site-paths'
import { SESSION_COOKIE } from '@/lib/super-admin/session-constants'

const AUTH_PAGES = ['/login', '/forgot-password', '/set-password']

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isPublicApi(pathname: string): boolean {
  if (pathname.startsWith('/api/auth/')) return true
  if (pathname.startsWith('/api/health')) return true
  if (pathname.startsWith('/api/integrations/')) return true
  if (pathname.startsWith('/api/public/')) return true
  return false
}

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/assets/')) return true
  if (pathname.startsWith('/wp-content/') || pathname.startsWith('/wp-includes/')) {
    return true
  }
  if (pathname === '/index.html' || pathname === '/robots.txt') return true
  if (pathname.includes('.')) return true
  return false
}

function hasSessionCookie(req: NextRequest): boolean {
  const session = req.cookies.get(SESSION_COOKIE)?.value?.trim()
  const legacy = req.cookies.get(DEMO_ACTING_USER_COOKIE)?.value?.trim()
  return Boolean(session || legacy)
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  if (isAuthPage(pathname) || isPublicApi(pathname) || isPublicSitePath(pathname)) {
    return NextResponse.next()
  }

  if (isMarketingPath(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/super-admin')) {
    if (!hasSessionCookie(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (!hasSessionCookie(req)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const login = new URL('/login', req.url)
    if (pathname !== '/login') {
      login.searchParams.set('next', pathname)
    }
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
