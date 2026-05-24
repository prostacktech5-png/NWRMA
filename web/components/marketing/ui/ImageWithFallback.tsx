'use client'

import { useMemo, useState, type ImgHTMLAttributes } from 'react'
import { buildNewsImageCandidates } from '@/lib/marketing-news-images'

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  localSrc?: string
  /** Full fallback chain; when omitted, built from localSrc (wp-content live first). */
  sources?: string[]
}

export function ImageWithFallback({ localSrc, sources, alt, ...rest }: Props) {
  const chain = useMemo(() => {
    if (sources?.length) return sources
    if (localSrc) return buildNewsImageCandidates(localSrc)
    return []
  }, [sources, localSrc])

  const [index, setIndex] = useState(0)
  const src = chain[index]

  if (!src) return null

  return (
    <img
      {...rest}
      src={src}
      alt={alt ?? ''}
      onError={() => {
        if (index < chain.length - 1) setIndex((i) => i + 1)
      }}
    />
  )
}
