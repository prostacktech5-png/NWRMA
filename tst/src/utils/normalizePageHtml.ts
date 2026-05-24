const LIVE_UPLOADS = 'https://nwrma.gov.sl/wp-content/uploads'

/** Normalize crawled WordPress HTML for local React app. */
export function normalizePageHtml(html: string): string {
  let out = html

  out = out.replace(/\/\/nwrma\.gov\.sl\/+\/assets\/uploads\//g, '/assets/uploads/')
  out = out.replace(/\/\/nwrma\.gov\.sl\/+wp-content\/uploads\//g, '/assets/uploads/')
  out = out.replace(/https?:\/\/(?:www\.)?nwrma\.gov\.sl\/wp-content\/uploads\//g, '/assets/uploads/')
  out = out.replace(/wp-content\/uploads\//g, '/assets/uploads/')
  out = out.replace(/url\(\s*\/\/nwrma\.gov\.sl/g, 'url(')
  out = out.replace(/href="https:\/\/nwrma\.gov\.sl/g, 'href="')
  out = out.replace(/href='https:\/\/nwrma\.gov\.sl/g, "href='")

  // Use live CDN fallback for images still broken locally (encoded in data attribute handled at runtime)
  out = out.replace(
    /src="\/assets\/uploads\/([^"]+)"/g,
    (_, path) => `src="/assets/uploads/${path}" data-fallback="${LIVE_UPLOADS}/${path}"`,
  )

  return out
}

export function attachImageFallbacks(container: HTMLElement): void {
  container.querySelectorAll<HTMLImageElement>('img[data-fallback]').forEach((img) => {
    const fallback = img.getAttribute('data-fallback')
    if (!fallback) return
    img.addEventListener('error', () => {
      if (img.src !== fallback) img.src = fallback
    }, { once: true })
  })

  container.querySelectorAll<HTMLElement>('[style*="background-image"]').forEach((el) => {
    const style = el.getAttribute('style') ?? ''
    const m = style.match(/url\(['"]?(\/assets\/uploads\/[^'")]+)['"]?\)/)
    if (!m) return
    const local = m[1]
    const live = LIVE_UPLOADS + local.replace('/assets/uploads', '')
    const probe = new Image()
    probe.onerror = () => {
      el.style.backgroundImage = style.replace(local, live)
    }
    probe.src = local
  })
}
