import { useEffect, useRef, useState } from 'react'

import { apiRequest } from '../api'
import Editor from '../components/Editor'
import LoadingDots from '../components/LoadingDots'
import { domains, publishingChecklist } from '../data/siteContent'
import { estimateReadTime, stripHtml } from '../utils/articleUtils'

const initialBody =
  '<p>Open with the core problem, explain your point of view, and leave the reader with one clear takeaway they can use.</p>'

export default function CreateArticlePage({ onPublish, session, articleSlug, draftSlug }) {
  const draftStorageKey = draftSlug
    ? `innoblog-draft-${draftSlug}`
    : articleSlug
    ? `innoblog-article-edit-${articleSlug}`
    : 'innoblog-article-draft'
  const [form, setForm] = useState({
    title: '',
    summary: '',
    domain: 'ml',
    tags: '',
    coverLabel: '',
    coverImage: '',
    body: initialBody,
  })
  const [draftId, setDraftId] = useState('')
  const [articleId, setArticleId] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editorFullscreen, setEditorFullscreen] = useState(false)
  const [loadingArticle, setLoadingArticle] = useState(Boolean(draftSlug || articleSlug))
  const [draftStatus, setDraftStatus] = useState('saved locally')
  const [loadedDraft, setLoadedDraft] = useState(false)
  const [showDraftSavedNotification, setShowDraftSavedNotification] = useState(false)
  const draftFromStorageRef = useRef(null)

  useEffect(() => {
    draftFromStorageRef.current = null

    try {
      const rawValue = window.localStorage.getItem(draftStorageKey)
      if (rawValue) {
        const savedDraft = JSON.parse(rawValue)
        if (savedDraft && typeof savedDraft === 'object') {
          draftFromStorageRef.current = savedDraft
          setForm((currentForm) => ({
            ...currentForm,
            ...savedDraft,
          }))
          setDraftStatus('saved locally')
        }
      }
    } catch {
      // Ignore local storage read failures.
    } finally {
      setLoadedDraft(true)
    }
  }, [draftStorageKey])

  useEffect(() => {
    if (!loadedDraft || loadingArticle) {
      return
    }

    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(form))
      setDraftStatus('autosaving')
      const draftTimer = window.setTimeout(() => setDraftStatus('saved locally'), 450)

      return () => {
        window.clearTimeout(draftTimer)
      }
    } catch {
      // Ignore local storage write failures.
    }
  }, [draftStorageKey, form, loadedDraft, loadingArticle])

  const bodyText = stripHtml(form.body)
  const wordCount = bodyText ? bodyText.split(' ').filter(Boolean).length : 0
  const tagPreview = form.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const isEditing = Boolean(draftSlug || articleSlug)
  const editorTitle = draftSlug
    ? 'Edit draft'
    : articleSlug
    ? 'Edit article'
    : 'Create a new article'
  const draftStatusLabel = draftStatus === 'autosaving' ? 'Autosaving...' : draftStatus

  useEffect(() => {
    if (!draftSlug && !articleSlug) {
      return
    }

    async function loadEditorResource() {
      setLoadingArticle(true)
      setLoadError('')

      try {
        if (draftSlug) {
          const data = await apiRequest(`/drafts/${draftSlug}`)
          setDraftId(data.draft.id)

          if (!draftFromStorageRef.current) {
            setForm((currentForm) => ({
              ...currentForm,
              title: data.draft.title || currentForm.title,
              summary: data.draft.summary || currentForm.summary,
              domain: data.draft.domain || currentForm.domain,
              tags: (data.draft.tags || []).join(', '),
              coverLabel: data.draft.coverLabel || currentForm.coverLabel,
              coverImage: data.draft.coverImage || currentForm.coverImage,
              body: data.draft.bodyHtml || currentForm.body,
            }))
          }
        } else {
          const data = await apiRequest(`/articles/${articleSlug}`)
          setArticleId(data.article.id)

          if (!draftFromStorageRef.current) {
            setForm((currentForm) => ({
              ...currentForm,
              title: data.article.title || currentForm.title,
              summary: data.article.summary || currentForm.summary,
              domain: data.article.domain || currentForm.domain,
              tags: (data.article.tags || []).join(', '),
              coverLabel: data.article.coverLabel || currentForm.coverLabel,
              coverImage: data.article.coverImage || currentForm.coverImage,
              body: data.article.bodyHtml || currentForm.body,
            }))
          }
        }
      } catch (loadingError) {
        setLoadError(loadingError.message)
      } finally {
        setLoadingArticle(false)
      }
    }

    loadEditorResource()
  }, [articleSlug, draftSlug])

  function updateField(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function handlePublish(event) {
    event.preventDefault()

    if (!form.title.trim() || !form.summary.trim()) {
      setError('Add a title and summary before publishing.')
      return
    }

    if (bodyText.length < 120) {
      setError('Add a little more detail to the article body before publishing.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onPublish(
        {
          ...form,
          tags: tagPreview,
        },
        {
          articleId,
          draftId,
        },
      )

      try {
        window.localStorage.removeItem(draftStorageKey)
      } catch {
        // Ignore failures.
      }
    } catch (publishError) {
      setError(publishError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveDraft(event) {
    event.preventDefault()

    if (!form.title.trim() || !form.domain.trim() || !form.body.trim()) {
      setError('Title, domain, and body are required to save a draft.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const endpoint = draftId
        ? `/drafts/${draftId}`
        : articleId
        ? `/articles/${articleId}`
        : '/drafts'
      const method = draftId || articleId ? 'PATCH' : 'POST'
      const data = await apiRequest(endpoint, {
        method,
        body: {
          ...form,
          tags: tagPreview,
          ...(draftId || !articleId ? { saveAsDraft: true } : {}),
        },
      })

      if (data.draft) {
        setDraftId(data.draft.id)
      }

      if (data.article) {
        setArticleId(data.article.id)
      }
      setDraftStatus('saved to server')
      setShowDraftSavedNotification(true)

      // Clear local storage since it's saved to server
      try {
        window.localStorage.removeItem(draftStorageKey)
      } catch {
        // Ignore failures.
      }
    } catch (draftError) {
      setError(draftError.message)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!showDraftSavedNotification) {
      return
    }

    const timer = window.setTimeout(() => {
      setShowDraftSavedNotification(false)
    }, 2000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [showDraftSavedNotification])

  if (!session) {
    return (
      <section className="panel gated-panel">
        <span className="eyebrow">Login required</span>
        <h1>Authors need a local profile before they can publish.</h1>
        <p>
          The rest of the article workflow is ready. Sign in first, then come
          back here to create and publish directly into the article feeds.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="#/login">
            Go to login
          </a>
          <a className="button button--secondary" href="#/articles">
            Explore articles
          </a>
        </div>
      </section>
    )
  }

  if (!['admin', 'author', 'writer'].includes(session.user.role)) {
    return (
      <section className="panel gated-panel">
        <span className="eyebrow">Author access required</span>
        <h1>Your account can read the publication, but it cannot publish yet.</h1>
        <p>
          Admin and author accounts can compose articles here. If you do not have
          author access yet, ask the admin to grant it.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="#/profile/me">
            Open your profile
          </a>
          <a className="button button--secondary" href="#/articles">
            Keep reading
          </a>
        </div>
      </section>
    )
  }

  if (loadingArticle) {
    return (
      <section className="panel empty-panel loading-screen">
        <div>
          <strong>Loading draft...</strong>
          <LoadingDots />
        </div>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="panel empty-panel">
        <span className="eyebrow">Could not open editor</span>
        <h1>{loadError}</h1>
        <p>The requested draft or article could not be loaded. Check the URL or return to the article list.</p>
        <a className="button button--primary" href="#/articles">
          Explore articles
        </a>
      </section>
    )
  }

  return (
    <div className="composer-layout">
      <form className="panel composer-form" onSubmit={handlePublish}>
        <div className="section-heading section-heading--tight">
          <div>
            <span className="eyebrow">Compose</span>
            <h1>{isEditing ? editorTitle : 'Create a new article'}</h1>
            <p>Write long-form content with structure, formatting, and metadata.</p>
          </div>
          <div className="draft-status">
            <span className="draft-status__icon">{draftStatus === 'autosaving' ? '⟳' : '✔'}</span>
            <span>{draftStatusLabel}</span>
          </div>
        </div>

        <div className="composer-grid">
          <label className="field field--wide">
            <span>Title</span>
            <input
              name="title"
              type="text"
              placeholder="Example: The practical anatomy of an ML launch"
              value={form.title}
              onChange={updateField}
            />
          </label>

          <label className="field">
            <span>Domain</span>
            <select name="domain" value={form.domain} onChange={updateField}>
              {domains.map((domain) => (
                <option key={domain.slug} value={domain.slug}>
                  {domain.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Card label</span>
            <input
              name="coverLabel"
              type="text"
              placeholder="Example: Field Notes"
              value={form.coverLabel}
              onChange={updateField}
            />
          </label>

          <label className="field field--wide">
            <span>Summary</span>
            <textarea
              name="summary"
              rows="4"
              placeholder="Give readers a sharp reason to click."
              value={form.summary}
              onChange={updateField}
            />
          </label>

          <label className="field field--wide">
            <span>Tags</span>
            <input
              name="tags"
              type="text"
              placeholder="Modeling, Product, Metrics"
              value={form.tags}
              onChange={updateField}
            />
          </label>

          <label className="field field--wide">
            <span>Cover picture</span>
            <input
              name="coverImage"
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) {
                  return
                }

                const reader = new FileReader()
                reader.onload = () => {
                  setForm((currentForm) => ({
                    ...currentForm,
                    coverImage: reader.result || '',
                  }))
                }
                reader.readAsDataURL(file)
              }}
            />
            {form.coverImage ? (
              <div className="cover-preview">
                <img src={form.coverImage} alt="Cover preview" />
              </div>
            ) : (
              <p className="field-note">Upload a cover image that will appear on the article page.</p>
            )}
          </label>
        </div>

        <div className={`editor-block${editorFullscreen ? ' editor-block--fullscreen' : ''}`}>
          <div className="editor-block__header">
            <div>
              <span className="eyebrow">Body</span>
              <h2>Article editor</h2>
            </div>
            <div className="editor-block__stats">
              <span>{wordCount} words</span>
              <span>{estimateReadTime(form.body)}</span>
            </div>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setEditorFullscreen((value) => !value)}
            >
              {editorFullscreen ? 'Exit full screen' : 'Expand editor'}
            </button>
          </div>

          <Editor value={form.body} onChange={(value) => setForm((currentForm) => ({
            ...currentForm,
            body: value,
          }))} />
        </div>

        {error ? <p className="form-message form-message--error">{error}</p> : null}
        {showDraftSavedNotification ? (
          <p className="form-message form-message--success">✓ Draft saved successfully</p>
        ) : null}

        <div className="composer-actions">
          <button
            className="button button--secondary"
            type="button"
            onClick={handleSaveDraft}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : articleId && !draftId ? 'Save Changes' : 'Save as Draft'}
          </button>
          <button className="button button--primary" type="submit" disabled={submitting}>
            {submitting ? 'Publishing...' : 'Publish article'}
          </button>
        </div>
      </form>

      <aside className="composer-sidebar">
        <div className="panel composer-sidebar__card">
          <span className="eyebrow">Live preview</span>
          <h2>{form.title.trim() || 'Your article title'}</h2>
          <p>{form.summary.trim() || 'Your summary will appear here as you write.'}</p>
          <div className="article-card__tags">
            {tagPreview.length ? (
              tagPreview.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))
            ) : (
              <span className="tag">Add a few discovery tags</span>
            )}
          </div>
        </div>

        <div className="panel composer-sidebar__card">
          <span className="eyebrow">Publishing checklist</span>
          <div className="checklist">
            {publishingChecklist.map((item) => (
              <div key={item} className="checklist__item">
                <span className="checklist__marker" />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel composer-sidebar__card">
          <span className="eyebrow">Author identity</span>
          <strong>{session.user.profile?.displayName}</strong>
          <p>
            Publishing as {session.user.role}. Readers will be able to follow
            this author profile from the article page.
          </p>
        </div>
      </aside>
    </div>
  )
}
