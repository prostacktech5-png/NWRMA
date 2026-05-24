import Link from 'next/link'
import { ImageWithFallback } from '@/components/marketing/ui/ImageWithFallback'
import type { MarketingNewsPost } from '@/lib/marketing-site/news-types'
import './news-article.css'

export function NewsArticlePage({ post }: { post: MarketingNewsPost }) {
  return (
    <article className="news-article">
      <div className="news-article__inner">
        <p className="news-article__back">
          <Link href="/news">← Back to News</Link>
        </p>
        <h1 className="news-article__title">{post.title}</h1>
        <div className="news-article__meta">
          <time dateTime={post.publishedAt}>{post.date}</time>
          <span>
            <i className="far fa-comments" aria-hidden /> {post.comments}
          </span>
        </div>
        {post.image && (
          <figure className="news-article__figure">
            <ImageWithFallback
              localSrc={post.image}
              alt=""
              width={1024}
              height={683}
              className="news-article__img"
            />
          </figure>
        )}
        {post.excerpt && <p className="news-article__excerpt">{post.excerpt}</p>}
        <div
          className="news-article__body"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      </div>
    </article>
  )
}
