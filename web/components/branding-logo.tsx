'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_PUBLIC_LOGO_PATH,
  FALLBACK_PUBLIC_LOGO_PATH,
  resolveBrandingLogoSrc,
} from '@/lib/app-branding'
import type { AppBranding } from '@/lib/app-branding'

function useBrandingLogoSrc(branding: AppBranding): { src: string; onError: () => void } {
  const primary = resolveBrandingLogoSrc(branding)
  const [src, setSrc] = useState(primary)

  useEffect(() => {
    setSrc(primary)
  }, [primary])

  const onError = useCallback(() => {
    setSrc((current) => {
      if (current === FALLBACK_PUBLIC_LOGO_PATH) return current
      if (primary.startsWith('data:image/')) return FALLBACK_PUBLIC_LOGO_PATH
      if (current !== FALLBACK_PUBLIC_LOGO_PATH) return FALLBACK_PUBLIC_LOGO_PATH
      if (current !== DEFAULT_PUBLIC_LOGO_PATH) return DEFAULT_PUBLIC_LOGO_PATH
      return current
    })
  }, [primary])

  return { src, onError }
}

type BrandingLogoProps = {
  branding: AppBranding
  className?: string
}

/** Logo tile for sidebar and compact placements. */
export function BrandingLogoMark({ branding, className }: BrandingLogoProps) {
  const { src, onError } = useBrandingLogoSrc(branding)
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm ring-1 ring-black/10',
        className,
      )}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-contain"
        onError={onError}
      />
    </div>
  )
}

type BrandingLogoPrimaryProps = {
  branding: AppBranding
  /** Outer box; overrides defaults (e.g. login uses circular white frame). */
  boxClassName?: string
}

export function BrandingLogoPrimary({ branding, boxClassName }: BrandingLogoPrimaryProps) {
  const { src, onError } = useBrandingLogoSrc(branding)
  return (
    <div
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl',
        'bg-card p-1 ring-2 ring-primary',
        boxClassName,
      )}
    >
      <img src={src} alt="" className="h-full w-full object-contain" onError={onError} />
    </div>
  )
}
