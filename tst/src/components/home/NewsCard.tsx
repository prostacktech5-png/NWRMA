import { Link } from 'react-router-dom'
import { ImageWithFallback } from '../ui/ImageWithFallback'
import type { NewsItem } from '../../data/news'
import './NewsCard.css'

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="news-card">
      {item.image && (
        <Link to={item.path} className="news-card__image">
          <ImageWithFallback localSrc={item.image} alt="" width={150} height={150} />
        </Link>
      )}
      <span className="news-card__badge">News</span>
      <div className="news-card__body">
        <h2 className="news-card__title">
          <Link to={item.path}>{item.title}</Link>
        </h2>
        <div className="news-card__meta">
          <time>{item.date}</time>
          <span>
            <i className="far fa-comments" /> {item.comments}
          </span>
        </div>
        {item.excerpt && !item.excerpt.startsWith('http') && <p className="news-card__excerpt">{item.excerpt}</p>}
      </div>
    </article>
  )
}
