import React, { useEffect, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'

import { apiRequest } from '../api'
import ArticleCard from '../components/ArticleCard'
import ShareButton from '../components/ShareButton'
import LoadingDots from '../components/LoadingDots'
import { navigateTo } from '../hooks/useHashRoute'
import {
  formatLongDate,
  formatShortDate,
  getDisplayName,
  getHeadline,
  getInitials,
} from '../utils/articleUtils'

export default function ArticlePage({ slug, session, onDeleteArticle }) {
  const [article, setArticle] = useState(null)
  const [comments, setComments] = useState([])
  const [relatedArticles, setRelatedArticles] = useState([])
  const [recommendedArticles, setRecommendedArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [commentError, setCommentError] = useState('')
  const [interactionError, setInteractionError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [activeHeading, setActiveHeading] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadArticle() {
      setLoading(true)
      setError('')
      setDeleteError('')

      try {
        const data = await apiRequest(`/articles/${slug}`)

        if (ignore) {
          return
        }

        setArticle(data.article)
        setComments(data.comments)
        setRelatedArticles(data.relatedArticles)
        setRecommendedArticles([])
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message)
          loadRecommendations()
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    async function loadRecommendations() {
      try {
        const data = await apiRequest('/articles/top')
        if (!ignore) {
          setRecommendedArticles(data.articles)
        }
      } catch {
        // ignore recommendation load issues
      }
    }

    loadArticle()

    return () => {
      ignore = true
    }
  }, [session, slug])

  useEffect(() => {
    if (!article?.toc?.length) {
      setActiveHeading('')
      return
    }

    setActiveHeading(article.toc[0].id)
  }, [article?.id, article?.toc])

  useEffect(() => {
    if (!article?.toc?.length) {
      return undefined
    }

    const headingElements = article.toc
      .map((entry) => document.getElementById(entry.id))
      .filter(Boolean)

    if (!headingElements.length) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0]

        if (visibleEntry) {
          setActiveHeading(visibleEntry.target.id)
        }
      },
      {
        rootMargin: '-18% 0px -62% 0px',
        threshold: [0, 1],
      },
    )

    headingElements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [article?.id, article?.toc])

  async function handleLike() {
    if (!session?.user) {
      navigateTo('/login')
      return
    }

    try {
      const data = await apiRequest(`/articles/${article.id}/like`, {
        method: 'POST',
      })

      setArticle((currentArticle) =>
        currentArticle
          ? {
              ...currentArticle,
              likeCount: data.likeCount,
              likedByMe: data.likedByMe,
            }
          : currentArticle,
      )
      setInteractionError('')
    } catch (likeError) {
      setInteractionError(likeError.message)
    }
  }

  async function handleFollowAuthor() {
    if (!session?.user || !article?.author?.profile?.handle) {
      navigateTo('/login')
      return
    }

    try {
      const data = await apiRequest(`/profiles/${article.author.profile.handle}/follow`, {
        method: 'POST',
      })

      setArticle((currentArticle) =>
        currentArticle
          ? {
              ...currentArticle,
              author: {
                ...currentArticle.author,
                profile: data.profile,
              },
            }
          : currentArticle,
      )
      setInteractionError('')
    } catch (followError) {
      setInteractionError(followError.message)
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault()

    if (!session?.user) {
      navigateTo('/login')
      return
    }

    if (!commentBody.trim()) {
      setCommentError('Write a short comment before posting.')
      return
    }

    try {
      const data = await apiRequest(`/articles/${article.id}/comments`, {
        method: 'POST',
        body: {
          body: commentBody,
        },
      })

      setComments((currentComments) => [data.comment, ...currentComments])
      setArticle((currentArticle) =>
        currentArticle
          ? {
              ...currentArticle,
              commentCount: data.commentCount,
            }
          : currentArticle,
      )
      setCommentBody('')
      setCommentError('')
    } catch (submitError) {
      setCommentError(submitError.message)
    }
  }

  async function handleDeleteArticle() {
    if (!article) {
      return
    }

    if (!window.confirm('Delete this article? This cannot be undone.')) {
      return
    }

    try {
      if (onDeleteArticle) {
        await onDeleteArticle(article.id)
      } else {
        await apiRequest(`/articles/${article.id}`, {
          method: 'DELETE',
        })
        navigateTo('/articles')
      }
    } catch (deleteError) {
      setDeleteError(deleteError.message)
    }
  }

  async function handleCommentDelete(commentId) {
    if (!window.confirm('Delete this comment?')) {
      return
    }

    try {
      await apiRequest(`/comments/${commentId}`, {
        method: 'DELETE',
      })
      setComments((currentComments) => currentComments.filter((comment) => comment.id !== commentId))
      setArticle((currentArticle) =>
        currentArticle
          ? {
              ...currentArticle,
              commentCount: Math.max(0, currentArticle.commentCount - 1),
            }
          : currentArticle,
      )
      setInteractionError('')
    } catch (deleteError) {
      setInteractionError(deleteError.message)
    }
  }

  const TEXT_NODE = 3
  const ELEMENT_NODE = 1

  function getCodeLanguageFromClassName(className = '') {
    const classMatch = className.match(/language-([a-zA-Z0-9]+)/)
    if (classMatch) {
      return classMatch[1]
    }

    const dataMatch = className.match(/data-language=["']?([a-zA-Z0-9]+)["']?/) // fallback support
    return dataMatch ? dataMatch[1] : 'javascript'
  }

  function getCodeLanguageFromAttributes(element) {
    if (!element || element.nodeType !== ELEMENT_NODE) {
      return 'javascript'
    }

    const languageFromCode =
      element.getAttribute('data-language') ||
      getCodeLanguageFromClassName(element.className || '')

    if (languageFromCode) {
      return languageFromCode
    }

    const parent = element.parentElement
    if (parent?.tagName.toLowerCase() === 'pre') {
      return (
        parent.getAttribute('data-language') ||
        getCodeLanguageFromClassName(parent.className || '') ||
        'javascript'
      )
    }

    return 'javascript'
  }

  function renderHtmlNode(node, key) {
    if (node.nodeType === TEXT_NODE) {
      return node.textContent
    }

    if (node.nodeType !== ELEMENT_NODE) {
      return null
    }

    const tagName = node.tagName.toLowerCase()

    if (tagName === 'pre') {
      const code = node.querySelector('code')
      const language = getCodeLanguageFromAttributes(code || node)
      const value = code?.textContent || node.textContent || ''
      const lineCount = value.split('\n').length || 1
      const height = `${Math.max(40, Math.min(400, lineCount * 22 + 24))}px`

      return (
        <div key={key} className="monaco-code-block">
          <MonacoEditor
            height={height}
            language={language}
            value={value}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
            }}
          />
        </div>
      )
    }

    if (tagName === 'code' && node.parentElement?.tagName.toLowerCase() !== 'pre') {
      return (
        <code key={key} className={node.className || ''}>
          {node.textContent}
        </code>
      )
    }

    const children = Array.from(node.childNodes).map((child, index) =>
      renderHtmlNode(child, `${key}-${index}`),
    )

    const tagProps = { key }
    if (node.hasAttributes()) {
      Array.from(node.attributes).forEach((attr) => {
        if (attr.name === 'class') {
          tagProps.className = attr.value
        } else if (attr.name === 'id') {
          tagProps.id = attr.value
        } else if (attr.name === 'href') {
          tagProps.href = attr.value
          tagProps.target = '_blank'
          tagProps.rel = 'noreferrer'
        } else if (attr.name === 'src') {
          tagProps.src = attr.value
        } else if (attr.name === 'alt') {
          tagProps.alt = attr.value
        } else if (attr.name === 'title') {
          tagProps.title = attr.value
        }
      })
    }

    const validTags = [
      'div',
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'span',
      'blockquote',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'a',
      'img',
      'figure',
      'figcaption',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'pre',
      'code',
      'br',
    ]

    const elementTag = validTags.includes(tagName) ? tagName : 'div'

    return elementTag === 'br'
      ? <br key={key} />
      : React.createElement(elementTag, tagProps, children)
  }

  function parseArticleBody(html) {
    try {
      const parser = new DOMParser()
      const documentNode = parser.parseFromString(html, 'text/html')
      const nodes = Array.from(documentNode.body.childNodes)
      return nodes.map((node, index) => renderHtmlNode(node, `article-body-${index}`))
    } catch (parseError) {
      console.error('Failed to parse article body HTML:', parseError)
      return null
    }
  }

  const parsedBody = parseArticleBody(article?.bodyHtml || '')

  function getVisibilityMessage(status) {
    if (status === 'pending_review') {
      return 'This article is under review and only visible to the author or admins right now.'
    }

    if (status === 'draft') {
      return 'This draft is private and is not visible in the public reading feed.'
    }

    return 'This article is private and is not visible to readers right now.'
  }

  function scrollToHeading(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  if (loading) {
    return (
      <section className="panel empty-panel loading-screen">
        <div>
          <strong>Loading article...</strong>
          <LoadingDots />
        </div>
      </section>
    )
  }

  if (error || !article) {
    return (
      <section className="page-stack">
        <section className="panel empty-panel">
          <span className="eyebrow">Article not found</span>
          <h1>This article could not be loaded.</h1>
          <p>{error || 'The article does not exist or has been removed.'}</p>
          <a className="button button--primary" href="#/articles">
            Browse published stories
          </a>
        </section>

        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Recommended</span>
              <h2>Try one of these articles instead.</h2>
            </div>
          </div>

          <div className="story-grid story-grid--three">
            {recommendedArticles.length ? (
              recommendedArticles.map((entry) => <ArticleCard key={entry.id} article={entry} />)
            ) : (
              <div className="panel empty-panel">
                <strong>No recommended articles are available right now.</strong>
              </div>
            )}
          </div>
        </section>
      </section>
    )
  }

  const authorName = getDisplayName(article.author)
  const authorHeadline = getHeadline(article.author)
  const authorHandle = article.author?.profile?.handle
  const articleIsPubliclyVisible = article.isPubliclyVisible ?? (
    article.publicationStatus === 'published'
  )
  const canFollow =
    Boolean(authorHandle) &&
    session?.user?.profile?.handle !== authorHandle &&
    Boolean(session?.user)
  const canManageArticle =
    Boolean(article) &&
    Boolean(session?.user) &&
    (session.user.role === 'admin' || article.author?.id === session.user.id)

  return (
    <div className="page-stack story-page">
      <section className="panel story-hero">
        <div className="story-hero__copy">
          <a className="pill pill--soft pill--link" href={`#/domain/${article.domain}`}>
            {article.domain.toUpperCase()}
          </a>
          {!articleIsPubliclyVisible ? (
            <span className="pill pill--dark">{article.publicationStatus === 'pending_review' ? 'Pending review' : 'Private draft'}</span>
          ) : null}
          <h1>{article.title}</h1>
          <p>{article.summary}</p>
          {!articleIsPubliclyVisible ? (
            <p className="form-message">{getVisibilityMessage(article.publicationStatus)}</p>
          ) : null}

          <div className="story-hero__meta">
            <div className="author-inline">
              <span className="author-inline__avatar">{getInitials(authorName)}</span>
              <div>
                <strong>{authorName}</strong>
                <span>{authorHeadline}</span>
              </div>
            </div>

            <div className="story-hero__details">
              <span>{formatLongDate(article.publishedAt)}</span>
              <span>{article.readTime}</span>
              <span>{article.likeCount} likes</span>
              <span>{article.commentCount} comments</span>
            </div>
          </div>

          <div className="story-actions">
            {canManageArticle ? (
              <a className="button button--secondary" href={`#/article/${article.slug}/edit`}>
                Edit article
              </a>
            ) : null}

            {canManageArticle ? (
              <button className="button button--ghost" type="button" onClick={handleDeleteArticle}>
                Delete article
              </button>
            ) : null}
          </div>

          {deleteError ? <p className="form-message form-message--error">{deleteError}</p> : null}
          {interactionError ? (
            <p className="form-message form-message--error">{interactionError}</p>
          ) : null}
        </div>

        <div className="story-hero__visual">
          {article.coverImage ? (
            <img src={article.coverImage} alt={article.title} />
          ) : (
            <>
              <span>{article.coverLabel}</span>
              <strong>{article.domain.toUpperCase()}</strong>
            </>
          )}
        </div>
      </section>

      <section className="story-layout">
        <div className="panel story-content">
          <div className="story-body">
            {parsedBody !== null ? (
              parsedBody
            ) : (
              <div dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />
            )}
          </div>
        </div>

        <aside className="story-sidebar story-sidebar--right">
          <div className="panel sidebar-card toc-panel">
            <span className="eyebrow">Table of contents</span>
            {article.toc.filter((entry) => entry.level === 2).length ? (
              <div className="toc-list">
                {article.toc.filter((entry) => entry.level === 2).map((entry) => (
                  <button
                    key={entry.id}
                    className={`toc-link ${activeHeading === entry.id ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => scrollToHeading(entry.id)}
                  >
                    <strong>{entry.text}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <p>No headings were added to this article yet.</p>
            )}
          </div>
        </aside>
      </section>

      {/* Article interactions section below the content */}
      <section className="article-interactions">
        <div className="interactions-grid">
          {/* Author card */}
          <div className="panel interaction-card author-card-full">
            <span className="eyebrow">Author</span>
            <div className="author-profile">
              <span className="author-card__avatar">{getInitials(authorName)}</span>
              <div className="author-info">
                <strong>{authorName}</strong>
                <span>{authorHeadline}</span>
                <p>{article.author.profile?.bio || 'This author has not added a bio yet.'}</p>
                <p className="author-meta">
                  {article.author.profile?.followersCount || 0} followers · Published on{' '}
                  {formatShortDate(article.publishedAt)}
                </p>
                {authorHandle ? (
                  <a className="button button--secondary button--small" href={`#/profile/${authorHandle}`}>
                    View author profile
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {/* Engagement section */}
          <div className="panel interaction-card engagement-card">
            <span className="eyebrow">Engagement</span>
            <div className="engagement-actions">
              {articleIsPubliclyVisible ? (
                <button className="button button--primary" type="button" onClick={handleLike}>
                  {article.likedByMe ? '❤️ Unlike article' : '🤍 Like article'}
                </button>
              ) : null}

              <ShareButton title={article.title} url={`#/article/${article.slug}`} />

              {articleIsPubliclyVisible ? (
                <div className="engagement-stats">
                  <span>{article.likeCount} likes</span>
                  <span>{article.commentCount} comments</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Tags */}
          <div className="panel interaction-card tags-card">
            <span className="eyebrow">Tags</span>
            <div className="article-card__tags">
              {article.tags.length ? (
                article.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="tag">No tags added</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Comments section */}
      {articleIsPubliclyVisible ? (
        <section className="article-comments-section">
          <div className="panel">
            <span className="eyebrow">Community discussion</span>

            <form className="comment-form" onSubmit={handleCommentSubmit}>
              <label className="field">
                <span>Add a comment</span>
                <input
                  type="text"
                  placeholder="Share your reaction or question..."
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                />
              </label>
              {commentError ? <p className="form-message form-message--error">{commentError}</p> : null}
              <button className="button button--primary" type="submit">
                Post comment
              </button>
            </form>

            <div className="comment-list">
              {comments.length ? (
                comments.map((comment) => (
                  <article key={comment.id} className="comment-card">
                    <div className="comment-card__top">
                      <strong>{getDisplayName(comment.author)}</strong>
                      <span>{formatShortDate(comment.createdAt)}</span>
                    </div>
                    <p>{comment.body}</p>
                    {(session?.user?.role === 'admin' || comment.author?.id === session?.user?.id || article.author?.id === session?.user?.id) ? (
                      <button
                        type="button"
                        className="button button--ghost button--small comment-delete"
                        onClick={() => handleCommentDelete(comment.id)}
                      >
                        Delete comment
                      </button>
                    ) : null}
                  </article>
                ))
              ) : (
                <p>Be the first reader to comment on this story.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Related reads</span>
            <h2>Keep moving through the publication.</h2>
          </div>
        </div>

        <div className="story-grid story-grid--three">
          {relatedArticles.length ? (
            relatedArticles.slice(0, 3).map((entry) => <ArticleCard key={entry.id} article={entry} />)
          ) : (
            <div className="panel empty-panel">
              <strong>No related stories yet.</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
