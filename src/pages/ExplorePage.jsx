import { useEffect, useState } from 'react'
import { FaMagnifyingGlass } from 'react-icons/fa6'

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

const ARTICLES_PER_PAGE = 10

export default function ExplorePage({ domains }) {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('recent')
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let ignore = false

    async function loadArticles() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ARTICLES_PER_PAGE),
          sort,
        })
        const searchTerm = submittedQuery.trim()

        if (searchTerm) {
          params.set('search', searchTerm)
        }

        const data = await apiRequest(`/articles?${params.toString()}`)

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
  }, [page, sort, submittedQuery])

  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, page - 2)
    return start + i
  }).filter((p) => p <= totalPages)

  function handleSortChange(event) {
    setSort(event.target.value)
    setPage(1)
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    setSubmittedQuery(query.trim())
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
            <a key={domain.slug} className="topic-pill" href={`/topic/${domain.slug}`}>
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

        <form className="catalog-toolbar panel catalog-toolbar--wide" onSubmit={handleSearchSubmit}>
          <div className="catalog-search">
            <label className="field">
              <span>Search the feed</span>
              <input
                type="text"
                placeholder="Search by title, summary, or tag"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button className="button button--primary catalog-search__button" type="submit" disabled={loading}>
              <FaMagnifyingGlass aria-hidden="true" />
              <span>Search</span>
            </button>
          </div>

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
          </div>
        </form>

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
          ) : articles.length ? (
            articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))
          ) : (
            <div className="panel empty-panel">
              <strong>No articles match the current search.</strong>
              <p>Try a different title, tag, or topic term.</p>
            </div>
          )}
        </div>

        {!loading && !error && totalCount > 0 && (
          <div className="pagination-summary">
            Showing {Math.min((page - 1) * ARTICLES_PER_PAGE + 1, totalCount)}-{Math.min(page * ARTICLES_PER_PAGE, totalCount)} of {totalCount} articles
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
