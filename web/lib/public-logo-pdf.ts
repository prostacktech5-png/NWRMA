import { readFile } from 'fs/promises'
import path from 'path'
import {
  DEFAULT_PUBLIC_LOGO_PATH,
  FALLBACK_PUBLIC_LOGO_PATH,
} from '@/lib/app-branding'
import type { ReportPdfLogo } from '@/lib/hydro-activity-report-pdf-logo'

function fileToLogo(buffer: Buffer, ext: string): ReportPdfLogo {
  const format = ext === '.png' ? ('PNG' as const) : ('JPEG' as const)
  return { base64: buffer.toString('base64'), format }
}

/** Load NWRMA seal from `public/` for server-side PDF generation. */
export async function loadPublicLogoForPdf(): Promise<ReportPdfLogo | null> {
  const paths = [DEFAULT_PUBLIC_LOGO_PATH, FALLBACK_PUBLIC_LOGO_PATH]
  for (const publicPath of paths) {
    const rel = publicPath.replace(/^\//, '')
    const full = path.join(process.cwd(), 'public', rel)
    try {
      const buffer = await readFile(full)
      return fileToLogo(buffer, path.extname(full).toLowerCase())
    } catch {
      /* try next */
    }
  }
  return null
}
