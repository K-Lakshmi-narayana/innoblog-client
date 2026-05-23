export const domains = [
  {
    slug: 'ml',
    label: 'ML',
    name: 'Machine Learning',
    description: 'Modeling practice, evaluation, and production lessons from real projects.',
  },
  {
    slug: 'dl',
    label: 'DL',
    name: 'Deep Learning',
    description: 'Training notes, architecture choices, and behavior you can reason about.',
  },
  {
    slug: 'ds',
    label: 'DS',
    name: 'Data Science',
    description: 'Analysis, metrics, and clear explanations for better decisions.',
  },
  {
    slug: 'nlp',
    label: 'NLP',
    name: 'Natural Language Processing',
    description: 'Language systems, retrieval, prompting, and practical evaluation.',
  },
  {
    slug: 'cv',
    label: 'CV',
    name: 'Computer Vision',
    description: 'Image models, visual pipelines, and deployment notes from the field.',
  },
  {
    slug: 'mlops',
    label: 'MLOps',
    name: 'MLOps',
    description: 'Pipelines, deployment, monitoring, and the work after a model ships.',
  },
  {
    slug: 'stats',
    label: 'Stats',
    name: 'Statistics',
    description: 'Inference, uncertainty, experiment design, and careful interpretation.',
  },
]

export const domainLookup = Object.fromEntries(
  domains.map((domain) => [domain.slug, domain]),
)

export const heroMetrics = [
  { label: 'Topics' },
  { label: 'Published articles' },
  { label: 'Active authors' },
]

export const loginBenefits = [
  'Create your profile and become part of our reading community.',
  'Save favorite articles and bookmark content for later.',
  'Write and publish your own articles to share with others.',
]

export const publishingChecklist = [
  'Use clear, descriptive section headings for easy navigation.',
  'Write a compelling summary and select relevant tags.',
  'End with a clear conclusion or actionable takeaway.',
]
