import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { normalizePageHtml, attachImageFallbacks } from '../utils/normalizePageHtml'
import '../styles/page-content.css'

interface PageData {
  title: string
  html: string
}

function pathToSlug(pathname: string): string {
  if (pathname === '/') return 'home'
  return pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '_')
}

export function ContentPage() {
  const { pathname } = useLocation()
  const [page, setPage] = useState<PageData | null>(null)
  const [error, setError] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const slug = pathToSlug(pathname)
    setPage(null)
    setError(false)
    import(`../data/pages/${slug}.json`)
      .then((mod) => {
        const raw = mod.default as PageData
        setPage({
          title: raw.title,
          html: normalizePageHtml(raw.html),
        })
      })
      .catch(() => setError(true))
  }, [pathname])

  useEffect(() => {
    if (page && contentRef.current) {
      attachImageFallbacks(contentRef.current)
    }
  }, [page])

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <h1>Page not found</h1>
          <p>The page &quot;{pathname}&quot; could not be loaded.</p>
        </div>
      </section>
    )
  }

  if (!page) {
    return (
      <section className="section">
        <div className="container">
          <p>Loading…</p>
        </div>
      </section>
    )
  }

  return (
    <>
      <Helmet>
        <title>{page.title} - National Water Resources Management Agency</title>
      </Helmet>
      <section className="section page-content-section">
        <div
          ref={contentRef}
          className="page-content"
          dangerouslySetInnerHTML={{ __html: page.html }}
        />
      </section>
    </>
  )
}
