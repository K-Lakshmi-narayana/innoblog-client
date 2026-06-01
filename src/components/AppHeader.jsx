import { domains } from '../data/siteContent'
import { getDisplayName, getInitials } from '../utils/articleUtils'
import logo from '../assets/logo.png'
import logoDark from '../assets/logo-dark.png'
import ThemeToggle from './ThemeToggle'
import { useState, useEffect } from 'react'
import { FaBars, FaTimes } from 'react-icons/fa'

function isActive(currentPath, href) {
  if (href === '/') {
    return currentPath === '/'
  }

  return currentPath === href || currentPath.startsWith(`${href}/`)
}

export default function AppHeader({ currentPath, session, onLogout }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDarkMode(theme === 'dark')
    }

    checkTheme()

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMobileMenuOpen(false), 0)
    return () => window.clearTimeout(timeoutId)
  }, [currentPath])

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Articles', href: '/articles' },
    { label: 'Top Articles', href: '/top-articles' },
    ...(session?.user?.canWrite ? [{ label: 'Write', href: '/create' }] : []),
    ...(session ? [{ label: 'Profile', href: '/profile/me' }] : []),
  ]

  const userName = session ? getDisplayName(session.user) : ''
  const mobileMenuId = 'mobile-navigation-menu'

  function handleMobileLogout() {
    setMobileMenuOpen(false)
    onLogout?.()
  }

  return (
    <header className={`app-header ${mobileMenuOpen ? 'has-mobile-menu' : ''}`}>
      <div className="app-header__bar">
        <a className="brand" href="/">
          <img width={55} height={55} src={isDarkMode ? logoDark : logo} alt="logo" />
          <span className="brand__wordmark">
            <strong>I N N O B L O G</strong>
            <span>Explore knowledge and share insights</span>
          </span>
        </a>

        <div className="header-actions header-actions--desktop">
          <span className="desktop-theme"><ThemeToggle /></span>

          {session ? (
            <>
              <a className="profile-chip" href="/profile/me">
                <span className="profile-chip__avatar">
                  {getInitials(userName)}
                </span>
                <div>
                  <span>{session.user.role}</span>
                </div>
              </a>

              <button className="button button--ghost" type="button" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <a className="button button--secondary login-btn" href="/login">
              Login
            </a>
          )}
        </div>

        <div className="mobile-header-actions">
          <ThemeToggle />
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuId}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <FaTimes aria-hidden="true" /> : <FaBars aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id={mobileMenuId}
        className={`mobile-menu ${mobileMenuOpen ? 'is-open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <nav className="mobile-menu__section" aria-label="Mobile navigation">
          <span className="mobile-menu__eyebrow">Navigation</span>
          {navItems.map((item) => (
            <a
              key={item.href}
              className={`mobile-menu__link ${isActive(currentPath, item.href) ? 'is-active' : ''}`}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mobile-menu__section">
          <span className="mobile-menu__eyebrow">Topics</span>
          <div className="mobile-menu__topics">
            {domains.map((domain) => (
              <a
                key={domain.slug}
                className={`mobile-menu__topic ${isActive(currentPath, `/topic/${domain.slug}`) ? 'is-active' : ''}`}
                href={`/topic/${domain.slug}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{domain.label}</span>
                {domain.name}
              </a>
            ))}
          </div>
        </div>

        <div className="mobile-menu__section">
          <span className="mobile-menu__eyebrow">Account</span>
          {session ? (
            <div className="mobile-menu__account">
              <a className="mobile-menu__profile" href="/profile/me" onClick={() => setMobileMenuOpen(false)}>
                <span className="profile-chip__avatar">{getInitials(userName)}</span>
                <span>
                  <strong>{userName}</strong>
                  <small>{session.user.role}</small>
                </span>
              </a>
              <button className="mobile-menu__logout" type="button" onClick={handleMobileLogout}>
                Logout
              </button>
            </div>
          ) : (
            <a className="mobile-menu__cta" href="/login" onClick={() => setMobileMenuOpen(false)}>
              Login
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
