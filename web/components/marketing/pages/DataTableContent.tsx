'use client'

import { useEffect, useRef } from 'react'
import { enhanceDataTables } from '@/lib/marketing-site/enhanceDataTables'
import { attachImageFallbacks } from '@/lib/marketing-site/normalizePageHtml'

export function DataTableContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    attachImageFallbacks(el)

    el.querySelectorAll<HTMLAnchorElement>('a.b2link').forEach((link) => {
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
    <div
      ref={ref}
      className="data-page__content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
