import { useEffect, useState } from 'react'

import { estimateReadTime, slugify, stripHtml } from '../utils/articleUtils'

const STORAGE_KEY = 'innoblog-created-articles'

function readStoredArticles() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const savedValue = window.localStorage.getItem(STORAGE_KEY)
    return savedValue ? JSON.parse(savedValue) : []
  } catch {
    return []
  }
}

export function useLocalArticles(seedArticles) {
  const [createdArticles, setCreatedArticles] = useState(readStoredArticles)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createdArticles))
    } catch {
      // Ignore storage failures and keep the app usable.
    }
  }, [createdArticles])

  const articles = [...createdArticles, ...seedArticles].sort(
    (left, right) => new Date(right.publishedAt) - new Date(left.publishedAt),
  )

  function addArticle(draft, author) {
    const existingSlugs = new Set(articles.map((article) => article.slug))
    const baseSlug = slugify(draft.title)
    let slug = baseSlug
    let suffix = 2

    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }

    const bodyText = stripHtml(draft.body)
    const nextArticle = {
      id: globalThis.crypto?.randomUUID?.() ?? `article-${Date.now()}`,
      slug,
      title: draft.title.trim(),
      summary: draft.summary.trim() || bodyText.slice(0, 180),
      domain: draft.domain,
      author: {
        name: author?.name || 'Guest Writer',
        role: author?.title || 'Community Contributor',
      },
      publishedAt: new Date().toISOString(),
      readTime: estimateReadTime(draft.body),
      claps: 0,
      isTop: false,
      tags: draft.tags,
      coverLabel: draft.coverLabel.trim() || draft.domain.toUpperCase(),
      body: draft.body,
    }

    setCreatedArticles((currentArticles) => [nextArticle, ...currentArticles])
    return nextArticle
  }

  return {
    articles,
    addArticle,
  }
}
