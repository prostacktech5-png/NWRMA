import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC = join(process.cwd(), 'public')

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath)
    return s.isFile()
  } catch {
    return false
  }
}

async function resolveHtmlPath(pathname: string): Promise<string | null> {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  const rel = normalized === '/' ? '' : normalized.replace(/^\//, '')

  const candidates = []
  if (normalized === '/') {
    candidates.push(join(PUBLIC, 'index.html'))
  } else if (/^\/index\.html@p=\d+$/.test(normalized)) {
    candidates.push(join(PUBLIC, normalized.slice(1)))
  } else {
    candidates.push(join(PUBLIC, rel, 'index.html'), join(PUBLIC, `${rel}.html`))
  }

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate
  }
  return null
}

export async function GET(request: NextRequest) {
  const pathname =
    request.nextUrl.searchParams.get('sitePath') ??
    request.headers.get('x-site-path') ??
    '/'
  const filePath = await resolveHtmlPath(pathname)

  if (!filePath) {
    return new NextResponse('Page not found', { status: 404 })
  }

  const html = await readFile(filePath, 'utf-8')
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
