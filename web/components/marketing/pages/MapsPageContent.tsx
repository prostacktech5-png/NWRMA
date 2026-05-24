'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { attachImageFallbacks } from '@/lib/marketing-site/normalizePageHtml'

export function MapsPageContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const closeLightbox = useCallback(() => setLightboxSrc(null), [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    attachImageFallbacks(el)

    const links = el.querySelectorAll<HTMLAnchorElement>('.w-image-h[href]')
    const handlers: Array<{ link: HTMLAnchorElement; fn: (e: Event) => void }> = []

    links.forEach((link) => {
      const fn = (e: Event) => {
        const href = link.getAttribute('href')
        if (!href || href.startsWith('#')) return
        e.preventDefault()
        const src = href.startsWith('//') ? `https:${href}` : href
        setLightboxSrc(src.startsWith('/') ? src : src)
      }
      link.addEventListener('click', fn)
      handlers.push({ link, fn })
    })

    return () => {
      handlers.forEach(({ link, fn }) => link.removeEventListener('click', fn))
    }
  }, [html])

  useEffect(() => {
    if (!lightboxSrc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxSrc, closeLightbox])

  return (
    <>
      <div
        ref={ref}
        className="data-page__content data-page__content--maps"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {lightboxSrc && (
        <div
          className="data-maps-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged map"
          onClick={closeLightbox}
        >
          <button type="button" className="data-maps-lightbox__close" aria-label="Close" onClick={closeLightbox}>
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxSrc} alt="" className="data-maps-lightbox__img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
