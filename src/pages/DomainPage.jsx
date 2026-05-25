import { useEffect, useState } from 'react'
import { apiRequest } from '../api'
import ArticleCard from '../components/ArticleCard'
import SectionHeading from '../components/SectionHeading'
import LoadingDots from '../components/LoadingDots'
import { getUserFriendlyError } from '../utils/errorMessages'
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6'

export default function DomainPage({ domain }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let ignore = false

    async function loadDomainArticles() {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest(`/articles?topic=${domain.slug}&page=${page}&limit=${limit}`)

        if (ignore) {
          return
        }

        setArticles(data.articles)
        setTotalCount(data.totalCount || 0)
        setTotalPages(data.totalPages || 1)
      } catch (fetchError) {
        if (!ignore) {
          setError(getUserFriendlyError(fetchError))
          setArticles([])
          setTotalCount(0)
          setTotalPages(1)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadDomainArticles()

    return () => {
      ignore = true
    }
  }, [domain.slug, page, limit])

  function handlePreviousPage() {
    setPage((current) => Math.max(1, current - 1))
  }

  function handleNextPage() {
    setPage((current) => Math.min(totalPages, current + 1))
  }

  const pageNumbers = Array.from({ length: Math.min(4, totalPages) }, (_, i) => {
    const start = Math.max(1, page - 2)
    return start + i
  }).filter((p) => p <= totalPages)

  const leadArticle = articles[0]
  const remainingArticles = articles.slice(1)

  if (loading) {
    return (
      <section className="panel empty-panel loading-screen">
        <div>
          <strong>Loading {domain.name} articles...</strong>
          <LoadingDots />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel empty-panel">
        <strong>Error loading articles</strong>
        <p>{error}</p>
      </section>
    )
  }

  return (
    <div className="page-stack">
      <section className="page-banner panel">
        <div>
          <span className="eyebrow">{domain.label} topic</span>
          <h1>{domain.name} articles</h1>
          <p>{domain.description}</p>
        </div>
        <div className="page-banner__metric">
          <strong>{String(totalCount).padStart(2, '0')}</strong>
          <span>articles in this topic</span>
        </div>
      </section>

      {leadArticle ? (
        <section>
          <SectionHeading
            eyebrow="Topic highlight"
            title="Start here"
            description={`The latest ${domain.name} article opens the topic feed.`}
          />
          <ArticleCard article={leadArticle} variant="feature" />
        </section>
      ) : (
        <section className="panel empty-panel">
          <strong>No articles are published in {domain.name} yet.</strong>
          <p>New articles in this topic will appear here after publication.</p>
        </section>
      )}

      <section>
        <SectionHeading
          eyebrow="More from this topic"
          title={`Continue reading in ${domain.name}.`}
          description="Stay in one subject area and move through related articles at your own pace."
        />

        <div className="story-grid story-grid--two">
          {remainingArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      {totalCount > 10 && (
        <>
          <div className="pagination-summary">
            Showing {Math.min((page - 1) * limit + 1, totalCount)}-{Math.min(page * limit, totalCount)} of {totalCount} articles
          </div>

          <div className="pagination-controls">
            <button
              style={{padding: "10px", width: "50px"}}
              className="button button--ghost"
              type="button"
              onClick={handlePreviousPage}
              disabled={page <= 1 || loading}
            >
              <FaArrowLeft />
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                className={`button button--ghost${pageNumber === page ? ' is-active' : ''}`}
                type="button"
                onClick={() => setPage(pageNumber)}
                disabled={loading}
              >
                {pageNumber}
              </button>
            ))}

            <button
              style={{padding: "10px", width: "50px"}}
              className="button button--ghost"
              type="button"
              onClick={handleNextPage}
              disabled={page >= totalPages || loading}
            >
              <FaArrowRight />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
