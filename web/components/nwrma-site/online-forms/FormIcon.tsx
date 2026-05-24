import type { ReactNode } from 'react'
import type { OnlineFormIcon } from '@/lib/nwrma-site/online-forms/registry'

const ICONS: Record<OnlineFormIcon, ReactNode> = {
  drilling: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M24 8v28M18 36h12" strokeLinecap="round" />
      <path d="M20 14h8l2 6H18l2-6z" strokeLinejoin="round" />
      <path d="M16 22h16v4H16z" strokeLinejoin="round" />
      <circle cx="24" cy="8" r="2" fill="currentColor" stroke="none" />
      <path d="M14 30h4v6h-4zM30 30h4v6h-4z" strokeLinejoin="round" />
    </svg>
  ),
  dam: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 28c4-8 8-12 16-12s12 4 16 12" strokeLinecap="round" />
      <path d="M6 32h36" strokeLinecap="round" />
      <path d="M12 32v8M36 32v8" strokeLinecap="round" />
      <path d="M22 20v12M26 20v12" strokeLinecap="round" />
      <path d="M18 24h12" strokeLinecap="round" />
    </svg>
  ),
  effluent: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M18 10h12v6c0 4-2 6-6 6s-6-2-6-6v-6z" strokeLinejoin="round" />
      <path d="M24 22v4" strokeLinecap="round" />
      <path d="M24 26c-3 0-5 2-5 5v2h10v-2c0-3-2-5-5-5z" strokeLinejoin="round" />
      <path d="M22 38h4" strokeLinecap="round" />
      <circle cx="24" cy="34" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  'water-right': (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M10 32c0-10 8-18 14-22 6 4 14 12 14 22H10z" strokeLinejoin="round" />
      <circle cx="32" cy="16" r="9" strokeWidth="1.5" />
      <path d="M29 16l2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

export function FormIcon({ name }: { name: OnlineFormIcon }) {
  return <span className="nwrma-form-card__icon">{ICONS[name]}</span>
}
