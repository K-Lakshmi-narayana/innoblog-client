import { domains } from '../data/siteContent'
import { getDisplayName, getInitials } from '../utils/articleUtils'
import logo from "../assets/logo.png"
import ThemeToggle from './ThemeToggle'

function isActive(currentPath, href) {
  if (href === '/') {
    return currentPath === '/'
  }

  return currentPath === href || currentPath.startsWith(`${href}/`)
}

export default function AppHeader({ currentPath, session, onLogout }) {
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Articles', href: '/articles' },
    { label: 'Top Stories', href: '/top' },
    ...(session?.user?.canWrite ? [{ label: 'Write', href: '/create' }] : []),
    ...(session ? [{ label: 'Profile', href: '/profile/me' }] : []),
  ]

  return (
    <>
      <header className="app-header">
        <div className="app-header__bar">
          <div className='mobile-logo'>
          <a className="brand" href="#/">
            <img width={48} height={42} src={logo} alt="logo" />
            <span className="brand__wordmark">
              <strong>I N N O B L O G</strong>
              <span>Your Daily Dose of Tech x AI </span>
            </span>
          </a>
          <span className='mobile-theme'><ThemeToggle /></span>
          </div>

          <nav className="app-nav" aria-label="Primary">
            {navItems.map((item) => (
              <a
                key={item.href}
                className={`app-nav__link ${isActive(currentPath, item.href) ? 'is-active' : ''}`}
                href={`#${item.href}`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <span className='desktop-theme'><ThemeToggle /></span>

            {session ? (
              <>
                <a className="profile-chip" href="#/profile/me">
                  <span className="profile-chip__avatar">
                    {getInitials(getDisplayName(session.user))}
                  </span>
                  <div>
                    <strong>{getDisplayName(session.user)}</strong>
                    <span>{' ' + session.user.role}</span>
                  </div>
                </a>

                <button className="button button--ghost" type="button" onClick={onLogout}>
                  Logout
                </button>
              </>
            ) : (
              <a className="button button--secondary login-btn" href="#/login">
                Login
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Topics strip - shows on mobile, sidebar shows on desktop */}
      <div className="topic-strip" aria-label="Topics">
        {domains.map((domain) => (
          <a key={domain.slug} className="topic-pill" href={`#/domain/${domain.slug}`}>
            {domain.label}
            <span>{domain.name}</span>
          </a>
        ))}
      </div>
    </>
  )
}
