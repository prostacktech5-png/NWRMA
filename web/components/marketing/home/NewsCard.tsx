import Link from 'next/link'
import { ImageWithFallback } from '@/components/marketing/ui/ImageWithFallback'
import type { NewsItem } from '@/lib/marketing-site/news'
import './NewsCard.css'

type NewsCardProps = {
  item: NewsItem
  variant?: 'home' | 'listing'
}

export function NewsCard({ item, variant = 'home' }: NewsCardProps) {
  const isListing = variant === 'listing'
  const showExcerpt =
    item.excerpt && !item.excerpt.startsWith('http') && !item.excerpt.startsWith('https://')

  return (
    <article className={`news-card ${isListing ? 'news-card--listing' : ''}`}>
      <Link href={item.path} className="news-card__media">
        {item.image || item.imageSources?.length ? (
          <ImageWithFallback
            localSrc={item.image}
            sources={item.imageSources}
            alt=""
            width={isListing ? 640 : 400}
            height={isListing ? 420 : 260}
            sizes={isListing ? '(max-width: 599px) 100vw, 33vw' : undefined}
          />
        ) : (
          <span className="news-card__media-placeholder" aria-hidden />
        )}
        <span className="news-card__badge">News</span>
      </Link>
      <div className="news-card__body">
        <h2 className="news-card__title">
          <Link href={item.path}>{item.title}</Link>
        </h2>
        <div className="news-card__meta">
          <time>{item.date}</time>
          <span>
            <i className="far fa-comments" aria-hidden /> {item.comments}
          </span>
        </div>
        {showExcerpt && <p className="news-card__excerpt">{item.excerpt}</p>}
      </div>
    </article>
  )
}
