import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getNewsPostBySlug, listPublishedNewsPosts } from '@/lib/marketing-news-store'
import { NewsArticlePage } from '@/components/marketing/pages/NewsArticlePage'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await listPublishedNewsPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getNewsPostBySlug(slug)
  if (!post) return { title: 'News' }
  return { title: post.title }
}

export default async function NewsArticleRoutePage({ params }: PageProps) {
  const { slug } = await params
  const post = await getNewsPostBySlug(slug)
  if (!post) notFound()
  return <NewsArticlePage post={post} />
}
