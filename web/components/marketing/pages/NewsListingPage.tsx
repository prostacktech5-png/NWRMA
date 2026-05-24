'use client'

import { useState } from 'react'
import type { NewsItem } from '@/lib/marketing-site/news'
import { NewsCard } from '@/components/marketing/home/NewsCard'
import './news-listing.css'

const PAGE_SIZE = 3

export function NewsListingPage({ items }: { items: NewsItem[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = items.slice(0, visibleCount)
  const hasMore = visibleCount < items.length

  return (
    <section className="news-listing">
      <div className="news-listing__inner">
        <h1 className="news-listing__title">News</h1>

        <div className="news-listing__grid">
          {visible.map((item) => (
            <NewsCard key={item.path} item={item} variant="listing" />
          ))}
        </div>

        {hasMore && (
          <div className="news-listing__more">
            <button
              type="button"
              className="news-listing__more-btn"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            >
              Show More News
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
