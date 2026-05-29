import { useEffect, useRef, useState } from 'react'
import { FaExpand, FaCompress } from 'react-icons/fa'

import { apiRequest } from '../api'
import Editor from '../components/Editor'
import TagSelector from '../components/TagSelector'
import LoadingDots from '../components/LoadingDots'
import { domainLookup, domains, publishingChecklist } from '../data/siteContent'
import { getTagSuggestionsForDomain, normalizeTagKey } from '../data/tagSuggestions'
import { estimateReadTime, stripHtml } from '../utils/articleUtils'
import { getUserFriendlyError } from '../utils/errorMessages'
import {
  ARTICLE_IMAGE_LIMITS,
  formatFileSize,
  getUploadedImageCount,
  validateArticleImages,
  validateTitle,
  validateSummary,
  validateCoverLabel,
  validateBody,
  validateImageFile,
  validateTags,
} from '../utils/validations'

const initialBody =
  '<p>Start with the problem, explain what changed your mind, and close with a takeaway readers can use.</p>'

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
    tags: [],
    coverLabel: '',
    coverImage: '',
    body: initialBody,
  })
  const [draftId, setDraftId] = useState('')
  const [articleId, setArticleId] = useState('')
  const [error, setError] = useState('')
  const [coverImageError, setCoverImageError] = useState('')
  const [editorImageError, setEditorImageError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editorFullscreen, setEditorFullscreen] = useState(false)
  const [loadingArticle, setLoadingArticle] = useState(Boolean(draftSlug || articleSlug))
  const [draftStatus, setDraftStatus] = useState('saved locally')
  const [loadedDraft, setLoadedDraft] = useState(false)
  const [showDraftSavedNotification, setShowDraftSavedNotification] = useState(false)
  const [suggestedTags, setSuggestedTags] = useState(() => getTagSuggestionsForDomain('ml'))
  const [loadingTags, setLoadingTags] = useState(false)
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
            // Ensure tags is an array
            tags: Array.isArray(savedDraft.tags) ? savedDraft.tags : [],
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
    if (!form.domain) return

    const fallbackTags = getTagSuggestionsForDomain(form.domain)
    setSuggestedTags(fallbackTags)

    async function fetchTags() {
      setLoadingTags(true)
      try {
        const data = await apiRequest(`/tags/suggestions?topic=${form.domain}`)
        setSuggestedTags(data.tags?.length ? data.tags : fallbackTags)
      } catch (err) {
        console.error('Failed to fetch tags:', err)
        setSuggestedTags(fallbackTags)
      } finally {
        setLoadingTags(false)
      }
    }

    fetchTags()
  }, [form.domain])

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
  
  // Handle both array and string formats for tags
  const tagPreview = Array.isArray(form.tags)
    ? form.tags
    : (form.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
  const uploadedImageCount = getUploadedImageCount({
    body: form.body,
    coverImage: form.coverImage,
  })

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
              tags: Array.isArray(data.draft.tags) ? data.draft.tags : [],
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
              tags: Array.isArray(data.article.tags) ? data.article.tags : [],
              coverLabel: data.article.coverLabel || currentForm.coverLabel,
              coverImage: data.article.coverImage || currentForm.coverImage,
              body: data.article.bodyHtml || currentForm.body,
            }))
          }
        }
      } catch (loadingError) {
        setLoadError(getUserFriendlyError(loadingError))
      } finally {
        setLoadingArticle(false)
      }
    }

    loadEditorResource()
  }, [articleSlug, draftSlug])

  function updateField(event) {
    const { name, value } = event.target
    setError('')
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      ...(name === 'domain'
        ? {
            tags: currentForm.tags.filter((tag) =>
              getTagSuggestionsForDomain(value)
                .map(normalizeTagKey)
                .includes(normalizeTagKey(tag)),
            ),
          }
        : {}),
    }))
  }

  function handleTagsChange(newTags) {
    setError('')
    setForm((currentForm) => ({
      ...currentForm,
      tags: newTags,
    }))
  }

  function validateComposer({ requireSummary = true } = {}) {
    const titleError = validateTitle(form.title)
    if (titleError) return titleError

    if (requireSummary) {
      const summaryError = validateSummary(form.summary)
      if (summaryError) return summaryError
    }

    const bodyError = validateBody(form.body)
    if (bodyError) return bodyError

    const tagsError = validateTags(form.tags, form.domain)
    if (tagsError) return tagsError

    const coverLabelError = validateCoverLabel(form.coverLabel)
    if (coverLabelError) return coverLabelError

    const imageError = validateArticleImages({
      body: form.body,
      coverImage: form.coverImage,
    })
    if (imageError) return imageError

    return null
  }

  async function handlePublish(event) {
    event.preventDefault()

    const validationError = validateComposer({ requireSummary: true })
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onPublish(
        {
          ...form,
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
      setError(getUserFriendlyError(publishError))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveDraft(event) {
    event.preventDefault()

    const validationError = validateComposer({ requireSummary: false })
    if (validationError) {
      setError(validationError)
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
          saveAsDraft: true,
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
      setError(getUserFriendlyError(draftError))
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
        <h1>Sign in before opening the editor.</h1>
        <p>
          Your account keeps drafts, review requests, and author details tied
          to the same profile.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="/login">
            Sign in
          </a>
          <a className="button button--secondary" href="/articles">
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
        <h1>Your account can read, but it cannot write yet.</h1>
        <p>
          Ask an admin for writer access when you are ready to draft and submit
          articles.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="/profile/me">
            Open your profile
          </a>
          <a className="button button--secondary" href="/articles">
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
        <a className="button button--primary" href="/articles">
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
            <p>Draft the article, add discovery details, and submit it for publication.</p>
          </div>
          <div className="draft-status">
            <span className="draft-status__icon">{draftStatusLabel}</span>
          </div>
        </div>

        <div className="composer-grid">
          <label className="field field--wide">
            <span>Title</span>
            <input
              name="title"
              type="text"
              placeholder="Example: A practical guide to launching an ML model"
              value={form.title}
              onChange={updateField}
              maxLength={200}
            />
            <div className="field-meta">
              <span className={`char-count ${form.title.length > 200 ? 'error' : ''}`}>
                {form.title.length}/200
              </span>
              {validateTitle(form.title) && (
                <span className="validation-error">{validateTitle(form.title)}</span>
              )}
            </div>
          </label>

          <label className="field">
            <span>Topic</span>
            <select name="domain" value={form.domain} onChange={updateField}>
              {domains.map((domain) => (
                <option key={domain.slug} value={domain.slug}>
                  {domain.name}
                </option>
              ))}
            </select>
            <div>&#8203;</div>
          </label>

          <label className="field">
            <span>Card label</span>
            <input
              name="coverLabel"
              type="text"
              placeholder="Example: Case Study"
              value={form.coverLabel}
              onChange={updateField}
              maxLength={100}
            />
            <div className="field-meta">
              <span className={`char-count ${form.coverLabel.length > 100 ? 'error' : ''}`}>
                {form.coverLabel.length}/100
              </span>
              {validateCoverLabel(form.coverLabel) && (
                <span className="validation-error">{validateCoverLabel(form.coverLabel)}</span>
              )}
            </div>
          </label>

          <label className="field field--wide">
            <span>Summary</span>
            <textarea
              name="summary"
              rows="4"
              placeholder="Summarize the promise of the article in one or two sentences."
              value={form.summary}
              onChange={updateField}
              maxLength={500}
            />
            <div className="field-meta">
              <span className={`char-count ${form.summary.length > 500 ? 'error' : ''}`}>
                {form.summary.length}/500
              </span>
              {validateSummary(form.summary) && (
                <span className="validation-error">{validateSummary(form.summary)}</span>
              )}
            </div>
          </label>

          <div className="field field--wide">
            <TagSelector
              selectedTags={form.tags}
              onTagsChange={handleTagsChange}
              domain={form.domain}
              domainLabel={domainLookup[form.domain]?.name}
              suggestedTags={suggestedTags}
            />
            {validateTags(form.tags, form.domain) && (
              <span className="validation-error">{validateTags(form.tags, form.domain)}</span>
            )}
            {loadingTags ? <span className="field-note">Refreshing tag suggestions...</span> : null}
          </div>

          <label className="field field--wide">
            <span>Cover picture</span>
            <input
              name="coverImage"
              type="file"
              accept={ARTICLE_IMAGE_LIMITS.allowedTypes.join(',')}
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) {
                  return
                }

                const validationError = validateImageFile(file, 'Cover image')
                if (validationError) {
                  setCoverImageError(validationError)
                  setError(validationError)
                  event.target.value = ''
                  return
                }

                const reader = new FileReader()
                reader.onload = () => {
                  setForm((currentForm) => ({
                    ...currentForm,
                    coverImage: reader.result || '',
                  }))
                  setCoverImageError('')
                  setError('')
                }
                reader.readAsDataURL(file)
              }}
            />
            {form.coverImage ? (
              <div className="cover-preview">
                <img src={form.coverImage} alt="Cover preview" />
              </div>
            ) : (
              <p className="field-note">
                JPEG, PNG, WebP, or GIF up to {formatFileSize(ARTICLE_IMAGE_LIMITS.maxBytes)}.
              </p>
            )}
            {coverImageError ? (
              <span className="validation-error">{coverImageError}</span>
            ) : null}
          </label>
        </div>

        <div className={`editor-block${editorFullscreen ? ' editor-block--fullscreen' : ''}`}>
          <div className="editor-block__header">
            <div>
              <span className="eyebrow">Body</span>
              <h2>Write the article</h2>
            </div>
          <div className="editor-block__stats">
            <span>{wordCount} words</span>
            <span>{estimateReadTime(form.body)}</span>
            <span>
              {uploadedImageCount}/{ARTICLE_IMAGE_LIMITS.maxUploadedImages} images
            </span>
          </div>
            <button
              type="button"
              className="button button--ghost"
              title={editorFullscreen ? 'Exit full screen' : 'Expand to full screen'}
              onClick={() => setEditorFullscreen((value) => !value)}
            >
              {editorFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
          </div>

          <Editor
            value={form.body}
            onChange={(value) => {
              setEditorImageError('')
              setForm((currentForm) => ({
                ...currentForm,
                body: value,
              }))
            }}
            onError={(message) => {
              setEditorImageError(message)
              if (message) {
                setError(message)
              }
            }}
          />
          {validateBody(form.body) ? (
            <span className="validation-error">{validateBody(form.body)}</span>
          ) : null}
          {editorImageError ? (
            <span className="validation-error">{editorImageError}</span>
          ) : null}
        </div>

        {error ? <p className="form-message form-message--error">{error}</p> : null}
        {showDraftSavedNotification ? (
          <p className="form-message form-message--success">Draft saved.</p>
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
          <span className="eyebrow">Article card</span>
          <h2>{form.title.trim() || 'Your article title'}</h2>
          <p>{form.summary.trim() || 'The summary will appear here as you write.'}</p>
          <div className="article-card__tags">
            {tagPreview.length ? (
              tagPreview.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))
            ) : (
              <span className="tag">Choose tags</span>
            )}
          </div>
        </div>

        <div className="panel composer-sidebar__card">
          <span className="eyebrow">Before publishing</span>
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
          <span className="eyebrow">Author</span>
          <strong>{session.user.profile?.displayName}</strong>
          <p>
            Publishing as {session.user.role}. This profile appears with the
            article and links back to your author page.
          </p>
        </div>
      </aside>
    </div>
  )
}
