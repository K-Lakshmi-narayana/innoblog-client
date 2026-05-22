export const MIN_ARTICLE_TAGS = 3
export const MAX_ARTICLE_TAGS = 8
export const MAX_ARTICLE_TAG_LENGTH = 50

export const tagSuggestionsByDomain = {
  ml: [
    'Machine Learning',
    'Model Evaluation',
    'Feature Engineering',
    'Recommendation Systems',
    'Responsible AI',
    'Model Monitoring',
    'Experiment Tracking',
    'AutoML',
    'Gradient Boosting',
    'Production ML',
    'Model Interpretability',
    'Synthetic Data',
    'Time Series',
    'Anomaly Detection',
    'Personalization',
    'Data Labeling',
  ],
  dl: [
    'Deep Learning',
    'Transformers',
    'Neural Networks',
    'Foundation Models',
    'Fine Tuning',
    'Model Compression',
    'GPU Training',
    'Distributed Training',
    'Attention Mechanisms',
    'Representation Learning',
    'Generative AI',
    'Diffusion Models',
    'Self Supervised Learning',
    'Optimization',
    'Quantization',
    'Training Stability',
  ],
  ds: [
    'Data Science',
    'Exploratory Analysis',
    'Business Metrics',
    'Dashboard Design',
    'Cohort Analysis',
    'Data Storytelling',
    'A/B Testing',
    'Forecasting',
    'Customer Analytics',
    'Data Cleaning',
    'SQL Analytics',
    'Experiment Design',
    'Product Analytics',
    'Visualization',
    'Decision Science',
    'Analytics Engineering',
  ],
  nlp: [
    'Natural Language Processing',
    'Large Language Models',
    'Prompt Engineering',
    'RAG',
    'Embeddings',
    'Semantic Search',
    'Text Classification',
    'Information Extraction',
    'Conversational AI',
    'Evaluation',
    'Agent Workflows',
    'Tokenization',
    'Knowledge Graphs',
    'Multilingual NLP',
    'Safety Guardrails',
    'Vector Databases',
  ],
  cv: [
    'Computer Vision',
    'Object Detection',
    'Image Segmentation',
    'Vision Transformers',
    'Multimodal AI',
    'OCR',
    'Video Analytics',
    'Image Classification',
    'Edge Vision',
    'Data Augmentation',
    'Pose Estimation',
    'Medical Imaging',
    'Visual Search',
    'Synthetic Images',
    'Annotation Strategy',
    'Model Deployment',
  ],
  mlops: [
    'MLOps',
    'Model Deployment',
    'CI/CD',
    'Feature Stores',
    'Model Registry',
    'Pipeline Orchestration',
    'Observability',
    'Data Drift',
    'Inference Scaling',
    'Batch Inference',
    'Real Time Serving',
    'Model Governance',
    'Cost Optimization',
    'Testing Strategy',
    'Rollback Strategy',
    'Infrastructure',
  ],
  stats: [
    'Statistics',
    'Bayesian Methods',
    'Causal Inference',
    'Hypothesis Testing',
    'Regression',
    'Sampling',
    'Uncertainty',
    'Experimental Design',
    'Survival Analysis',
    'Statistical Power',
    'Confidence Intervals',
    'Probability',
    'Missing Data',
    'Hierarchical Models',
    'Nonparametric Methods',
    'Effect Size',
  ],
}

export function normalizeTagKey(value = '') {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase()
}

export function getTagSuggestionsForDomain(domain = '') {
  return tagSuggestionsByDomain[normalizeTagKey(domain)] || []
}

export function getCanonicalTag(value, domain = '') {
  const suggestions = getTagSuggestionsForDomain(domain)
  const normalized = normalizeTagKey(value)

  return suggestions.find((tag) => normalizeTagKey(tag) === normalized) || ''
}

export function getUnknownTags(tags = [], domain = '') {
  const suggestions = getTagSuggestionsForDomain(domain)
  const allowedKeys = new Set(suggestions.map(normalizeTagKey))
  const rawTags = Array.isArray(tags) ? tags : String(tags).split(',')

  if (!allowedKeys.size) {
    return []
  }

  return rawTags
    .map((tag) => String(tag || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .filter((tag) => !allowedKeys.has(normalizeTagKey(tag)))
}
