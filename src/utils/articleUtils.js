export function slugify(value) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || `story-${Date.now()}`
}

export function stripHtml(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function estimateReadTime(html = '') {
  const words = stripHtml(html).split(' ').filter(Boolean).length
  const minutes = Math.max(3, Math.ceil(words / 170))
  return `${minutes} min read`
}

function toValidDate(value) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export function formatShortDate(value, fallback = 'Date unavailable') {
  const parsedDate = toValidDate(value)

  if (!parsedDate) {
    return fallback
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate)
}

export function formatLongDate(value, fallback = 'Date unavailable') {
  const parsedDate = toValidDate(value)

  if (!parsedDate) {
    return fallback
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate)
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function getDisplayName(user) {
  return user?.profile?.displayName || user?.displayName || 'InnoBlog Member'
}

export function getHeadline(user) {
  return user?.profile?.headline || user?.headline || user?.role || 'Reader'
}

export function withProtocol(url = '') {
  if (!url) {
    return ''
  }

  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
