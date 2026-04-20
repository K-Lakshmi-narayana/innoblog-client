import { useState } from 'react'
import { heroMetrics } from '../data/siteContent'
import { apiRequest } from '../api'
import ArticleCard from '../components/ArticleCard'
import LoadingDots from '../components/LoadingDots'
import SectionHeading from '../components/SectionHeading'
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
      setPublishError(error.message)
    } finally {
      setPublishLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="hero panel">
        <div className="hero__content">
          <span className="eyebrow">Connected editorial platform</span>
          <h1>Read, Follow, Comment, and Publish in the World of AI and Modern Technology.</h1>
          <p>
            Dive into insightful content across Artificial Intelligence, Machine Learning, Deep Learning, Data Science, and Computer Vision. Learn from ideas, share your thoughts, and contribute your own knowledge to a growing community of builders and innovators.
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
                  ? 'Open the editor'
                  : 'Open your profile'
                : 'Login with OTP'}
            </a>
            <a className="button button--secondary" href="#/articles">
              Read articles
            </a>
          </div>

          <div className="hero__stats">
            {heroMetrics.map((metric, index) => (
              <div key={metric.label} className="stat-card">
                <strong>{heroValues[index]}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>

        {leadStory ? (
          <a className="spotlight-card" href={`#/article/${leadStory.slug}`}>
            <span className="eyebrow">Featured reading</span>
            <h2>{leadStory.title}</h2>
            <p>{leadStory.summary}</p>
            <div className="spotlight-card__footer">
              <span>by {getDisplayName(leadStory.author)} - </span>
              <span>{leadStory.readTime}</span>
            </div>
          </a>
        ) : (
          <div className="spotlight-card spotlight-card--empty">
            <span className="eyebrow">Editorial engine</span>
            <h2>{loading ? 'Loading stories from the backend.' : 'The database is ready for stories.'}</h2>
            <p>
              {error
                ? error
                : 'Once the admin grants author access and articles are published, the homepage will fill in automatically.'}
            </p>
            {loading ? <LoadingDots /> : null}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="Top articles"
          title="Start with the stories readers reach for first."
          description="Start with our featured stories—carefully curated to bring you the most impactful ideas, deep insights, and real-world perspectives across multiple domains."
          action={
            <a className="button button--ghost" href="#/top">
              View leaderboard
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
              <p>Likes and fresh publishing activity will build this section up.</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="Browse by domain"
          title="Discover content across specialized domains."
          description="Explore structured domains that bring together focused insights in ML, DL, DS, NLP, CV, and MLOps—making learning intuitive and organized."
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
          eyebrow="Latest dispatches"
          title="Explore the latest published articles."
          description="Stay up to date with the latest articles, covering emerging trends and innovations in modern technology."
          action={
            <a className="button button--ghost" href="#/articles">
              Explore all
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
                Login as the admin account or grant author access to start
                building the reading feed.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="cta-band panel">
        <div className="cta-content">
          <div className="cta-guidelines">
            <div>
              <span className="eyebrow">Publish request</span>
              <h2>Send your article details to publish.</h2>
              <p>
                Fill in your contact info, article details, and credit author fields. The admin will receive your request by email and follow up with publishing access.
              </p>
            </div>

            <div className="guidelines-card">
              <span className="eyebrow">Article guidelines</span>
              <h3>What we're looking for</h3>
              
              <div className="guideline-section">
                <strong>Content Quality</strong>
                <ul>
                  <li>Original, well-researched articles</li>
                  <li>Clear and engaging writing style</li>
                  <li>Practical insights and real-world examples</li>
                  <li>Minimum 800 words for substance</li>
                </ul>
              </div>

              <div className="guideline-section">
                <strong>Domain Focus</strong>
                <ul>
                  <li>Artificial Intelligence</li>
                  <li>Machine Learning</li>
                  <li>Deep Learning</li>
                  <li>Data Science</li>
                  <li>Computer Vision</li>
                </ul>
              </div>

              <div className="guideline-section">
                <strong>Publishing Process</strong>
                <ul>
                  <li>Submit article details and Google Docs link</li>
                  <li>Admin reviews your submission</li>
                  <li>Receive author access via email</li>
                  <li>Publish directly or request review</li>
                  <li>Earn follows and engagement</li>
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
            {publishLoading ? 'Sending request…' : 'Send request to admin'}
          </button>
        </form>
        </div>
      </section>
    </div>
  )
}
