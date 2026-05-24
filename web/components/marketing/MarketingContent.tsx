'use client'

import { useEffect, useRef } from 'react'
import { enhanceDataTables } from '@/lib/marketing-site/enhanceDataTables'
import { attachImageFallbacks } from '@/lib/marketing-site/normalizePageHtml'
import '@/styles/marketing/page-content.css'

export function MarketingContent({ html }: { html: string }) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    attachImageFallbacks(el)

    el.querySelectorAll<HTMLAnchorElement>('a.b2link, a.btn').forEach((link) => {
      if (!link.classList.contains('data-download-btn')) {
        link.classList.add('data-download-btn')
      }
    })

    const cleanups = enhanceDataTables(el)

    return () => {
      cleanups.forEach((fn) => fn())
    }
  }, [html])

  return (
    <section className="section page-content-section">
      <div ref={contentRef} className="page-content" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  )
}
