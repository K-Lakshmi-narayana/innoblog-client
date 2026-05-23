import { useState } from 'react'
import { heroMetrics } from '../data/siteContent'
import { apiRequest } from '../api'
import ArticleCard from '../components/ArticleCard'
import LoadingDots from '../components/LoadingDots'
import SectionHeading from '../components/SectionHeading'
import { getUserFriendlyError } from '../utils/errorMessages'
import { getDisplayName } from '../utils/articleUtils'

export default function LandingPage({
  articles,
  domains,
  session,
  topArticles,
  loading,
  error,
}) {
  const leadStory = topArticles[0] ?? articles[0]
  const secondaryStories = topArticles.slice(1, 4)
  const latestStories = articles.slice(0, 4)
  const authorCount = new Set(
    articles.map((article) => article.author?.id || article.author?.profile?.handle).filter(Boolean),
  ).size
  const heroValues = [
    String(domains.length).padStart(2, '0'),
    String(articles.length).padStart(2, '0'),
    String(authorCount).padStart(2, '0'),
  ]

  const [publishForm, setPublishForm] = useState({
    name: '',
    email: '',
    articleTitle: '',
    articleSummary: '',
    googleDocsLink: '',
    creditName: '',
    creditEmail: '',
  })
  const [publishFeedback, setPublishFeedback] = useState('')
  const [publishError, setPublishError] = useState('')
  const [publishLoading, setPublishLoading] = useState(false)

  async function handlePublishRequest(event) {
    event.preventDefault()
    setPublishError('')
    setPublishFeedback('')
    setPublishLoading(true)

    try {
      const data = await apiRequest('/publish-requests', {
        method: 'POST',
        body: publishForm,
      })

      setPublishFeedback(data.message)
      setPublishForm({
        name: '',
        email: '',
        articleTitle: '',
        articleSummary: '',
        googleDocsLink: '',
        creditName: '',
        creditEmail: '',
      })
    } catch (error) {
      setPublishError(getUserFriendlyError(error))
    } finally {
      setPublishLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="hero panel">
        <div className="hero__content">
          <span className="eyebrow">Discover quality articles</span>
          <h1>The future belongs to people who understand AI. Master AI by learning one article at a time.</h1>
          <p>
            Explore a curated collection of articles written by experts in their fields. Discover new perspectives, learn from industry leaders, and engage with a thriving community of knowledge seekers. Read, share, and contribute your own insights.
          </p>

          <div className="hero__actions">
            <a
              className="button button--primary"
              href={
                session
                  ? session.user.canWrite
                    ? '#/create'
                    : '#/profile/me'
                  : '#/login'
              }
            >
              {session
                ? session.user.canWrite
                  ? 'Write Article'
                  : 'My Profile'
                : 'Join Now'}
            </a>
            <a className="button button--secondary" href="#/articles">
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

        {leadStory ? (
          <a className="spotlight-card" href={`#/article/${leadStory.slug}`}>
            <span className="eyebrow featured-spot">Featured article</span>
            <h2>{leadStory.title}</h2>
            <p>{leadStory.summary}</p>
            <div className="spotlight-card__footer">
              <span>by {getDisplayName(leadStory.author)} - </span>
              <span>{leadStory.readTime}</span>
            </div>
          </a>
        ) : (
          <div className="spotlight-card spotlight-card--empty">
            <span className="eyebrow">Latest article</span>
            <h2>{loading ? 'Loading published articles.' : 'No articles have been published yet.'}</h2>
            <p>
              {error
                ? error
                : 'When authors publish their first pieces, the newest story will appear here.'}
            </p>
            {loading ? <LoadingDots /> : null}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="Trending now"
          title="Discover what readers are talking about."
          description="The most engaging and highly-rated articles are highlighted here for easy discovery."
          action={
            <a className="button button--ghost" href="#/top">
              See all trending
            </a>
          }
        />

        <div className="story-grid story-grid--three">
          {secondaryStories.length ? (
            secondaryStories.map((article) => (
              <ArticleCard key={article.id} article={article} variant="feature" />
            ))
          ) : (
            <div className="panel empty-panel">
              <strong>No featured stories yet.</strong>
              <p>Reader activity will shape this section as the publication grows.</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="Browse by domain"
          title="Follow the topics you care about."
          description="Each domain keeps related articles together, from machine learning and NLP to MLOps and statistics."
        />

        <div className="domain-grid">
          {domains.map((domain) => (
            <a key={domain.slug} className="domain-card" href={`#/domain/${domain.slug}`}>
              <div className="domain-card__top">
                <span className="pill pill--soft">{domain.label}</span>
                <strong>{String(domain.count).padStart(2, '0')} stories</strong>
              </div>
              <h3>{domain.name}</h3>
              <p>{domain.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="Latest articles"
          title="Fresh writing from the publication."
          description="New posts appear here as soon as they are published."
          action={
            <a className="button button--ghost" href="#/articles">
              View all
            </a>
          }
        />

        <div className="story-grid story-grid--two">
          {latestStories.length ? (
            latestStories.map((article) => (
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

      <section className="cta-band panel">
        <div className="cta-content">
          <div className="cta-guidelines">
            <div>
              <span className="eyebrow">Submit your article</span>
              <h2>Share your knowledge with our readers.</h2>
              <p>
                Submit your article for review. Our editorial team will evaluate it against our guidelines. Approved articles will be published and shared with our growing community of readers.
              </p>
            </div>

            <div className="guidelines-card">
              <span className="eyebrow">Submission guidelines</span>
              <h3>What we're looking for</h3>
              
              <div className="guideline-section">
                <strong>Article quality</strong>
                <ul>
                  <li>Well-researched and original content</li>
                  <li>Clear structure with compelling arguments</li>
                  <li>Practical insights or actionable advice</li>
                  <li>Thoroughly edited and polished writing</li>
                </ul>
              </div>

              <div className="guideline-section">
                <strong>Content focus</strong>
                <ul>
                  <li>Technology and innovation</li>
                  <li>Business and strategy</li>
                  <li>Trending topics and analysis</li>
                  <li>Expert perspectives and case studies</li>
                </ul>
              </div>

              <div className="guideline-section">
                <strong>Publication process</strong>
                <ul>
                  <li>Submit your article with full details</li>
                  <li>Our team reviews within 5-7 business days</li>
                  <li>Receive editorial feedback or approval</li>
                  <li>Your article goes live immediately upon approval</li>
                </ul>
              </div>
            </div>
          </div>

          <form className="composer-form cta-form" onSubmit={handlePublishRequest}>
          <div className="composer-grid">
            <label className="field">
              <span>Your name</span>
              <input
                type="text"
                value={publishForm.name}
                onChange={(event) =>
                  setPublishForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Your email</span>
              <input
                type="email"
                value={publishForm.email}
                onChange={(event) =>
                  setPublishForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field field--wide">
              <span>Article title</span>
              <input
                type="text"
                value={publishForm.articleTitle}
                onChange={(event) =>
                  setPublishForm((current) => ({
                    ...current,
                    articleTitle: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field field--wide">
              <span>Google Docs link</span>
              <input
                type="url"
                value={publishForm.googleDocsLink}
                onChange={(event) =>
                  setPublishForm((current) => ({
                    ...current,
                    googleDocsLink: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field field--wide">
              <span>Article summary</span>
              <textarea
                rows="3"
                value={publishForm.articleSummary}
                onChange={(event) =>
                  setPublishForm((current) => ({
                    ...current,
                    articleSummary: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Credit author name</span>
              <input
                type="text"
                value={publishForm.creditName}
                onChange={(event) =>
                  setPublishForm((current) => ({
                    ...current,
                    creditName: event.target.value,
                  }))
                }
                placeholder="Leave blank to use your name"
              />
            </label>

            <label className="field">
              <span>Credit author email</span>
              <input
                type="email"
                value={publishForm.creditEmail}
                onChange={(event) =>
                  setPublishForm((current) => ({
                    ...current,
                    creditEmail: event.target.value,
                  }))
                }
                placeholder="Leave blank to use your email"
              />
            </label>
          </div>

          {publishError ? <p className="form-message" style={{ color: '#b21f1f' }}>{publishError}</p> : null}
          {publishFeedback ? <p className="form-message">{publishFeedback}</p> : null}

          <button className="button button--primary" type="submit" disabled={publishLoading}>
            {publishLoading ? 'Sending request...' : 'Send request'}
          </button>
        </form>
        </div>
      </section>
    </div>
  )
}
