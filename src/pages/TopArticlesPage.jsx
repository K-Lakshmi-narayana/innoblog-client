import ArticleCard from '../components/ArticleCard'
import SectionHeading from '../components/SectionHeading'

export default function TopArticlesPage({ articles }) {
  const leadStory = articles[0]
  const leaderboard = articles.slice(1, 6)

  return (
    <div className="page-stack">
      <section className="page-banner panel page-banner--split">
        <div>
          <span className="eyebrow">Leaderboard</span>
          <h1>Top articles ranked by live engagement.</h1>
          <p>
            Explore the most engaging articles, ranked dynamically based on real-time reader activity.
          </p>
        </div>
        <a className="button button--primary" href="#/articles">
          Browse all stories
        </a>
      </section>

      <section className="leaderboard-layout">
        {leadStory ? (
          <ArticleCard article={leadStory} variant="feature" />
        ) : (
          <div className="panel empty-panel">
            <strong>No ranked stories yet.</strong>
            <p>Once articles gather likes and comments, the leaderboard will populate.</p>
          </div>
        )}

        <div className="panel leaderboard-list">
          <SectionHeading
            eyebrow="Ranking"
            title="Most discussed this week"
            description="High-engagement stories with strong hooks, clarity, and practical depth."
          />

          {leaderboard.length ? (
            leaderboard.map((article, index) => (
              <a key={article.id} className="leaderboard-item" href={`#/article/${article.slug}`}>
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
          title="A premium reading lane for the strongest stories."
          description="This keeps your publication feeling curated, not endless."
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
