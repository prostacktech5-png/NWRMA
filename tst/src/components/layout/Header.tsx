import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { mainNav, topBarLinks, topNavLinks, socialLinks } from '../../data/navigation'
import type { NavItem } from '../../data/navigation'
import { MobileNav } from './MobileNav'
import { ImageWithFallback } from '../ui/ImageWithFallback'

function MainNavItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation()
  const isActive = item.path && location.pathname === item.path
  const hasChildren = Boolean(item.children?.length)

  if (hasChildren) {
    return (
      <li className={`${isActive ? 'active' : ''} ${hasChildren ? 'has-children' : ''}`}>
        {item.path ? (
          <Link to={item.path} className="nav-parent">
            {item.label}
          </Link>
        ) : (
          <span className="nav-parent">{item.label}</span>
        )}
        <ul className="sub-menu">
          {item.children!.map((child) => (
            <MainNavItem key={child.label + (child.path ?? '')} item={child} depth={depth + 1} />
          ))}
        </ul>
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
      <Link to={item.path ?? '/'}>{item.label}</Link>
    </li>
  )
}

export function Header() {
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
            <div className="header__top-left">
              {topBarLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                >
                  <i className={`far fa-${link.label.includes('@') ? 'envelope' : 'phone'}`} />
                  {link.label}
                </a>
              ))}
            </div>
            <div className="header__top-right">
              <ul className="header__top-links">
                {topNavLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.path ?? '/'}>{item.label}</Link>
                  </li>
                ))}
              </ul>
              <div className="header__socials">
                {socialLinks.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                    <i className={s.icon} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="header__middle">
          <div className="header__middle-inner">
            <Link to="/" className="header__logo">
              <ImageWithFallback localSrc="/assets/uploads/2020/10/2-2.png" alt="NWRMA Logo" width={150} height={150} />
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
