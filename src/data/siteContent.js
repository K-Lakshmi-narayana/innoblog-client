export const domains = [
  {
    slug: 'ml',
    label: 'ML',
    name: 'Machine Learning',
    description: 'Applied modeling, experimentation, and product-minded ML systems.',
  },
  {
    slug: 'dl',
    label: 'DL',
    name: 'Deep Learning',
    description: 'Architectures, training strategy, and model behavior at scale.',
  },
  {
    slug: 'ds',
    label: 'DS',
    name: 'Data Science',
    description: 'Decision-making, metrics, storytelling, and analytical craft.',
  },
  {
    slug: 'nlp',
    label: 'NLP',
    name: 'Natural Language Processing',
    description: 'Language systems, prompting, evaluation, and text intelligence.',
  },
  {
    slug: 'cv',
    label: 'CV',
    name: 'Computer Vision',
    description: 'Visual understanding, multimodal systems, and real-world perception.',
  },
  {
    slug: 'mlops',
    label: 'MLOps',
    name: 'MLOps',
    description: 'Pipelines, deployment, observability, and operational excellence.',
  },
  {
    slug: 'stats',
    label: 'Stats',
    name: 'Statistics',
    description: 'Statistical methods, analysis, inference, and data interpretation.',
  },
]

export const domainLookup = Object.fromEntries(
  domains.map((domain) => [domain.slug, domain]),
)

export const heroMetrics = [
  { label: 'Technical domains' },
  { label: 'Articles published' },
  { label: 'Readers per day' },
]

export const loginBenefits = [
  'Discover personalized articles tailored to your interests.',
  'Follow domains that match your learning goals.',
  'Write and publish your own insights with ease.',
]

export const publishingChecklist = [
  'Use section headings so the table of contents can guide readers through the story.',
  'Add a summary and tags so the article card feels sharp in the feed.',
  'Keep your closing section practical so readers leave with a next step.',
]
