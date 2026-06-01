import React, { useEffect, useMemo, useState } from 'react'
import katex from 'katex'
import { FaChevronLeft, FaChevronRight, FaHeart, FaRegHeart } from 'react-icons/fa'

import { apiRequest, resolveImageUrl } from '../api'
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
  getInitials,
} from '../utils/articleUtils'

const VALID_ARTICLE_TAGS = new Set([
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
])

const BLOCK_ARTICLE_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul',
])

const INLINE_TAGS_WITH_BLOCK_FALLBACK = new Set(['span', 'strong', 'em'])
const VOID_ARTICLE_TAGS = new Set(['br', 'img'])

function normalizeCarouselImages(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
      .map((image) => ({
        src: resolveImageUrl(image?.src || ''),
        alt: String(image?.alt || '').trim(),
      }))
      .filter((image) => image.src)
  }

  try {
    return normalizeCarouselImages(JSON.parse(value))
  } catch {
    return []
  }
}

function getCarouselDimension(value, fallback) {
  const parsedValue = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

function ArticleImageCarousel({ images, width = 360, height = 540 }) {
  const slides = normalizeCarouselImages(images)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length)
    }, 3600)

    return () => window.clearInterval(timer)
  }, [slides.length])

  if (!slides.length) {
    return null
  }

  const safeActiveIndex = Math.min(activeIndex, slides.length - 1)

  function showPrevious() {
    setActiveIndex((index) => (index - 1 + slides.length) % slides.length)
  }

  function showNext() {
    setActiveIndex((index) => (index + 1) % slides.length)
  }

  return (
    <figure
      className="article-image-carousel"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
      }}
    >
      <img
        src={slides[safeActiveIndex].src}
        alt={slides[safeActiveIndex].alt || `Carousel image ${safeActiveIndex + 1}`}
        loading="lazy"
        decoding="async"
      />
      {slides.length > 1 ? (
        <>
          <button
            type="button"
            className="image-carousel-arrow image-carousel-arrow--prev"
            onClick={showPrevious}
            aria-label="Previous carousel image"
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            className="image-carousel-arrow image-carousel-arrow--next"
            onClick={showNext}
            aria-label="Next carousel image"
          >
            <FaChevronRight />
          </button>
          <div className="image-carousel-count">
            {safeActiveIndex + 1}/{slides.length}
          </div>
        </>
      ) : null}
    </figure>
  )
}

function mergeClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function hasBlockArticleDescendant(children) {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) {
      return false
    }

    const childType = child.type
    const childClassName = child.props?.className || ''

    if (typeof childType === 'string' && BLOCK_ARTICLE_TAGS.has(childType)) {
      return true
    }

    if (
      typeof childClassName === 'string' &&
      (
        childClassName.includes('article-code-block') ||
        childClassName.includes('article-ad-banner') ||
        childClassName.includes('math-node')
      )
    ) {
      return true
    }

    return hasBlockArticleDescendant(child.props?.children)
  })
}

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
  const [isLoadingComment, setIsLoadingComment] = useState(false)
  const [deletingCommentIds, setDeletingCommentIds] = useState(new Set())
  const [interactionError, setInteractionError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [activeHeading, setActiveHeading] = useState('')
  const [readingAdsEnabled, setReadingAdsEnabled] = useState(true)

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
        setComments(data.comments || [])
        setTotalComments(data.totalComments || 0)
        setCommentPage(1)
        setRelatedArticles(data.relatedArticles || [])
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
    let ignore = false

    async function loadPublicSettings() {
      try {
        const settings = await apiRequest('/settings/public')
        if (!ignore) {
          setReadingAdsEnabled(settings.readingAdsEnabled !== false)
        }
      } catch {
        if (!ignore) {
          setReadingAdsEnabled(true)
        }
      }
    }

    loadPublicSettings()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!article?.id) {
      return
    }

    let ignore = false

    async function loadInitialComments() {
      try {
        const data = await apiRequest(`/articles/${article.id}/comments?page=1&limit=10`)
        if (!ignore) {
          setComments(data.comments || [])
          setTotalComments(data.totalComments || 0)
          setCommentPage(1)
        }
      } catch (error) {
        if (!ignore) {
          console.error('Failed to load comments:', error)
        }
      }
    }

    loadInitialComments()

    return () => {
      ignore = true
    }
  }, [article?.id])

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

    setIsLoadingComment(true)
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
    } finally {
      setIsLoadingComment(false)
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

    setDeletingCommentIds((prev) => new Set([...prev, commentId]))

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
    } finally {
      setDeletingCommentIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(commentId)
        return newSet
      })
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

  function getElementProps(node) {
    const tagProps = {}

    if (!node.hasAttributes()) {
      return tagProps
    }

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
        tagProps.src = resolveImageUrl(attr.value)
      } else if (attr.name === 'alt') {
        tagProps.alt = attr.value
      } else if (attr.name === 'title') {
        tagProps.title = attr.value
      } else if ((attr.name === 'width' || attr.name === 'height') && /^\d+(\.\d+)?$/.test(attr.value)) {
        tagProps[attr.name] = attr.value
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

    return tagProps
  }

  function renderTableCell(cell, key) {
    const cellTag = cell.tagName.toLowerCase() === 'th' ? 'th' : 'td'
    const cellProps = getElementProps(cell)
    const children = Array.from(cell.childNodes)
      .map((child, index) => renderHtmlNode(child, `${key}-${index}`))
      .filter((child) => child !== null && child !== undefined && child !== '')

    return React.createElement(cellTag, { key, ...cellProps }, children)
  }

  function renderTableRow(row, key) {
    const cells = Array.from(row.children).filter((child) => {
      const childTag = child.tagName.toLowerCase()
      return childTag === 'td' || childTag === 'th'
    })

    return (
      <tr key={key}>
        {cells.length ? cells.map((cell, index) => renderTableCell(cell, `${key}-cell-${index}`)) : <td />}
      </tr>
    )
  }

  function renderTableNode(node, key) {
    const rows = Array.from(node.querySelectorAll('tr'))

    if (!rows.length) {
      return null
    }

    return (
      <table key={key} {...getElementProps(node)}>
        <tbody>
          {rows.map((row, index) => renderTableRow(row, `${key}-row-${index}`))}
        </tbody>
      </table>
    )
  }

  function renderHtmlNode(node, key) {
    if (node.nodeType === TEXT_NODE) {
      return node.textContent
    }

    if (node.nodeType !== ELEMENT_NODE) {
      return null
    }

    const tagName = node.tagName.toLowerCase()

    if (tagName === 'div' && node.getAttribute('data-type') === 'image-carousel') {
      const storedImages = normalizeCarouselImages(node.getAttribute('data-images'))
      const fallbackImages = Array.from(node.querySelectorAll('img'))
        .map((image, index) => ({
          src: image.getAttribute('src') || '',
          alt: image.getAttribute('alt') || `Carousel image ${index + 1}`,
        }))
        .filter((image) => image.src)

      return (
        <ArticleImageCarousel
          key={key}
          images={storedImages.length ? storedImages : fallbackImages}
          width={getCarouselDimension(node.getAttribute('data-width') || node.style.width, 360)}
          height={getCarouselDimension(node.getAttribute('data-height') || node.style.height, 540)}
        />
      )
    }

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

      return (
        <div key={key} className="article-code-block">
          <pre>
            <code className={`language-${language}`}>{value}</code>
          </pre>
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

    if (tagName === 'table') {
      return renderTableNode(node, key)
    }

    const children = Array.from(node.childNodes).map((child, index) =>
      renderHtmlNode(child, `${key}-${index}`),
    )

    const tagProps = getElementProps(node)
    if (tagName === 'img') {
      tagProps.loading = tagProps.loading || 'lazy'
      tagProps.decoding = tagProps.decoding || 'async'
    }
    const hasBlockChild = hasBlockArticleDescendant(children)
    let elementTag = VALID_ARTICLE_TAGS.has(tagName) ? tagName : 'div'

    if (elementTag === 'p' && hasBlockChild) {
      elementTag = 'div'
      tagProps.className = mergeClassNames(tagProps.className, 'story-paragraph')
    } else if (INLINE_TAGS_WITH_BLOCK_FALLBACK.has(elementTag) && hasBlockChild) {
      const originalTag = elementTag
      elementTag = 'div'
      tagProps.className = mergeClassNames(tagProps.className, `story-inline-block story-inline-block--${originalTag}`)

      if (originalTag === 'strong') {
        tagProps.style = { ...(tagProps.style || {}), fontWeight: 700 }
      } else if (originalTag === 'em') {
        tagProps.style = { ...(tagProps.style || {}), fontStyle: 'italic' }
      }
    }

    return VOID_ARTICLE_TAGS.has(elementTag)
      ? React.createElement(elementTag, { key, ...tagProps })
      : React.createElement(elementTag, { key, ...tagProps }, children)
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
      if (readingAdsEnabled && renderedNodes.length > 8) {
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
      } else if (readingAdsEnabled && renderedNodes.length > 4) {
        // For short articles, add one ad in the middle
        renderedNodes.splice(Math.floor(renderedNodes.length / 2), 0, createAdBanner('article-ad-banner'))
      }
      
      return renderedNodes
    } catch (parseError) {
      console.error('Failed to parse article body HTML:', parseError)
      return null
    }
  }

  // The parser helpers above are pure; only saved article HTML and ad settings should trigger reparsing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parsedBody = useMemo(() => parseArticleBody(article?.bodyHtml || ''), [
    article?.bodyHtml,
    readingAdsEnabled,
  ])

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
      const data = await apiRequest(`/articles/${article.id}/comments?page=${commentPage + 1}&limit=10`)
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
            <img src={resolveImageUrl(article.coverImage)} alt={article.title} />
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
          
            {readingAdsEnabled ? (
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
            ) : null}
          </div>
        </aside>
      </section>

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
          <span className="article-afterword__label">Tags</span>
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
        <section className="article-comments-section" aria-labelledby="article-comments-heading">
          <div className="article-comments">
            <div className="article-comments__header">
              <h2 id="article-comments-heading">Discussion</h2>
              <span>{totalComments} comments</span>
            </div>

            <form className="comment-form" onSubmit={handleCommentSubmit}>
              <span className="comment-avatar" aria-hidden="true">
                {session?.user ? getInitials(getDisplayName(session.user)) : 'G'}
              </span>
              <div className="comment-form__main">
                <label className="comment-input-label">
                  <span className="sr-only">Add a comment</span>
                  <input
                    type="text"
                    placeholder={session?.user ? 'Add a comment...' : 'Sign in to comment'}
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                  />
                </label>
                {commentError ? <p className="form-message form-message--error">{commentError}</p> : null}
                <div className="comment-form__actions">
                  {commentBody ? (
                    <button
                      className="button button--ghost button--small"
                      type="button"
                      onClick={() => {
                        setCommentBody('')
                        setCommentError('')
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    className="button button--primary button--small"
                    type="submit"
                    disabled={session?.user ? !commentBody.trim() || isLoadingComment : false}
                  >
                    {isLoadingComment ? <LoadingDots /> : 'Comment'}
                  </button>
                </div>
              </div>
            </form>

            <div className="comment-list">
              {comments.length ? (
                <>
                  {comments.map((comment) => (
                    <article key={comment.id} className="comment-card">
                      <span className="comment-avatar" aria-hidden="true">
                        {getInitials(getDisplayName(comment.author))}
                      </span>
                      <div className="comment-card__body">
                        <div className="comment-card__top">
                          <strong>{getDisplayName(comment.author)}</strong>
                          <span>{formatShortDate(comment.createdAt)}</span>
                        </div>
                        <p>{comment.body}</p>
                        {(session?.user?.role === 'admin' || comment.author?.id === session?.user?.id || article.author?.id === session?.user?.id) ? (
                          <button
                            type="button"
                            className="comment-delete"
                            onClick={() => handleCommentDelete(comment.id)}
                            disabled={deletingCommentIds.has(comment.id)}
                          >
                            {deletingCommentIds.has(comment.id) ? <LoadingDots /> : 'Delete'}
                          </button>
                        ) : null}
                      </div>
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
