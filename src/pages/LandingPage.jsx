import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../api'
import ArticleCard from '../components/ArticleCard'
import LoadingDots from '../components/LoadingDots'
import SectionHeading from '../components/SectionHeading'
import { getUserFriendlyError } from '../utils/errorMessages'

function getUniqueArticles(...articleLists) {
  const seenArticles = new Set()
  const uniqueArticles = []

  articleLists.flat().forEach((article) => {
    const key = article?.id || article?.slug

    if (!key || seenArticles.has(key)) {
      return
    }

    seenArticles.add(key)
    uniqueArticles.push(article)
  })

  return uniqueArticles
}

function validateSuggestionForm(form) {
  const errors = {}
  const name = form.name.trim()
  const email = form.email.trim()
  const topicName = form.topicName.trim()
  const articleTitle = form.articleTitle.trim()
  const details = form.details.trim()

  if (name.length < 2) {
    errors.name = 'Add your name.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Add a valid email address.'
  }

  if (!['topic', 'article'].includes(form.suggestionType)) {
    errors.suggestionType = 'Choose what you want to suggest.'
  }

  if (form.suggestionType === 'topic' && topicName.length < 2) {
    errors.topicName = 'Add the topic name.'
  }

  if (form.suggestionType === 'article' && articleTitle.length < 5) {
    errors.articleTitle = 'Add the article idea.'
  }

  if (details.length < 15) {
    errors.details = 'Add a little more detail so the team can understand it.'
  } else if (details.length > 1000) {
    errors.details = 'Keep the suggestion under 1000 characters.'
  }

  return errors
}

export default function LandingPage({
  articles,
  domains,
  session,
  topArticles,
  loading,
  error,
}) {
  const featuredArticles = getUniqueArticles(topArticles, articles).slice(0, 3)
  const secondaryArticles = topArticles.slice(3, 6)
  const latestArticles = articles.slice(0, 4)
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [suggestionForm, setSuggestionForm] = useState({
    name: '',
    email: '',
    suggestionType: 'topic',
    topicName: '',
    articleTitle: '',
    details: '',
  })
  const [suggestionErrors, setSuggestionErrors] = useState({})
  const [suggestionFeedback, setSuggestionFeedback] = useState('')
  const [suggestionError, setSuggestionError] = useState('')
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const featuredSwipeRef = useRef({
    startX: 0,
    startY: 0,
    tracking: false,
  })

  useEffect(() => {
    if (featuredArticles.length <= 1) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setFeaturedIndex((index) => (index + 1) % featuredArticles.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [featuredArticles.length])

  useEffect(() => {
    if (featuredIndex >= featuredArticles.length) {
      setFeaturedIndex(0)
    }
  }, [featuredArticles.length, featuredIndex])

  function updateSuggestionField(event) {
    const { name, value } = event.target

    setSuggestionForm((current) => ({
      ...current,
      [name]: value,
    }))

    setSuggestionErrors((current) => ({
      ...current,
      [name]: '',
    }))
  }

  async function handleSuggestionRequest(event) {
    event.preventDefault()
    const validationErrors = validateSuggestionForm(suggestionForm)

    setSuggestionError('')
    setSuggestionFeedback('')
    setSuggestionErrors(validationErrors)

    if (Object.keys(validationErrors).length) {
      return
    }

    setSuggestionLoading(true)

    try {
      const data = await apiRequest('/suggestions', {
        method: 'POST',
        body: suggestionForm,
      })

      setSuggestionFeedback(data.message)
      setSuggestionForm({
        name: '',
        email: '',
        suggestionType: 'topic',
        topicName: '',
        articleTitle: '',
        details: '',
      })
    } catch (error) {
      setSuggestionError(getUserFriendlyError(error))
    } finally {
      setSuggestionLoading(false)
    }
  }

  function showFeaturedOffset(offset) {
    if (featuredArticles.length <= 1) {
      return
    }

    setFeaturedIndex((index) => (index + offset + featuredArticles.length) % featuredArticles.length)
  }

  function handleFeaturedTouchStart(event) {
    const touch = event.touches?.[0]
    if (!touch) {
      return
    }

    featuredSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      tracking: true,
    }
  }

  function handleFeaturedTouchEnd(event) {
    const touch = event.changedTouches?.[0]
    const swipe = featuredSwipeRef.current

    if (!touch || !swipe.tracking) {
      return
    }

    featuredSwipeRef.current.tracking = false
    const deltaX = touch.clientX - swipe.startX
    const deltaY = touch.clientY - swipe.startY

    if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      showFeaturedOffset(deltaX < 0 ? 1 : -1)
    }
  }

  return (
    <div className="page-stack">
      <section className="hero panel">
        <div className="hero__content">
          <span className="eyebrow">Discover quality articles</span>
          <h1>The future belongs to people who understand AI. Master AI by learning one article at a time.</h1>
          <p>
            Explore a curated hub of cutting-edge articles, expert insights, and practical tutorials covering AI related emerging technologies shaping the future. Learn from industry leaders as they simplify complex ideas, share real-world applications, and uncover the latest breakthroughs, tools, and trends. <br /> <br /> Whether you're a beginner, developer, researcher, or tech enthusiast, discover fresh perspectives, expand your knowledge, share your ideas, and become part of a thriving community passionate about innovation and the future of technology.
          </p>

          <div className="hero__actions">
            <a
              className="button button--primary"
              href={
                session
                  ? session.user.canWrite
                    ? '/create'
                    : '/profile/me'
                  : '/login'
              }
            >
              {session
                ? session.user.canWrite
                  ? 'Write Article'
                  : 'My Profile'
                : 'Join Now'}
            </a>
            <a className="button button--secondary" href="/articles">
              Explore Articles
            </a>
          </div>

          <a 
            href="https://www.innomatics.in/register-now/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="panel sidebar-card vertical-ad-box"
          >
            <div className="ad-content">
              <h4>Innomatics Research Labs</h4>
              <p>Join Our Online & Offline Courses.</p>
            </div>
          </a>
        </div>

        {featuredArticles.length ? (
          <div className="spotlight-card featured-carousel" aria-label="Featured articles">
            <span className="eyebrow featured-spot">Featured articles</span>
            <div
              className="featured-carousel__viewport"
              onTouchStart={handleFeaturedTouchStart}
              onTouchEnd={handleFeaturedTouchEnd}
            >
              <div
                className="featured-carousel__track"
                style={{ transform: `translateX(-${featuredIndex * 100}%)` }}
              >
                {featuredArticles.map((article) => (
                  <div key={article.id || article.slug} className="featured-carousel__slide">
                    <ArticleCard article={article} variant="featured" />
                  </div>
                ))}
              </div>
            </div>
            <div className="featured-carousel__dots" aria-label="Featured article navigation">
              {featuredArticles.map((article, index) => (
                <button
                  key={article.id || article.slug}
                  className={`featured-carousel__dot${index === featuredIndex ? ' is-active' : ''}`}
                  type="button"
                  aria-label={`Show featured article ${index + 1}`}
                  onClick={() => setFeaturedIndex(index)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="spotlight-card spotlight-card--empty">
            <span className="eyebrow">Latest article</span>
            <h2>{loading ? 'Loading published articles.' : 'No articles have been published yet.'}</h2>
            <p>
              {error
                ? error
                : 'When authors publish their first pieces, the newest article will appear here.'}
            </p>
            {loading ? <LoadingDots /> : null}
          </div>
        )}
      </section>

   <section>
        <SectionHeading
          eyebrow="Latest articles"
          title="Fresh writing from the publication."
          description="New posts appear here as soon as they are published."
          action={
            <a className="button button--ghost" href="/articles">
              View all
            </a>
          }
        />

        <div className="story-grid story-grid--two">
          {latestArticles.length ? (
            latestArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))
          ) : (
            <div className="panel empty-panel">
              <strong>No articles published yet.</strong>
              <p>
                Grant author access or publish the first piece to start the feed.
              </p>
            </div>
          )}
        </div>
      </section>


      <section>
        <SectionHeading
          eyebrow="Trending now"
          title="Discover what readers are talking about."
          description="The most engaging and highly-rated articles are highlighted here for easy discovery."
          action={
            <a className="button button--ghost" href="/top-articles">
              See all trending
            </a>
          }
        />

        <div className="story-grid story-grid--three">
          {secondaryArticles.length ? (
            secondaryArticles.map((article) => (
              <ArticleCard key={article.id} article={article} variant="feature" />
            ))
          ) : (
            <div className="panel empty-panel">
              <strong>No featured articles yet.</strong>
              <p>Reader activity will shape this section as the publication grows.</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="Browse by topic"
          title="Follow the topics you care about."
          description="Each topic keeps related articles together, from machine learning and NLP to MLOps and statistics."
        />

        <div className="domain-grid">
          {domains.map((domain) => (
            <a key={domain.slug} className="domain-card" href={`/topic/${domain.slug}`}>
              <div className="domain-card__top">
                <span className="pill pill--soft">{domain.label}</span>
                <strong>{String(domain.count).padStart(2, '0')} articles</strong>
              </div>
              <h3>{domain.name}</h3>
              <p>{domain.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="cta-band panel">
        <div className="cta-content">
          <div className="cta-guidelines">
            <div>
              <span className="eyebrow">Suggest what to cover next</span>
              <h2>Ask for topics and articles you want to read.</h2>
              <p>
                Tell the editorial team which extra topics should be added, or which article ideas would help you learn faster. Reader suggestions help shape the publication roadmap.
              </p>
            </div>

            <div className="guidelines-card">
              <span className="eyebrow">Useful suggestions</span>
              <h3>What helps the team decide</h3>
              
              <div className="guideline-section">
                <strong>For new topics</strong>
                <ul>
                  <li>Name the topic clearly</li>
                  <li>Explain who would benefit from it</li>
                  <li>Mention related tools, skills, or subtopics</li>
                </ul>
              </div>

              <div className="guideline-section">
                <strong>For article ideas</strong>
                <ul>
                  <li>Share the question you want answered</li>
                  <li>Include the experience level if it matters</li>
                  <li>Describe the outcome you want after reading</li>
                </ul>
              </div>

              <div className="guideline-section">
                <strong>Review process</strong>
                <ul>
                  <li>Suggestions are reviewed by the content team</li>
                  <li>Popular requests are prioritized for planning</li>
                  <li>Approved ideas may become new topics or articles</li>
                </ul>
              </div>
            </div>
          </div>

          <form className="composer-form cta-form" onSubmit={handleSuggestionRequest}>
            <div className="composer-grid">
              <label className="field">
                <span>Your name</span>
                <input
                  name="name"
                  type="text"
                  value={suggestionForm.name}
                  onChange={updateSuggestionField}
                  aria-invalid={Boolean(suggestionErrors.name)}
                />
                {suggestionErrors.name ? <span className="validation-error">{suggestionErrors.name}</span> : null}
              </label>

              <label className="field">
                <span>Your email</span>
                <input
                  name="email"
                  type="email"
                  value={suggestionForm.email}
                  onChange={updateSuggestionField}
                  aria-invalid={Boolean(suggestionErrors.email)}
                />
                {suggestionErrors.email ? <span className="validation-error">{suggestionErrors.email}</span> : null}
              </label>

              <label className="field field--wide">
                <span>Suggestion type</span>
                <select
                  name="suggestionType"
                  value={suggestionForm.suggestionType}
                  onChange={updateSuggestionField}
                  aria-invalid={Boolean(suggestionErrors.suggestionType)}
                >
                  <option value="topic">Extra topic to add</option>
                  <option value="article">Article I want to read</option>
                </select>
                {suggestionErrors.suggestionType ? (
                  <span className="validation-error">{suggestionErrors.suggestionType}</span>
                ) : null}
              </label>

              {suggestionForm.suggestionType === 'topic' ? (
                <label className="field field--wide">
                  <span>Topic name</span>
                  <input
                    name="topicName"
                    type="text"
                    value={suggestionForm.topicName}
                    onChange={updateSuggestionField}
                    placeholder="Example: Agentic AI"
                    aria-invalid={Boolean(suggestionErrors.topicName)}
                  />
                  {suggestionErrors.topicName ? (
                    <span className="validation-error">{suggestionErrors.topicName}</span>
                  ) : null}
                </label>
              ) : (
                <label className="field field--wide">
                  <span>Article idea</span>
                  <input
                    name="articleTitle"
                    type="text"
                    value={suggestionForm.articleTitle}
                    onChange={updateSuggestionField}
                    placeholder="Example: How vector databases work in production"
                    aria-invalid={Boolean(suggestionErrors.articleTitle)}
                  />
                  {suggestionErrors.articleTitle ? (
                    <span className="validation-error">{suggestionErrors.articleTitle}</span>
                  ) : null}
                </label>
              )}

              <label className="field field--wide">
                <span>Suggestion details</span>
                <textarea
                  name="details"
                  rows="5"
                  value={suggestionForm.details}
                  onChange={updateSuggestionField}
                  placeholder="Share why this would be useful and what you hope the article or topic covers."
                  maxLength={1000}
                  aria-invalid={Boolean(suggestionErrors.details)}
                />
                <div className="field-meta">
                  <span className={`char-count ${suggestionForm.details.length > 1000 ? 'error' : ''}`}>
                    {suggestionForm.details.length}/1000
                  </span>
                  {suggestionErrors.details ? (
                    <span className="validation-error">{suggestionErrors.details}</span>
                  ) : null}
                </div>
              </label>
            </div>

            {suggestionError ? <p className="form-message form-message--error">{suggestionError}</p> : null}
            {suggestionFeedback ? <p className="form-message form-message--success">{suggestionFeedback}</p> : null}

            <button className="button button--primary" type="submit" disabled={suggestionLoading}>
              {suggestionLoading ? 'Sending suggestion...' : 'Send suggestion'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
