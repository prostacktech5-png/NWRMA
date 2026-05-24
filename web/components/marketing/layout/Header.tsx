'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mainNav, topBarLinks, topNavLinks, socialLinks } from '@/lib/marketing-site/navigation'
import type { NavItem } from '@/lib/marketing-site/navigation'
import { isProjectPageRoute } from '@/lib/marketing-site/project-routes'
import { MobileNav } from '@/components/marketing/layout/MobileNav'
import { ImageWithFallback } from '@/components/marketing/ui/ImageWithFallback'

function collectNavPaths(item: NavItem): string[] {
  const paths: string[] = []
  if (item.path) paths.push(item.path)
  for (const child of item.children ?? []) paths.push(...collectNavPaths(child))
  return paths
}

function isNavItemActive(item: NavItem, pathname: string): boolean {
  const paths = collectNavPaths(item)
  if (paths.length === 0) return false
  if (paths.includes('/')) return pathname === '/'
  if (item.path === '/projects' && isProjectPageRoute(pathname)) return true
  return paths.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)),
  )
}

function MainNavItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()
  const isActive = isNavItemActive(item, pathname)
  const hasChildren = Boolean(item.children?.length)

  if (hasChildren) {
    const trigger = item.path ? (
      <Link href={item.path} className="nav-parent">
        {item.label}
      </Link>
    ) : (
      <span className="nav-parent">{item.label}</span>
    )
    const menu = (
      <ul className="sub-menu">
        {item.children!.map((child) => (
          <MainNavItem key={child.label + (child.path ?? '')} item={child} depth={depth + 1} />
        ))}
      </ul>
    )
    if (depth === 0) {
      return (
        <li className={`${isActive ? 'active' : ''} has-children`}>
          <div className="header__nav-drop">
            {trigger}
            {menu}
          </div>
        </li>
      )
    }
    return (
      <li className={`${isActive ? 'active' : ''} has-children`}>
        {trigger}
        {menu}
      </li>
    )
  }

  if (item.href) {
    return (
      <li>
        <a
          href={item.href}
          target={item.external ? '_blank' : undefined}
          rel={item.external ? 'noopener noreferrer' : undefined}
        >
          {item.label}
        </a>
      </li>
    )
  }

  return (
    <li className={isActive ? 'active' : ''}>
      <Link href={item.path ?? '/'}>{item.label}</Link>
    </li>
  )
}

export function MarketingHeader() {
  const [sticky, setSticky] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`header ${sticky ? 'header--sticky' : ''}`}>
        <div className="header__top">
          <div className="header__top-inner">
            <div className="header__top-row">
              <div className="header__top-left">
                {topBarLinks.map((link) => (
                  <a
                    key={link.label}
                    className="header__top-item"
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                  >
                    <i className={`fas fa-${link.label.includes('@') ? 'envelope' : 'phone'}`} aria-hidden />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
              <div className="header__top-right">
                <ul className="header__top-links">
                  {topNavLinks.map((item) => (
                    <li key={item.label}>
                      <Link className="header__top-item" href={item.path ?? '/'}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="header__socials">
                  {socialLinks.map((s) => (
                    <a
                      key={s.label}
                      className="header__top-item header__top-item--icon"
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                    >
                      <i className={s.icon} aria-hidden />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="header__middle">
          <div className="header__middle-inner">
            <Link href="/" className="header__logo">
              <ImageWithFallback localSrc="/assets/uploads/2020/10/2-2.png" alt="NWRMA Logo" width={280} height={280} />
            </Link>
            <nav className="header__nav" aria-label="Main navigation">
              <ul className="header__main-nav">
                {mainNav.map((item) => (
                  <MainNavItem key={item.label} item={item} />
                ))}
              </ul>
              <button type="button" className="header__search-btn" aria-label="Search">
                <i className="fas fa-search" />
              </button>
              <button type="button" className="header__burger" aria-label="Menu" onClick={() => setMobileOpen(true)}>
                <i className="fas fa-bars" />
              </button>
            </nav>
          </div>
        </div>
      </header>
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}
