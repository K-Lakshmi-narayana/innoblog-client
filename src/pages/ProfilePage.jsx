import { useCallback, useEffect, useState } from 'react'

import { apiRequest } from '../api'
import ArticleCard from '../components/ArticleCard'
import LoadingDots from '../components/LoadingDots'
import { navigateTo } from '../hooks/useHashRoute'
import { getDisplayName, getHeadline, getInitials, withProtocol } from '../utils/articleUtils'

function getAllowedTabs(viewingSelf, role) {
  const canWrite = ['admin', 'author'].includes(role)
  const tabs = [viewingSelf && canWrite ? 'publications' : 'articles']

  if (viewingSelf && canWrite) {
    tabs.push('drafts')
    tabs.push('requests')
  }

  if (viewingSelf && role === 'admin') {
    tabs.push('admin-requests')
  }

  return tabs
}

export default function ProfilePage({
  handle,
  initialTab,
  session,
  onSessionUserUpdate,
  onCatalogRefresh,
}) {
  const [profileState, setProfileState] = useState({
    loading: true,
    error: '',
    profile: null,
    user: null,
    articles: [],
    totalArticles: 0,
  })
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [form, setForm] = useState({
    displayName: '',
    headline: '',
    bio: '',
    avatarUrl: '',
    location: '',
    website: '',
  })
  const [authors, setAuthors] = useState([])
  const [authorsError, setAuthorsError] = useState('')
  const [grantForm, setGrantForm] = useState({
    email: '',
    name: '',
  })
  const [feedback, setFeedback] = useState('')
  const [activeTab, setActiveTab] = useState(initialTab || 'articles')
  const [drafts, setDrafts] = useState([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [draftsError, setDraftsError] = useState('')
  const [requestedArticles, setRequestedArticles] = useState([])
  const [requestedLoading, setRequestedLoading] = useState(false)
  const [requestedError, setRequestedError] = useState('')
  const [publicationRequests, setPublicationRequests] = useState([])
  const [publicationRequestsLoading, setPublicationRequestsLoading] = useState(false)
  const [publicationRequestsError, setPublicationRequestsError] = useState('')
  const [publications, setPublications] = useState([])
  const [publicationsLoading, setPublicationsLoading] = useState(false)
  const [publicationsError, setPublicationsError] = useState('')
  const [adminMetrics, setAdminMetrics] = useState(null)
  const [adminMetricsLoading, setAdminMetricsLoading] = useState(false)
  const [adminMetricsError, setAdminMetricsError] = useState('')

  const viewingSelf =
    handle === 'me' || Boolean(session?.user?.profile?.handle && session.user.profile.handle === handle)
  const requiresLogin = viewingSelf && !session?.user
  const canWrite = ['admin', 'author'].includes(session?.user?.role)

  const loadAdminMetrics = useCallback(async () => {
    if (!viewingSelf || session?.user?.role !== 'admin') return

    setAdminMetricsLoading(true)
    setAdminMetricsError('')

    try {
      const data = await apiRequest('/admin/metrics')
      setAdminMetrics(data)
    } catch (error) {
      setAdminMetricsError(error.message)
    } finally {
      setAdminMetricsLoading(false)
    }
  }, [session?.user?.role, viewingSelf])

  const loadAuthors = useCallback(async () => {
    if (!viewingSelf || session?.user?.role !== 'admin' || !session?.user) return

    setAuthorsError('')

    try {
      const data = await apiRequest('/admin/authors')
      setAuthors(data.users)
    } catch (error) {
      setAuthorsError(error.message)
    }
  }, [session?.user, viewingSelf])

  const loadPublications = useCallback(async () => {
    if (!viewingSelf || !session?.user || !canWrite) return

    setPublicationsLoading(true)
    setPublicationsError('')
    try {
      const data = await apiRequest(`/author/publications?page=${page}&limit=${limit}`)
      setPublications(data.articles)
    } catch (error) {
      console.error('Failed to load publications:', error)
      setPublicationsError(error.message)
    } finally {
      setPublicationsLoading(false)
    }
  }, [canWrite, limit, page, session?.user, viewingSelf])

  const loadDrafts = useCallback(async () => {
    if (!viewingSelf || !session?.user || !canWrite) return

    setDraftsLoading(true)
    setDraftsError('')
    try {
      const data = await apiRequest('/drafts')
      setDrafts(data.drafts)
    } catch (error) {
      console.error('Failed to load drafts:', error)
      setDraftsError(error.message)
    } finally {
      setDraftsLoading(false)
    }
  }, [canWrite, session?.user, viewingSelf])

  const loadRequestedArticles = useCallback(async () => {
    if (!viewingSelf || !session?.user || !canWrite) return

    setRequestedLoading(true)
    setRequestedError('')
    try {
      const data = await apiRequest('/author/requests')
      setRequestedArticles(data.drafts)
    } catch (error) {
      console.error('Failed to load requested articles:', error)
      setRequestedError(error.message)
    } finally {
      setRequestedLoading(false)
    }
  }, [canWrite, session?.user, viewingSelf])

  const loadPublicationRequests = useCallback(async () => {
    if (!viewingSelf || !session?.user || session.user.role !== 'admin') return

    setPublicationRequestsLoading(true)
    setPublicationRequestsError('')
    try {
      const data = await apiRequest('/admin/publication-requests')
      setPublicationRequests(data.requests)
    } catch (error) {
      console.error('Failed to load publication requests:', error)
      setPublicationRequestsError(error.message)
    } finally {
      setPublicationRequestsLoading(false)
    }
  }, [session?.user, viewingSelf])

  useEffect(() => {
    if (requiresLogin) {
      return
    }

    let ignore = false

    async function loadProfile() {
      setProfileState((current) => ({
        ...current,
        loading: true,
        error: '',
      }))

      try {
        const data = await apiRequest(`${viewingSelf ? '/profiles/me' : `/profiles/${handle}`}?page=${page}&limit=${limit}`)

        if (ignore) {
          return
        }

        setProfileState({
          loading: false,
          error: '',
          profile: data.profile,
          user: data.user,
          articles: data.articles,
          totalArticles: data.totalArticles,
        })
        setForm({
          displayName: data.profile?.displayName || '',
          headline: data.profile?.headline || '',
          bio: data.profile?.bio || '',
          avatarUrl: data.profile?.avatarUrl || '',
          location: data.profile?.location || '',
          website: data.profile?.website || '',
        })
      } catch (error) {
        if (!ignore) {
          setProfileState({
            loading: false,
            error: error.message,
            profile: null,
            user: null,
            articles: [],
          })
        }
      }
    }

    loadProfile()

    return () => {
      ignore = true
    }
  }, [handle, requiresLogin, session, viewingSelf, page, limit])

  useEffect(() => {
    setPage(1)
  }, [handle])

  useEffect(() => {
    const allowedTabs = getAllowedTabs(viewingSelf, session?.user?.role)
    const nextTab = allowedTabs.includes(initialTab) ? initialTab : allowedTabs[0]
    setActiveTab(nextTab)
  }, [initialTab, session?.user?.role, viewingSelf])

  useEffect(() => {
    if (!viewingSelf || session?.user?.role !== 'admin' || !session?.user) {
      return
    }

    loadAuthors()
  }, [loadAuthors, session?.user, session?.user?.role, viewingSelf])

  useEffect(() => {
    if (viewingSelf && session?.user && canWrite) {
      loadPublications()
    }
  }, [canWrite, loadPublications, session?.user, viewingSelf])

  useEffect(() => {
    if (viewingSelf && session?.user && canWrite) {
      loadDrafts()
    }
  }, [canWrite, loadDrafts, viewingSelf, session?.user])

  useEffect(() => {
    if (viewingSelf && canWrite) {
      loadRequestedArticles()
    }
  }, [canWrite, loadRequestedArticles, viewingSelf, session?.user?.role])

  useEffect(() => {
    if (viewingSelf && session?.user?.role === 'admin') {
      loadPublicationRequests()
      loadAdminMetrics()
    }
  }, [loadAdminMetrics, loadPublicationRequests, viewingSelf, session?.user?.role])

  function updateField(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSaveProfile(event) {
    event.preventDefault()

    try {
      const data = await apiRequest('/profiles/me', {
        method: 'PATCH',
        body: form,
      })

      setProfileState((current) => ({
        ...current,
        profile: data.profile,
      }))
      setFeedback('Profile updated.')
      onSessionUserUpdate({
        ...session.user,
        profile: data.profile,
      })
    } catch (error) {
      setFeedback(error.message)
    }
  }

  async function handleFollow() {
    if (!session?.user || !profileState.profile?.handle) {
      navigateTo('/login')
      return
    }

    try {
      const data = await apiRequest(`/profiles/${profileState.profile.handle}/follow`, {
        method: 'POST',
      })

      setProfileState((current) => ({
        ...current,
        profile: data.profile,
      }))
    } catch (error) {
      setFeedback(error.message)
    }
  }

  async function handleGrantAccess(event) {
    event.preventDefault()

    try {
      const data = await apiRequest('/admin/authors', {
        method: 'POST',
        body: grantForm,
      })

      setFeedback(data.message)
      setGrantForm({
        email: '',
        name: '',
      })

      const users = await apiRequest('/admin/authors')
      setAuthors(users.users)
    } catch (error) {
      setFeedback(error.message)
    }
  }

  async function handleRevokeAccess(userId) {
    try {
      const data = await apiRequest(`/admin/authors/${userId}`, {
        method: 'DELETE',
      })

      setFeedback(data.message)
      const users = await apiRequest('/admin/authors')
      setAuthors(users.users)
    } catch (error) {
      setFeedback(error.message)
    }
  }

  async function handleSaveAsDraft() {
    navigateTo('/create')
  }

  async function handleRequestPublication(draftId) {
    try {
      await apiRequest(`/drafts/${draftId}/request-publication`, {
        method: 'POST',
      })
      setFeedback('Publication request submitted successfully.')
      await Promise.all([loadDrafts(), loadRequestedArticles(), loadPublications()])
      setActiveTab('requests')
    } catch (error) {
      setFeedback(error.message)
    }
  }

  async function handleDeleteDraft(draftId) {
    if (!window.confirm('Remove this draft? This cannot be undone.')) {
      return
    }

    try {
      await apiRequest(`/drafts/${draftId}`, {
        method: 'DELETE',
      })
      setFeedback('Draft removed successfully.')
      await Promise.all([loadDrafts(), loadRequestedArticles(), loadPublications()])
    } catch (error) {
      setFeedback(error.message)
    }
  }

  async function handleRemovePublicationRequest(draftId) {
    if (!window.confirm('Remove this publication request and move the article back to drafts?')) {
      return
    }

    try {
      await apiRequest(`/drafts/${draftId}/request-publication`, {
        method: 'DELETE',
      })
      setFeedback('Publication request removed. The draft is back in drafts.')
      await Promise.all([loadRequestedArticles(), loadDrafts(), loadPublications()])
      setActiveTab('drafts')
    } catch (error) {
      setFeedback(error.message)
    }
  }

  async function handleApprovePublication(requestId, notes) {
    try {
      await apiRequest(`/admin/publication-requests/${requestId}/approve`, {
        method: 'POST',
        body: { notes: notes || '' },
      })
      setFeedback('Article published successfully.')
      await Promise.all([loadPublicationRequests(), loadAdminMetrics(), loadPublications()])
      await onCatalogRefresh?.()
    } catch (error) {
      setFeedback(error.message)
    }
  }

  async function handleRejectPublication(requestId, notes) {
    try {
      await apiRequest(`/admin/publication-requests/${requestId}/reject`, {
        method: 'POST',
        body: { notes },
      })
      setFeedback('Article rejected. Author can resubmit as draft.')
      await Promise.all([loadPublicationRequests(), loadDrafts(), loadRequestedArticles()])
    } catch (error) {
      setFeedback(error.message)
    }
  }



  function handlePreviousPage() {
    setPage((current) => Math.max(1, current - 1))
  }

  function handleNextPage() {
    const totalPages = Math.ceil(profileState.totalArticles / limit)
    setPage((current) => Math.min(totalPages, current + 1))
  }

  const totalPages = Math.ceil(profileState.totalArticles / limit)
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, page - 2)
    return start + i
  }).filter((p) => p <= totalPages)

  if (requiresLogin) {
    return (
      <section className="panel empty-panel">
        <strong>Please login first to open your own profile.</strong>
      </section>
    )
  }

  if (profileState.loading) {
    return (
      <section className="panel empty-panel loading-screen">
        <div>
          <strong>Loading profile...</strong>
          <LoadingDots />
        </div>
      </section>
    )
  }

  if (profileState.error || !profileState.profile || !profileState.user) {
    return (
      <section className="panel empty-panel">
        <strong>Could not load this profile.</strong>
        <p>{profileState.error}</p>
      </section>
    )
  }

  const profile = profileState.profile
  const user = profileState.user
  const displayName = getDisplayName(user)
  const headline = getHeadline(user)
  const publicationList = viewingSelf && canWrite ? publications : profileState.articles
  const publicationTab = viewingSelf && canWrite ? 'publications' : 'articles'
  const publicationHeading = viewingSelf && canWrite
    ? 'Your publications'
    : `${displayName}'s published articles`
  const publicationEyebrow = viewingSelf && canWrite ? 'Publications' : 'Published stories'

  return (
    <div className="page-stack">
      <section className="panel profile-hero">
        <div className="profile-hero__main">
          <div className="profile-banner">
            <span className="profile-banner__avatar">{getInitials(displayName)}</span>
            <div>
              <span className="eyebrow">Profile</span>
              <h1>{displayName}</h1>
              <p>{headline}</p>
            </div>
          </div>

          <div className="profile-meta">
            <span>{profile.followersCount} followers</span>
            <span>{profile.followingCount} following</span>
            <span>{profileState.totalArticles} published articles</span>
            <span>{user.role}</span>
          </div>

          <p className="profile-bio">
            {profile.bio || 'This profile has not added a longer bio yet.'}
          </p>

          <div className="hero__actions">
            {!viewingSelf && session?.user ? (
              <button className="button button--primary" type="button" onClick={handleFollow}>
                {profile.isFollowing ? 'Unfollow author' : 'Follow author'}
              </button>
            ) : null}

            {profile.website ? (
              <a className="button button--secondary" href={withProtocol(profile.website)} target="_blank" rel="noreferrer">
                Visit website
              </a>
            ) : null}
          </div>
        </div>

        <div className="profile-hero__side">
          <div className="profile-side-card">
            <strong>Location</strong>
            <span>{profile.location || 'Not added yet'}</span>
          </div>
          <div className="profile-side-card">
            <strong>Handle</strong>
            <span>@{profile.handle}</span>
          </div>
          <div className="profile-side-card">
            <strong>Role</strong>
            <span>{user.role}</span>
          </div>
        </div>
      </section>

      {viewingSelf ? (
        <section className="profile-layout">
          <form className="panel profile-editor" onSubmit={handleSaveProfile}>
            <div className="section-heading section-heading--tight">
              <div>
                <span className="eyebrow">Edit profile</span>
                <h2>Update your public author card.</h2>
              </div>
            </div>

            <div className="composer-grid">
              <label className="field">
                <span>Display name</span>
                <input
                  name="displayName"
                  type="text"
                  value={form.displayName}
                  onChange={updateField}
                />
              </label>

              <label className="field">
                <span>Headline</span>
                <input
                  name="headline"
                  type="text"
                  value={form.headline}
                  onChange={updateField}
                />
              </label>

              <label className="field field--wide">
                <span>Bio</span>
                <textarea name="bio" rows="4" value={form.bio} onChange={updateField} />
              </label>

              <label className="field">
                <span>Avatar URL</span>
                <input
                  name="avatarUrl"
                  type="text"
                  value={form.avatarUrl}
                  onChange={updateField}
                />
              </label>

              <label className="field">
                <span>Location</span>
                <input
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={updateField}
                />
              </label>

              <label className="field field--wide">
                <span>Website</span>
                <input
                  name="website"
                  type="text"
                  value={form.website}
                  onChange={updateField}
                />
              </label>
            </div>

            {feedback ? <p className="form-message form-message--error">{feedback}</p> : null}

            <button className="button button--primary" type="submit">
              Save profile
            </button>
          </form>

          {session?.user?.role === 'admin' ? (
            <aside className="profile-admin">
              <div className="panel profile-admin__card">
                <span className="eyebrow">Admin author access</span>
                <form className="admin-access-form" onSubmit={handleGrantAccess}>
                  <label className="field">
                    <span>Author email</span>
                    <input
                      type="email"
                      value={grantForm.email}
                      onChange={(event) =>
                        setGrantForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Author name</span>
                    <input
                      type="text"
                      value={grantForm.name}
                      onChange={(event) =>
                        setGrantForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button className="button button--primary" type="submit">
                    Grant author access
                  </button>
                </form>
              </div>

              <div className="panel profile-admin__card">
                <span className="eyebrow">Access list</span>
                {authorsError ? <p>{authorsError}</p> : null}
                <div className="writer-list">
                  {authors.map((author) => (
                    <div key={author.id} className="writer-list__item">
                      <div>
                        <strong>{author.profile?.displayName || author.email}</strong>
                        <span>{author.email}</span>
                      </div>
                      <div className="writer-list__role">
                        <span>{author.role}</span>
                        {author.role !== 'admin' && author.canWrite ? (
                          <button
                            type="button"
                            className="button button--ghost button--small"
                            onClick={() => handleRevokeAccess(author.id)}
                          >
                            Revoke access
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel profile-admin__card">
                <span className="eyebrow">Admin statistics</span>
                {adminMetricsLoading ? (
                  <LoadingDots />
                ) : adminMetrics ? (
                  <div className="admin-metrics">
                    <div className="admin-metrics__item">
                      <strong>{adminMetrics.activeReaderLogins}</strong>
                      <span>Readers logged in last 24 hours</span>
                    </div>
                    <div className="admin-metrics__item">
                      <strong>{adminMetrics.totalReaders}</strong>
                      <span>Total reader accounts</span>
                    </div>
                    <div className="admin-metrics__item">
                      <strong>{adminMetrics.publishedLast24Hours}</strong>
                      <span>Articles published last 24 hours</span>
                    </div>
                    <div className="admin-metrics__item">
                      <strong>{adminMetrics.totalPublishedArticles}</strong>
                      <span>Published articles</span>
                    </div>
                  </div>
                ) : (
                  <p>{adminMetricsError || 'Unable to load metrics.'}</p>
                )}
              </div>
            </aside>
          ) : null}
        </section>
      ) : null}

      {/* Profile Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === publicationTab ? 'is-active' : ''}`}
          onClick={() => setActiveTab(publicationTab)}
        >
          {viewingSelf && canWrite ? 'Publications' : 'Published'} ({profileState.totalArticles})
        </button>
        {viewingSelf && canWrite && (
          <button
            className={`profile-tab ${activeTab === 'drafts' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('drafts')}
          >
            Drafts ({drafts.length})
          </button>
        )}
        {viewingSelf && canWrite && (
          <button
            className={`profile-tab ${activeTab === 'requests' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Requested for Publication ({requestedArticles.length})
          </button>
        )}
        {viewingSelf && session?.user?.role === 'admin' && (
          <button
            className={`profile-tab ${activeTab === 'admin-requests' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('admin-requests')}
          >
            Review Requests ({publicationRequests.length})
          </button>
        )}
      </div>

      {(activeTab === 'articles' || activeTab === 'publications') && (
        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">{publicationEyebrow}</span>
              <h2>{publicationHeading}</h2>
            </div>
          </div>

          {publicationsLoading && activeTab === 'publications' ? (
            <LoadingDots />
          ) : publicationsError && activeTab === 'publications' ? (
            <div className="panel empty-panel">
              <strong>Could not load publications.</strong>
              <p>{publicationsError}</p>
            </div>
          ) : (
            <div className="story-grid story-grid--two">
              {publicationList.length ? (
                publicationList.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))
              ) : (
                <div className="panel empty-panel">
                  <strong>No published articles yet.</strong>
                </div>
              )}
            </div>
          )}

          {!profileState.loading && !profileState.error && profileState.totalArticles > 0 && (
            <div className="pagination-summary">
              Showing {Math.min((page - 1) * limit + 1, profileState.totalArticles)}-{Math.min(page * limit, profileState.totalArticles)} of {profileState.totalArticles} articles
            </div>
          )}

          {profileState.totalArticles >= 10 && (
            <div className="pagination-controls">
              <button
                className="button button--ghost"
                type="button"
                onClick={handlePreviousPage}
                disabled={page <= 1 || profileState.loading || publicationsLoading}
              >
                Previous
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={`button button--ghost${pageNumber === page ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  disabled={profileState.loading || publicationsLoading}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                className="button button--ghost"
                type="button"
                onClick={handleNextPage}
                disabled={page >= totalPages || profileState.loading || publicationsLoading}
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'drafts' && viewingSelf && canWrite && (
        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Draft articles</span>
              <h2>Your drafts</h2>
            </div>
          </div>

          {draftsLoading ? (
            <LoadingDots />
          ) : draftsError ? (
            <div className="panel empty-panel">
              <strong>Could not load drafts.</strong>
              <p>{draftsError}</p>
            </div>
          ) : drafts.length ? (
            <div className="story-grid story-grid--two">
              {drafts.map((article) => (
                <div key={article.id} className="draft-card">
                  <ArticleCard article={article} href={`#/draft/${article.slug}/edit`} />
                  {article.publicationNotes ? (
                    <p className="draft-note">Review note: {article.publicationNotes}</p>
                  ) : null}
                  <div className="draft-actions">
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => navigateTo(`/draft/${article.slug}/edit`)}
                    >
                      Edit Draft
                    </button>
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={() => handleRequestPublication(article.id)}
                    >
                      Request Publication
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => handleDeleteDraft(article.id)}
                    >
                      Remove Draft
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel empty-panel">
              <strong>No drafts yet.</strong>
              <button className="button button--primary" type="button" onClick={handleSaveAsDraft}>
                Create your first draft
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'requests' && viewingSelf && canWrite && (
        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Requested for publication</span>
              <h2>Requested articles</h2>
            </div>
          </div>

          {requestedLoading ? (
            <LoadingDots />
          ) : requestedError ? (
            <div className="panel empty-panel">
              <strong>Could not load requested articles.</strong>
              <p>{requestedError}</p>
            </div>
          ) : requestedArticles.length ? (
            <div className="story-grid story-grid--two">
              {requestedArticles.map((article) => (
                <div key={article.id} className="publication-card status-pending">
                  <ArticleCard article={article} href={`#/draft/${article.slug}/edit`} />
                  <div className="publication-status">
                    <span className="status-badge status-pending">Pending review</span>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => navigateTo(`/draft/${article.slug}/edit`)}
                    >
                      Edit Article
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => handleRemovePublicationRequest(article.id)}
                    >
                      Remove Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel empty-panel">
              <strong>No publication requests yet.</strong>
            </div>
          )}
        </section>
      )}

      {activeTab === 'admin-requests' && viewingSelf && session?.user?.role === 'admin' && (
        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Review publication requests</span>
              <h2>Pending publication requests</h2>
            </div>
          </div>

          {publicationRequestsLoading ? (
            <LoadingDots />
          ) : publicationRequestsError ? (
            <div className="panel empty-panel">
              <strong>Could not load publication requests.</strong>
              <p>{publicationRequestsError}</p>
            </div>
          ) : publicationRequests.length ? (
            <div className="publication-requests">
              {publicationRequests.map((request) => (
                <div key={request.id} className="panel publication-request-card">
                  <div className="request-header">
                    <h3>{request.draft.title}</h3>
                    <span className="request-date">
                      Requested: {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="request-summary">{request.draft.summary}</p>
                  <div className="request-meta">
                    <span>Domain: {request.draft.domain}</span>
                    <span>Author: {request.author.email}</span>
                  </div>
                  <div className="request-actions">
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => navigateTo(`/draft/${request.draft.slug}/edit`)}
                    >
                      View & Edit in Editor
                    </button>
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={() => {
                        const notes = prompt('Admin notes (optional):')
                        handleApprovePublication(request.id, notes)
                      }}
                    >
                      Approve & Publish
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => {
                        const notes = prompt('Rejection reason:')
                        if (notes !== null) handleRejectPublication(request.id, notes)
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel empty-panel">
              <strong>No pending publication requests.</strong>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
