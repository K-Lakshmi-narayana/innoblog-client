import './App.css'

import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import { apiRequest } from './api'
import AppHeader from './components/AppHeader'
import Sidebar from './components/Sidebar'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingDots from './components/LoadingDots'
import SiteFooter from './components/SiteFooter'
import { domainLookup, domains } from './data/siteContent'
import { navigateTo, useHashRoute } from './hooks/useHashRoute'
import ArticlePage from './pages/ArticlePage'
import DomainPage from './pages/DomainPage'
import ExplorePage from './pages/ExplorePage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import TopArticlesPage from './pages/TopArticlesPage'

const CreateArticlePage = lazy(() => import('./pages/CreateArticlePage'))
const SESSION_STORAGE_KEY = 'innoblog-auth-session'
const NON_PUBLIC_ARTICLE_STATUSES = ['draft', 'pending_review', 'rejected']

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : null

    if (!parsedValue?.user) {
      return null
    }

    return parsedValue
  } catch {
    return null
  }
}

function isArticlePubliclyVisible(article) {
  return Boolean(article) && (
    article.isPubliclyVisible ??
    (article.publicationStatus && !NON_PUBLIC_ARTICLE_STATUSES.includes(article.publicationStatus))
  )
}

function App() {
  const currentPath = useHashRoute()
  const [session, setSession] = useState(readStoredSession)
  const [articles, setArticles] = useState([])
  const [topArticles, setTopArticles] = useState([])
  const [domainStats, setDomainStats] = useState({})
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)

  const initialLoadRef = useRef(true)
  const [navigationLoading, setNavigationLoading] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentPath])

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }

    setNavigationLoading(true)
    const timer = window.setTimeout(() => setNavigationLoading(false), 320)

    return () => window.clearTimeout(timer)
  }, [currentPath])

  useEffect(() => {
    try {
      if (session) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    } catch {
      // Ignore local storage issues and keep the session in memory.
    }
  }, [session])

  useEffect(() => {
    let ignore = false

    async function syncSession() {
      try {
        const data = await apiRequest('/auth/me')

        if (!ignore) {
          setSession({ user: data.user })
        }
      } catch {
        if (!ignore) {
          setSession(null)
        }
      }
    }

    syncSession()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadCatalog() {
      setCatalogLoading(true)
      setCatalogError('')

      try {
        const [articleResponse, topResponse, statsResponse] = await Promise.all([
          apiRequest('/articles'),
          apiRequest('/articles/top'),
        apiRequest('/topics/stats'),
        ])

        if (ignore) {
          return
        }

        setArticles(articleResponse.articles)
        setTopArticles(topResponse.articles)
        
        // Create a map of topic slug -> count.
        const statsMap = {}
        statsResponse.stats.forEach((stat) => {
          statsMap[stat.domain] = stat.count
        })
        setDomainStats(statsMap)
      } catch (error) {
        if (!ignore) {
          setArticles([])
          setTopArticles([])
          setCatalogError(error.message)
        }
      } finally {
        if (!ignore) {
          setCatalogLoading(false)
        }
      }
    }

    loadCatalog()

    return () => {
      ignore = true
    }
  }, [])

  const domainSummaries = domains.map((domain) => ({
    ...domain,
    count: domainStats[domain.slug] || 0,
  }))

  const [rawPath, rawQuery] = currentPath.split('?')
  const normalizedPath = rawPath || '/'
  const pathSegments = normalizedPath.split('/').filter(Boolean)
  const currentTopic = pathSegments[0] === 'topic' ? domainLookup[pathSegments[1]] : null
  const searchParams = new URLSearchParams(rawQuery || '')

  async function refreshCatalog() {
    const [articleResponse, topResponse, statsResponse] = await Promise.all([
      apiRequest('/articles'),
      apiRequest('/articles/top'),
      apiRequest('/topics/stats'),
    ])

    setArticles(articleResponse.articles)
    setTopArticles(topResponse.articles)
    
    // Create a map of topic slug -> count.
    const statsMap = {}
    statsResponse.stats.forEach((stat) => {
      statsMap[stat.domain] = stat.count
    })
    setDomainStats(statsMap)
  }

  function handleLogout() {
    setLogoutConfirmOpen(true)
  }

  async function handleConfirmLogout() {
    setLogoutPending(true)

    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      })
    } catch {
      // Clear session locally even if logout request fails.
    }

    setSession(null)
    setLogoutPending(false)
    setLogoutConfirmOpen(false)
    navigateTo('/')
  }

  function handleCancelLogout() {
    if (!logoutPending) {
      setLogoutConfirmOpen(false)
    }
  }

  function handleAuthenticated(nextSession) {
    setSession({ user: nextSession.user })
    
    const redirectPath = nextSession.user.canWrite ? '/create' : '/articles'
    navigateTo(redirectPath)
  }

  async function handleRequestOtp(payload) {
    return apiRequest('/auth/request-otp', {
      method: 'POST',
      body: payload,
      timeout: 60000, // 60 seconds for Render cold start
    })
  }

  async function handleVerifyOtp(payload) {
    const authSession = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: payload,
    })

    handleAuthenticated(authSession)
  }

  async function handleGoogleLogin(credential) {
    const authSession = await apiRequest('/auth/google-login', {
      method: 'POST',
      body: { credential },
    })

    if (!authSession.user) {
      throw new Error('No user in response')
    }

    handleAuthenticated(authSession)
  }

  async function handlePublish(draft, { articleId = '', draftId = '' } = {}) {
    const isAdmin = session?.user?.role === 'admin'

    if (draftId) {
      const data = await apiRequest(`/drafts/${draftId}`, {
        method: 'PATCH',
        body: {
          ...draft,
          ...(isAdmin ? { publishDirectly: true } : {}),
        },
      })

      if (data.article && isArticlePubliclyVisible(data.article)) {
        await refreshCatalog()
        navigateTo(`/article/${data.article.slug}`)
        return
      }

      if (
        data.draft?.publicationRequested ||
        data.draft?.publicationStatus === 'pending_review'
      ) {
        navigateTo('/profile/me?tab=requests')
        return
      }

      await apiRequest(`/drafts/${draftId}/request-publication`, {
        method: 'POST',
      })
      navigateTo('/profile/me?tab=requests')
      return
    }

    if (articleId) {
      const data = await apiRequest(`/articles/${articleId}`, {
        method: 'PATCH',
        body: {
          ...draft,
          ...(isAdmin ? { publishDirectly: true } : {}),
        },
      })

      if (isArticlePubliclyVisible(data.article)) {
        await refreshCatalog()
        navigateTo(`/article/${data.article.slug}`)
        return
      }

      navigateTo(`/article/${data.article.slug}`)
      return
    }

    if (isAdmin) {
      const data = await apiRequest('/articles', {
        method: 'POST',
        body: draft,
      })

      await refreshCatalog()
      navigateTo(`/article/${data.article.slug}`)
      return
    }

    const draftResponse = await apiRequest('/drafts', {
      method: 'POST',
      body: draft,
    })

    await apiRequest(`/drafts/${draftResponse.draft.id}/request-publication`, {
      method: 'POST',
    })

    navigateTo('/profile/me?tab=requests')
  }

  async function handleDeleteArticle(articleId) {
    await apiRequest(`/articles/${articleId}`, {
      method: 'DELETE',
    })

    await refreshCatalog()
    navigateTo('/articles')
  }

  function handleSessionUserUpdate(nextUser) {
    setSession((currentSession) =>
      currentSession
        ? {
            ...currentSession,
            user: nextUser,
          }
        : currentSession,
    )
  }

  function renderWithBoundary(content, options = {}) {
    return (
      <ErrorBoundary
        resetKey={currentPath}
        title={options.title}
        description={options.description}
        actionHref={options.actionHref}
        actionLabel={options.actionLabel}
        contextLabel={options.contextLabel}
      >
        {content}
      </ErrorBoundary>
    )
  }

  function renderPage() {
    if (currentPath === '/') {
      return renderWithBoundary(
        (
        <LandingPage
          articles={articles}
          domains={domainSummaries}
          session={session}
          topArticles={topArticles}
          loading={catalogLoading}
          error={catalogError}
        />
        ),
        {
          title: 'Home feed failed to render.',
          description: 'The article catalog loaded into an unexpected state. Refresh and try again.',
          actionHref: '/articles',
          actionLabel: 'Open articles',
          contextLabel: 'landing page',
        },
      )
    }

    if (currentPath === '/login') {
      return (
        <LoginPage
          onRequestOtp={handleRequestOtp}
          onVerifyOtp={handleVerifyOtp}
          onGoogleLogin={handleGoogleLogin}
          session={session}
        />
      )
    }

    if (normalizedPath === '/create') {
      return renderWithBoundary(
        (
        <Suspense
          fallback={
            <section className="panel gated-panel loading-screen">
              <div>
                <span className="eyebrow">Loading editor</span>
                <h1>Preparing the writing studio.</h1>
                <p>
                  The composer loads on demand so the rest of the app stays faster
                  for readers.
                </p>
                <LoadingDots />
              </div>
            </section>
          }
        >
          <CreateArticlePage onPublish={handlePublish} session={session} />
        </Suspense>
        ),
        {
          title: 'The editor ran into a problem.',
          description: 'Your draft can be reopened from the dashboard after a refresh.',
          actionHref: '/profile/me?tab=drafts',
          actionLabel: 'Open dashboard',
          contextLabel: 'article editor',
        },
      )
    }

    if (currentPath === '/articles') {
      return renderWithBoundary(
        (
        <ExplorePage
          articles={articles}
          domains={domainSummaries}
          loading={catalogLoading}
          error={catalogError}
        />
        ),
        {
          title: 'The article feed failed to render.',
          description: 'Refresh the feed or open a different section while we recover.',
          actionHref: '/',
          actionLabel: 'Return home',
          contextLabel: 'article feed',
        },
      )
    }

    if (currentPath === '/top-articles') {
      return renderWithBoundary(<TopArticlesPage articles={topArticles} />, {
        title: 'Top articles are unavailable right now.',
        description: 'Try the main feed while this section recovers.',
        actionHref: '/articles',
        actionLabel: 'Open articles',
        contextLabel: 'top articles page',
      })
    }

    if (pathSegments[0] === 'topic' && currentTopic) {
      return renderWithBoundary(<DomainPage domain={currentTopic} />, {
        title: 'This topic page failed to render.',
        description: 'Try reloading or head back to the broader article feed.',
        actionHref: '/articles',
        actionLabel: 'Open articles',
        contextLabel: 'topic page',
      })
    }

    if (pathSegments[0] === 'draft' && pathSegments[1] && pathSegments[2] === 'edit') {
      return renderWithBoundary(
        (
        <Suspense
          fallback={
            <section className="panel gated-panel loading-screen">
              <div>
                <span className="eyebrow">Loading editor</span>
                <h1>Preparing your draft.</h1>
                <p>Fetch the draft and continue editing without losing work.</p>
                <LoadingDots />
              </div>
            </section>
          }
        >
          <CreateArticlePage
            draftSlug={pathSegments[1]}
            session={session}
            onPublish={handlePublish}
          />
        </Suspense>
        ),
        {
          title: 'This draft editor failed to load.',
          description: 'The draft is still stored on the server. Refresh or reopen it from your dashboard.',
          actionHref: '/profile/me?tab=drafts',
          actionLabel: 'Open drafts',
          contextLabel: 'draft editor',
        },
      )
    }

    if (pathSegments[0] === 'article' && pathSegments[1] && pathSegments[2] === 'edit') {
      return renderWithBoundary(
        (
        <Suspense
          fallback={
            <section className="panel gated-panel loading-screen">
              <div>
                <span className="eyebrow">Loading editor</span>
                <h1>Preparing your draft.</h1>
                <p>Fetch the article and continue editing without losing work.</p>
                <LoadingDots />
              </div>
            </section>
          }
        >
          <CreateArticlePage
            articleSlug={pathSegments[1]}
            session={session}
            onPublish={handlePublish}
          />
        </Suspense>
        ),
        {
          title: 'This article editor failed to load.',
          description: 'Refresh the page or reopen the article from your publications list.',
          actionHref: '/profile/me?tab=publications',
          actionLabel: 'Open publications',
          contextLabel: 'article editor',
        },
      )
    }

    if (pathSegments[0] === 'article' && pathSegments[1]) {
      return renderWithBoundary(
        (
        <ArticlePage
          slug={pathSegments[1]}
          session={session}
          onDeleteArticle={handleDeleteArticle}
        />
        ),
        {
          title: 'This article view failed to render.',
          description: 'The article data may still be available. Refresh or open the main feed.',
          actionHref: '/articles',
          actionLabel: 'Browse articles',
          contextLabel: 'article page',
        },
      )
    }

    if (pathSegments[0] === 'profile' && pathSegments[1]) {
      return renderWithBoundary(
        (
        <ProfilePage
          handle={pathSegments[1]}
          initialTab={searchParams.get('tab') || ''}
          session={session}
          onSessionUserUpdate={handleSessionUserUpdate}
          onCatalogRefresh={refreshCatalog}
        />
        ),
        {
          title: 'The dashboard failed to render.',
          description: 'Refresh the page or reopen the profile to recover drafts, requests, and publications.',
          actionHref: '/profile/me',
          actionLabel: 'Open profile',
          contextLabel: 'profile dashboard',
        },
      )
    }

    return (
      <section className="panel gated-panel">
        <span className="eyebrow">Not found</span>
        <h1>This page does not exist yet.</h1>
        <p>
          That route is not part of the current publication. Head home or open
          the article library to keep reading.
        </p>
        <a className="button button--primary" href="/">
          Return home
        </a>
      </section>
    )
  }

  return (
    <div className="app-shell">
      <div className="page-backdrop" aria-hidden="true" />
      <AppHeader 
        currentPath={currentPath} 
        session={session} 
        onLogout={handleLogout}
      />
      <Sidebar 
        currentPath={currentPath} 
        session={session}
        isOpen={true}
        onClose={() => {}}
      />
      <main className="app-main">
        <ErrorBoundary
          resetKey={currentPath}
          title="The app hit an unexpected state."
          description="Refresh the page or head back home to continue reading."
          actionHref="/"
          actionLabel="Return home"
          contextLabel="app shell"
        >
          {renderPage()}
        </ErrorBoundary>
      </main>
      <SiteFooter domains={domains} />
      {logoutConfirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="panel confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <span className="eyebrow">Confirm logout</span>
            <h2 id="logout-confirm-title">Do you want to logout?</h2>
            <p>Your current session will be closed on this device.</p>
            <div className="confirm-modal__actions">
              <button
                className="button button--ghost"
                type="button"
                onClick={handleCancelLogout}
                disabled={logoutPending}
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                type="button"
                onClick={handleConfirmLogout}
                disabled={logoutPending}
              >
                {logoutPending ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {navigationLoading ? (
        <div className="page-loading-overlay" role="status" aria-live="polite">
          <div className="page-loading-overlay__content">
            <LoadingDots />
            <span>Loading...</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
