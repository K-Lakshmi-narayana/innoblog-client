import React, { useEffect, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import katex from 'katex'
import { FaHeart, FaRegHeart } from 'react-icons/fa'

import { apiRequest } from '../api'
import ArticleCard from '../components/ArticleCard'
import ShareButton from '../components/ShareButton'
import LoadingDots from '../components/LoadingDots'
import { navigateTo } from '../hooks/useHashRoute'
import { getUserFriendlyError } from '../utils/errorMessages'
import { renderMathInHtml } from '../utils/mathRenderer'
import {
  formatLongDate,
  formatShortDate,
  getDisplayName,
} from '../utils/articleUtils'

export default function ArticlePage({ slug, session, onDeleteArticle }) {
  const [article, setArticle] = useState(null)
  const [comments, setComments] = useState([])
  const [totalComments, setTotalComments] = useState(0)
  const [commentPage, setCommentPage] = useState(1)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
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
        setTotalComments(data.totalComments || 0)
        setCommentPage(1)
        setRelatedArticles(data.relatedArticles)
        setRecommendedArticles([])
      } catch (loadError) {
        if (!ignore) {
          setError(getUserFriendlyError(loadError))
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
    const tocHeadings = article?.toc?.filter((entry) => entry.level === 2) || []

    if (!tocHeadings.length) {
      setActiveHeading('')
      return
    }

    setActiveHeading(tocHeadings[0].id)
  }, [article?.id, article?.toc])

  useEffect(() => {
    const tocHeadings = article?.toc?.filter((entry) => entry.level === 2) || []

    if (!tocHeadings.length) {
      return undefined
    }

    const headingElements = tocHeadings
      .map((entry) => document.getElementById(entry.id))
      .filter(Boolean)

    if (!headingElements.length) {
      return undefined
    }

    let animationFrame = 0

    function updateActiveHeading() {
      const activationOffset = 140
      const currentHeading = headingElements.reduce((activeElement, element) => {
        return element.getBoundingClientRect().top <= activationOffset ? element : activeElement
      }, headingElements[0])

      setActiveHeading(currentHeading.id)
    }

    function handleScroll() {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(updateActiveHeading)
    }

    updateActiveHeading()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
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
      setInteractionError(getUserFriendlyError(likeError))
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
      setInteractionError(getUserFriendlyError(followError))
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
      setTotalComments((current) => current + 1)
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
      setCommentError(getUserFriendlyError(submitError))
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
      setDeleteError(getUserFriendlyError(deleteError))
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
      setTotalComments((current) => Math.max(0, current - 1))
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
      setInteractionError(getUserFriendlyError(deleteError))
    }
  }

  const TEXT_NODE = 3
  const ELEMENT_NODE = 1

  function parseStyleString(styleStr) {
    const styles = {}
    if (!styleStr) return styles

    styleStr.split(';').forEach((rule) => {
      const [property, value] = rule.split(':')
      if (property && value) {
        const trimmedProperty = property.trim()
        if (trimmedProperty.startsWith('--')) {
          styles[trimmedProperty] = value.trim()
          return
        }

        const camelCaseProperty = property
          .trim()
          .split('-')
          .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
          .join('')
        styles[camelCaseProperty] = value.trim()
      }
    })

    return styles
  }

  function isSafeHeaderColor(value = '') {
    return /^#[0-9a-f]{3,8}$/i.test(value.trim())
  }

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

    // Handle Tiptap Math nodes (saved as <div data-type="math">)
    if (tagName === 'div' && node.getAttribute('data-type') === 'math') {
      const latex = node.getAttribute('data-latex')
      if (latex) {
        try {
          const rendered = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: true,
          })
          return (
            <div key={key} className="math-node math-render math-render--display">
              <div
                className="math-render"
                dangerouslySetInnerHTML={{ __html: rendered }}
              />
            </div>
          )
        } catch (error) {
          console.error('Failed to render math:', latex, error)
          return (
            <div key={key} className="math-error">
              Invalid LaTeX: {latex}
            </div>
          )
        }
      }
    }

    // Handle custom math elements
    if (tagName === 'math-inline' || tagName === 'math-display') {
      const isDisplay = tagName === 'math-display'
      return (
        <span
          key={key}
          className={`math-render ${isDisplay ? 'math-render--display' : 'math-render--inline'}`}
          dangerouslySetInnerHTML={{ __html: node.innerHTML }}
        />
      )
    }

    if (tagName === 'math-error') {
      return (
        <span key={key} className="math-error">
          {node.textContent}
        </span>
      )
    }

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
        } else if (attr.name === 'style') {
          tagProps.style = {
            ...(tagProps.style || {}),
            ...parseStyleString(attr.value),
          }
        } else if (attr.name.startsWith('data-')) {
          tagProps[attr.name] = attr.value

          if (attr.name === 'data-header-color' && isSafeHeaderColor(attr.value)) {
            tagProps.style = {
              ...(tagProps.style || {}),
              '--header-color': attr.value,
            }
          }
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
      // Apply math rendering first
      const htmlWithMath = renderMathInHtml(html)
      
      const parser = new DOMParser()
      const documentNode = parser.parseFromString(htmlWithMath, 'text/html')
      const nodes = Array.from(documentNode.body.childNodes)
      const renderedNodes = nodes.map((node, index) => renderHtmlNode(node, `article-body-${index}`))
      
      // Create ad helper function
      const createAdBanner = (key) => (
        <div key={key} className="article-ad-banner">
          <div className="ad-banner-content">
            <span className="ad-label">Advertisement</span>
            <a href="https://www.innomatics.in/" target="_blank" rel="noopener noreferrer" className="ad-banner-link">
              <div className="ad-banner-box">
                <div className="ad-banner-text">Discover More at Innomatics</div>
                <div className="ad-banner-tagline">Training, projects, and career support</div>
              </div>
            </a>
          </div>
        </div>
      )
      
      // Inject multiple ads based on content length
      if (renderedNodes.length > 8) {
        // For longer articles, inject ads at multiple points
        const positions = []
        if (renderedNodes.length > 20) {
          // 4 ads for very long articles
          positions.push(Math.floor(renderedNodes.length * 0.25))
          positions.push(Math.floor(renderedNodes.length * 0.5))
          positions.push(Math.floor(renderedNodes.length * 0.75))
        } else if (renderedNodes.length > 12) {
          // 2 ads for medium articles
          positions.push(Math.floor(renderedNodes.length * 0.33))
          positions.push(Math.floor(renderedNodes.length * 0.66))
        } else {
          // 1 ad for shorter articles
          positions.push(Math.floor(renderedNodes.length / 2))
        }
        
        // Insert ads in reverse order to maintain correct indices
        positions.reverse().forEach((pos, idx) => {
          renderedNodes.splice(pos, 0, createAdBanner(`article-ad-banner-${idx}`))
        })
      } else if (renderedNodes.length > 4) {
        // For short articles, add one ad in the middle
        renderedNodes.splice(Math.floor(renderedNodes.length / 2), 0, createAdBanner('article-ad-banner'))
      }
      
      return renderedNodes
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
    const element = document.getElementById(id)
    if (!element) return

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    const nextUrl = `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`
    window.history.pushState(null, '', nextUrl)
  }

  useEffect(() => {
    if (!article?.toc?.length || !window.location.hash) {
      return undefined
    }

    const headingId = decodeURIComponent(window.location.hash.replace(/^#/, ''))
    const timer = window.setTimeout(() => {
      const element = document.getElementById(headingId)

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    }, 120)

    return () => window.clearTimeout(timer)
  }, [article?.id, article?.toc])

  async function handleLoadMoreComments() {
    if (loadingMoreComments || !article) {
      return
    }

    setLoadingMoreComments(true)

    try {
      const data = await apiRequest(`/articles/${article.id}/comments?page=${commentPage + 1}&limit=20`)
      setComments((currentComments) => [...currentComments, ...data.comments])
      setCommentPage(commentPage + 1)
    } catch (loadError) {
      setInteractionError(getUserFriendlyError(loadError))
    } finally {
      setLoadingMoreComments(false)
    }
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
          <a className="button button--primary" href="/articles">
            Browse published articles
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
  const authorHandle = article.author?.profile?.handle
  const articleTags = article.tags || []
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
          <a className="pill pill--soft pill--link" href={`/topic/${article.domain}`}>
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

            <div style={{marginLeft: "auto", "marginRight": "10px"}} className="story-hero__details">
              <span>{formatLongDate(article.publishedAt)}</span>
              <span>{article.readTime}</span>
            </div>
          </div>

          <div className="story-actions">
            {canFollow ? (
              <button className="button button--secondary" type="button" onClick={handleFollowAuthor}>
                {article.author?.profile?.isFollowing ? 'Unfollow author' : 'Follow author'}
              </button>
            ) : null}

            {canManageArticle ? (
              <a className="button button--secondary" href={`/article/${article.slug}/edit`}>
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
        <article className="story-body">
          {parsedBody !== null ? (
            parsedBody
          ) : (
            <div dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />
          )}
        </article>

        <aside className="story-sidebar story-sidebar--right">
          <div className="story-sidebar__sticky">
            <div className="panel sidebar-card toc-panel">
              <span className="eyebrow">Table of contents</span>
              {article.toc.filter((entry) => entry.level === 2).length ? (
                <div className="toc-list">
                  {article.toc.filter((entry) => entry.level === 2).map((entry) => (
                    <a
                      key={entry.id}
                      className={`toc-link ${activeHeading === entry.id ? 'is-active' : ''}`}
                      href={`#${entry.id}`}
                      onClick={(event) => {
                        event.preventDefault()
                        scrollToHeading(entry.id)
                      }}
                    >
                      <strong>{entry.text}</strong>
                    </a>
                  ))}
                </div>
              ) : (
                <p>No headings were added to this article yet.</p>
              )}
            </div>
          
            {/* Vertical Ad Box */}
            <a 
              href="https://www.innomatics.in/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="panel sidebar-card vertical-ad-box"
            >
              <span className="ad-label">Sponsored</span>
              <div className="ad-content">
                <div className="ad-icon">IRL</div>
                <h4>Innomatics</h4>
                <p>Data and AI programs</p>
                <div className="ad-button">Learn more</div>
              </div>
            </a>
          </div>
        </aside>
      </section>

      {/* Article interactions section below the content */}
      <section className="panel article-afterword">
        <div className="article-afterword__main">
          <div>
            <span className="eyebrow">Author Details</span>
            <p>
              Written by{' '}
              {authorHandle ? (
                <a className="article-afterword__author" href={`/profile/${authorHandle}`}>
                  {authorName}
                </a>
              ) : (
                <strong>{authorName}</strong>
              )}
              <span className="article-afterword__date">Published {formatShortDate(article.publishedAt)}</span>
            </p>
          </div>

          <div className="article-afterword__actions">
            {articleIsPubliclyVisible ? (
              <button
                className={`article-afterword__button article-like-button${article.likedByMe ? ' is-liked' : ''}`}
                type="button"
                onClick={handleLike}
                aria-label={article.likedByMe ? 'Unlike article' : 'Like article'}
              >
                {article.likedByMe ? <FaHeart aria-hidden="true" /> : <FaRegHeart aria-hidden="true" />}
                <span>{article.likedByMe ? 'Liked' : 'Like the article'}</span>
              </button>
            ) : null}

            <ShareButton title={article.title} url={`/article/${article.slug}`} label="Share it" />
          </div>
        </div>

        <div className="article-afterword__meta">
          <div className="article-afterword__tags">
            {articleTags.length ? (
              articleTags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))
            ) : (
              <span className="tag">No tags added</span>
            )}
          </div>
        </div>
      </section>

      {/* Comments section */}
      {articleIsPubliclyVisible ? (
        <section className="article-comments-section">
          <div className="panel">
            <span className="eyebrow">Discussion</span>

            <form className="comment-form" onSubmit={handleCommentSubmit}>
              <label className="field">
                <span>Add a comment</span>
                <input
                  type="text"
                  placeholder="Add a response or question"
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
                <>
                  {comments.map((comment) => (
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
                  ))}
                  {comments.length < totalComments ? (
                    <div className="load-more-section">
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={handleLoadMoreComments}
                        disabled={loadingMoreComments}
                      >
                        {loadingMoreComments ? (
                          <>
                            <span>Loading more comments</span>
                            <LoadingDots />
                          </>
                        ) : (
                          `Load more comments (${comments.length} of ${totalComments})`
                        )}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <p>Be the first reader to comment on this article.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Related reads</span>
            <h2>Read something related.</h2>
          </div>
        </div>

        <div className="story-grid story-grid--three">
          {relatedArticles.length ? (
            relatedArticles.slice(0, 3).map((entry) => <ArticleCard key={entry.id} article={entry} />)
          ) : (
            <div className="panel empty-panel">
              <strong>No related articles yet.</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
