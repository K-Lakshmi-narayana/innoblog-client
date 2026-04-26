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
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')

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
        const [articleResponse, topResponse] = await Promise.all([
          apiRequest('/articles'),
          apiRequest('/articles/top'),
        ])

        if (ignore) {
          return
        }

        setArticles(articleResponse.articles)
        setTopArticles(topResponse.articles)
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
    count: articles.filter((article) => article.domain === domain.slug).length,
  }))

  const [rawPath, rawQuery] = currentPath.split('?')
  const normalizedPath = rawPath || '/'
  const pathSegments = normalizedPath.split('/').filter(Boolean)
  const currentDomain = pathSegments[0] === 'domain' ? domainLookup[pathSegments[1]] : null
  const domainArticles = currentDomain
    ? articles.filter((article) => article.domain === currentDomain.slug)
    : []
  const searchParams = new URLSearchParams(rawQuery || '')

  async function refreshCatalog() {
    const [articleResponse, topResponse] = await Promise.all([
      apiRequest('/articles'),
      apiRequest('/articles/top'),
    ])

    setArticles(articleResponse.articles)
    setTopArticles(topResponse.articles)
  }

  async function handleLogout() {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      })
    } catch {
      // Clear session locally even if logout request fails.
    }

    setSession(null)
    navigateTo('/')
  }

  function handleAuthenticated(nextSession) {
    setSession({ user: nextSession.user })
    navigateTo(nextSession.user.canWrite ? '/create' : '/articles')
  }

  async function handleRequestOtp(payload) {
    return apiRequest('/auth/request-otp', {
      method: 'POST',
      body: payload,
    })
  }

  async function handleVerifyOtp(payload) {
    const authSession = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: payload,
    })

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

  function renderPage() {
    if (currentPath === '/') {
      return (
        <LandingPage
          articles={articles}
          domains={domainSummaries}
          session={session}
          topArticles={topArticles}
          loading={catalogLoading}
          error={catalogError}
        />
      )
    }

    if (currentPath === '/login') {
      return (
        <LoginPage
          onRequestOtp={handleRequestOtp}
          onVerifyOtp={handleVerifyOtp}
          session={session}
        />
      )
    }

    if (normalizedPath === '/create') {
      return (
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
      )
    }

    if (currentPath === '/articles') {
      return (
        <ExplorePage
          articles={articles}
          domains={domainSummaries}
          loading={catalogLoading}
          error={catalogError}
        />
      )
    }

    if (currentPath === '/top') {
      return <TopArticlesPage articles={topArticles} />
    }

    if (pathSegments[0] === 'domain' && currentDomain) {
      return <DomainPage articles={domainArticles} domain={currentDomain} />
    }

    if (pathSegments[0] === 'draft' && pathSegments[1] && pathSegments[2] === 'edit') {
      return (
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
      )
    }

    if (pathSegments[0] === 'article' && pathSegments[1] && pathSegments[2] === 'edit') {
      return (
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
      )
    }

    if (pathSegments[0] === 'article' && pathSegments[1]) {
      return (
        <ArticlePage
          slug={pathSegments[1]}
          session={session}
          onDeleteArticle={handleDeleteArticle}
        />
      )
    }

    if (pathSegments[0] === 'profile' && pathSegments[1]) {
      return (
        <ProfilePage
          handle={pathSegments[1]}
          initialTab={searchParams.get('tab') || ''}
          session={session}
          onSessionUserUpdate={handleSessionUserUpdate}
          onCatalogRefresh={refreshCatalog}
        />
      )
    }

    return (
      <section className="panel gated-panel">
        <span className="eyebrow">Not found</span>
        <h1>This page does not exist yet.</h1>
        <p>
          The route is outside the current publishing flow. Head back home to
          keep exploring the Medium-style experience.
        </p>
        <a className="button button--primary" href="#/">
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
        <ErrorBoundary>{renderPage()}</ErrorBoundary>
      </main>
      <SiteFooter domains={domains} />
      {navigationLoading ? (
        <div className="page-loading-overlay" aria-hidden="true">
          <div className="page-loading-overlay__content">
            <LoadingDots />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
