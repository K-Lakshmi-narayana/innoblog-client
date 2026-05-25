import ArticleCard from '../components/ArticleCard'
import SectionHeading from '../components/SectionHeading'

export default function TopArticlesPage({ articles }) {
  const leadArticle = articles[0]
  const leaderboard = articles.slice(1, 6)

  return (
    <div className="page-stack">
      <section className="page-banner panel page-banner--split">
        <div>
        <span className="eyebrow">Most popular</span>
          <h1>Articles readers love the most.</h1>
          <p>
            Ranked by community engagement and readership, discover the articles making the biggest impact in our community.
          </p>
        </div>
        <a className="button button--primary" href="/articles">
          Browse all articles
        </a>
      </section>

      <section className="leaderboard-layout">
        {leadArticle ? (
          <ArticleCard article={leadArticle} variant="feature" />
        ) : (
          <div className="panel empty-panel">
            <strong>No popular articles yet.</strong>
            <p>As articles gain engagement, the most viewed pieces will appear here.</p>
          </div>
        )}

        <div className="panel leaderboard-list">
          <SectionHeading
            eyebrow="Community favorites"
            title="Top ranked articles"
            description="Articles that generate the most interest and engagement from our readers."
          />

          {leaderboard.length ? (
            leaderboard.map((article, index) => (
              <a key={article.id} className="leaderboard-item" href={`/article/${article.slug}`}>
                <span className="leaderboard-item__rank">
                  {String(index + 2).padStart(2, '0')}
                </span>
                <div>
                  <strong>{article.title}</strong>
                  <p>{article.summary}</p>
                </div>
              </a>
            ))
          ) : (
            <div className="leaderboard-item">
              <div>
                <strong>The leaderboard needs a little activity first.</strong>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="More featured reads"
          title="More articles worth opening."
          description="A short path back into the strongest pieces in the archive."
        />

        <div className="story-grid story-grid--three">
          {articles.slice(0, 3).map((article) => (
            <ArticleCard key={article.id} article={article} variant="feature" />
          ))}
        </div>
      </section>
    </div>
  )
}
