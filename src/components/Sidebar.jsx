import { domains } from '../data/siteContent'

function isActive(currentPath, href) {
  if (href === '/') {
    return currentPath === '/'
  }
  return currentPath === href || currentPath.startsWith(`${href}/`)
}

export default function Sidebar({ currentPath, session }) {
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Explore', href: '/articles' },
    { label: 'Top Stories', href: '/top' },
    ...(session?.user?.canWrite ? [{ label: 'Write', href: '/create' }] : []),
    ...(session?.user?.role === 'admin' ? [{ label: 'Admin', href: '/profile/me' }] : []),
  ]

  return (
    <aside className="app-sidebar">
      <div className="sidebar-content">
        {/* Navigation Section */}
        <nav className="sidebar-nav" aria-label="Main Navigation">
          <div className="sidebar-section">
            <span className="sidebar-eyebrow">Navigation</span>
            {navItems.map((item) => (
              <a
                key={item.href}
                className={`sidebar-link ${isActive(currentPath, item.href) ? 'is-active' : ''}`}
                href={`#${item.href}`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Domains Section */}
        <div className="sidebar-domains">
          <span className="sidebar-eyebrow">Topics</span>
          <div className="domains-list">
            {domains.map((domain) => (
              <a
                key={domain.slug}
                className={`domain-link ${isActive(currentPath, `/domain/${domain.slug}`) ? 'is-active' : ''}`}
                href={`#/domain/${domain.slug}`}
              >
                <span className="domain-icon">{domain.label}</span>
                <span className="domain-name">{domain.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Additional Tools Section */}
        {session && (
          <div className="sidebar-section">
            <span className="sidebar-eyebrow">Account</span>
            <a
              className="sidebar-link"
              href="#/profile/me"
            >
              My Profile
            </a>
          </div>
        )}
      </div>
    </aside>
  )
}
