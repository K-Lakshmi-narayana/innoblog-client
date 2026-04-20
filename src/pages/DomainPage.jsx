import ArticleCard from '../components/ArticleCard'
import SectionHeading from '../components/SectionHeading'

export default function DomainPage({ articles, domain }) {
  const leadStory = articles[0]
  const remainingStories = articles.slice(1)

  return (
    <div className="page-stack">
      <section className="page-banner panel">
        <div>
          <span className="eyebrow">{domain.label} domain</span>
          <h1>{domain.name} articles</h1>
          <p>{domain.description}</p>
        </div>
        <div className="page-banner__metric">
          <strong>{String(articles.length).padStart(2, '0')}</strong>
          <span>stories in this domain</span>
        </div>
      </section>

      {leadStory ? (
        <section>
          <SectionHeading
            eyebrow="Domain highlight"
            title="Lead article"
            description="A strong first story sets the tone for the rest of the feed."
          />
          <ArticleCard article={leadStory} variant="feature" />
        </section>
      ) : (
        <section className="panel empty-panel">
          <strong>No articles are published in {domain.name} yet.</strong>
          <p>The domain page is ready and will fill automatically when authors publish here.</p>
        </section>
      )}

      <section>
        <SectionHeading
          eyebrow="More from this topic"
          title={`Continue reading in ${domain.name}.`}
          description="Focused feeds help readers stay in a single subject area without extra navigation overhead."
        />

        <div className="story-grid story-grid--two">
          {remainingStories.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  )
}
