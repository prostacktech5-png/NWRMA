import { useState, type ImgHTMLAttributes } from 'react'

const LIVE = 'https://nwrma.gov.sl/wp-content/uploads'

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  localSrc: string
}

export function ImageWithFallback({ localSrc, alt, ...rest }: Props) {
  const [src, setSrc] = useState(localSrc)
  const fallback = localSrc.startsWith('/assets/uploads/')
    ? LIVE + localSrc.replace('/assets/uploads', '')
    : undefined

  return (
    <img
      {...rest}
      src={src}
      alt={alt ?? ''}
      onError={() => {
        if (fallback && src !== fallback) setSrc(fallback)
      }}
    />
  )
}
