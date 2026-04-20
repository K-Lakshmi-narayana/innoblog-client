import { domainLookup } from '../data/siteContent'
import { formatShortDate, getDisplayName, getHeadline } from '../utils/articleUtils'

export default function ArticleCard({ article, variant = 'default', href }) {
  const domain = domainLookup[article.domain]
  const authorName = getDisplayName(article.author)
  const authorHeadline = getHeadline(article.author)
  const articleIsPublic =
    article.isPubliclyVisible ?? article.publicationStatus === 'published'
  const targetHref = href || `#/article/${article.slug}`
  const activityLabel = articleIsPublic
    ? formatShortDate(article.publishedAt, 'Recently published')
    : article.publicationStatus === 'pending_review'
    ? `Requested ${formatShortDate(article.publicationRequestDate || article.updatedAt, 'recently')}`
    : `Saved ${formatShortDate(article.updatedAt || article.createdAt, 'recently')}`

  return (
    <a className={`article-card article-card--${variant}`} href={targetHref}>
      <div
        className="article-card__visual"
        style={article.coverImage ? { backgroundImage: `url(${article.coverImage})` } : undefined}
      >
        <span className="article-card__visual-mark">{domain?.label ?? 'AI'}</span>
        <span className="article-card__visual-label">{article.coverLabel}</span>
      </div>

      <div className="article-card__body">
        <div className="article-card__meta">
          <span className="pill pill--soft">{domain?.name ?? article.domain}</span>
          {article.isTop ? <span className="pill pill--dark">Top story</span> : null}
        </div>

        <div className="article-card__copy">
          <h3>{article.title}</h3>
          <p>{article.summary}</p>
        </div>

        <div className="article-card__tags">
          {article.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="article-card__footer">
          <div>
            <strong>{authorName}</strong>
            <span>
              {authorHeadline} · {activityLabel} · {article.readTime}
            </span>
          </div>
          <span className="clap-count">
            {article.likeCount} likes · {article.commentCount} comments
          </span>
        </div>
      </div>
    </a>
  )
}
