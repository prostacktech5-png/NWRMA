import {
  DEFAULT_PUBLIC_LOGO_PATH,
  type AppBranding,
} from '@/lib/app-branding'

export type ReportPdfLogo = {
  base64: string
  format: 'PNG' | 'JPEG'
}

function dataUrlToLogo(dataUrl: string): ReportPdfLogo | null {
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!m) return null
  const ext = m[1].toLowerCase()
  const format = ext === 'png' ? ('PNG' as const) : ('JPEG' as const)
  return { base64: m[2], format }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(blob)
  })
}

/**
 * Loads the NWRMA seal for jsPDF (PNG/JPEG only). Uses uploaded branding when present,
 * otherwise the default public logo path.
 */
export async function resolveReportLogoForPdf(branding: AppBranding): Promise<ReportPdfLogo | null> {
  if (
    typeof branding.logoDataUrl === 'string' &&
    branding.logoDataUrl.startsWith('data:image/')
  ) {
    const fromUpload = dataUrlToLogo(branding.logoDataUrl)
    if (fromUpload) return fromUpload
  }

  const path = DEFAULT_PUBLIC_LOGO_PATH.startsWith('/')
    ? DEFAULT_PUBLIC_LOGO_PATH
    : `/${DEFAULT_PUBLIC_LOGO_PATH}`

  try {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await blobToDataUrl(blob)
    return dataUrlToLogo(dataUrl)
  } catch {
    return null
  }
}
