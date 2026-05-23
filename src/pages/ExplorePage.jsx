import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import { apiRequest } from '../api'
import ArticleCard from '../components/ArticleCard'
import LoadingDots from '../components/LoadingDots'
import SectionHeading from '../components/SectionHeading'
import { getUserFriendlyError } from '../utils/errorMessages'

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'top', label: 'Top rated' },
  { value: 'a-z', label: 'A - Z' },
  { value: 'z-a', label: 'Z - A' },
]

const LIMIT_OPTIONS = [5, 10, 20]

export default function ExplorePage({ domains }) {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [sort, setSort] = useState('recent')
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    let ignore = false

    async function loadArticles() {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest(
          `/articles?page=${page}&limit=${limit}&sort=${encodeURIComponent(sort)}`,
        )

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

    loadArticles()

    return () => {
      ignore = true
    }
  }, [page, limit, sort])

  const filteredArticles = useMemo(() => {
    if (!deferredQuery.trim()) {
      return articles
    }

    const normalizedQuery = deferredQuery.toLowerCase()
    return articles.filter((article) =>
      [article.title, article.summary, article.domain, ...(article.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [articles, deferredQuery])

  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, page - 2)
    return start + i
  }).filter((p) => p <= totalPages)

  function handleSortChange(event) {
    setSort(event.target.value)
    setPage(1)
  }

  function handleLimitChange(event) {
    setLimit(Number(event.target.value))
    setPage(1)
  }

  function handlePreviousPage() {
    setPage((current) => Math.max(1, current - 1))
  }

  function handleNextPage() {
    setPage((current) => Math.min(totalPages, current + 1))
  }

  return (
    <div className="page-stack">
      <section className="page-banner panel">
        <div>
          <span className="eyebrow">Article directory</span>
          <h1>Explore all our published content.</h1>
          <p>
            Search by keyword, filter by topic, or sort by popularity and date to find exactly what you're looking for.
          </p>
        </div>
        <div className="page-banner__pills">
          {domains.map((domain) => (
            <a key={domain.slug} className="topic-pill" href={`#/domain/${domain.slug}`}>
              {domain.label}
              <span>{domain.count} articles</span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="All articles"
          title="Search and discover content easily."
          description="Use search and filters to navigate through our collection of curated articles."
        />

        <div className="catalog-toolbar panel catalog-toolbar--wide">
          <label className="field">
            <span>Search the feed</span>
            <input
              type="text"
              placeholder="Search by title, summary, or tag"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="catalog-toolbar__controls">
            <label className="field field--small">
              <span>Sort by</span>
              <select value={sort} onChange={handleSortChange}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--small">
              <span>Per page</span>
              <select value={limit} onChange={handleLimitChange}>
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="story-grid story-grid--two">
          {loading ? (
            <div className="panel empty-panel loading-screen">
              <div>
                <strong>Loading article feed...</strong>
                <LoadingDots />
              </div>
            </div>
          ) : error ? (
            <div className="panel empty-panel">
              <strong>Could not load articles.</strong>
              <p>{error}</p>
            </div>
          ) : filteredArticles.length ? (
            filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))
          ) : (
            <div className="panel empty-panel">
              <strong>No stories match the current search.</strong>
              <p>Try a different title, tag, or domain term.</p>
            </div>
          )}
        </div>

        {!loading && !error && totalCount > 0 && (
          <div className="pagination-summary">
            Showing {Math.min((page - 1) * limit + 1, totalCount)}-{Math.min(page * limit, totalCount)} of {totalCount} articles
          </div>
        )}

        <div className="pagination-controls">
          <button
            className="button button--ghost"
            type="button"
            onClick={handlePreviousPage}
            disabled={page <= 1 || loading}
          >
            Previous
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
            className="button button--ghost"
            type="button"
            onClick={handleNextPage}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  )
}
