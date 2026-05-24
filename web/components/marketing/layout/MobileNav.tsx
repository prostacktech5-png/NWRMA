'use client'

import Link from 'next/link'
import { mainNav } from '@/lib/marketing-site/navigation'
import type { NavItem } from '@/lib/marketing-site/navigation'

function MobileNavItem({ item, onClose }: { item: NavItem; onClose: () => void }) {
  return (
    <li>
      {item.href ? (
        <a
          href={item.href}
          onClick={onClose}
          target={item.external ? '_blank' : undefined}
          rel={item.external ? 'noopener noreferrer' : undefined}
        >
          {item.label}
        </a>
      ) : item.path ? (
        <Link href={item.path} onClick={onClose}>
          {item.label}
        </Link>
      ) : (
        <span>{item.label}</span>
      )}
      {item.children && (
        <ul className="mobile-nav__sub">
          {item.children.map((child) => (
            <MobileNavItem key={child.label + (child.path ?? '')} item={child} onClose={onClose} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={`mobile-nav ${open ? 'open' : ''}`} onClick={onClose} role="presentation">
      <div className="mobile-nav__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mobile-nav__close" onClick={onClose} aria-label="Close menu">
          &times;
        </button>
        <ul className="mobile-nav__list">
          {mainNav.map((item) => (
            <MobileNavItem key={item.label} item={item} onClose={onClose} />
          ))}
        </ul>
      </div>
    </div>
  )
}
