import {
  MAX_ARTICLE_TAG_LENGTH,
  MAX_ARTICLE_TAGS,
  MIN_ARTICLE_TAGS,
  getUnknownTags,
} from '../data/tagSuggestions'

/**
 * Frontend validation rules for form fields
 */

export const FIELD_LIMITS = {
  // Article/Draft
  title: { min: 5, max: 200 },
  summary: { min: 10, max: 500 },
  coverLabel: { min: 0, max: 100 },
  body: { min: 120 },
  
  // Tags
  tag: { max: MAX_ARTICLE_TAG_LENGTH },
  tags: { min: MIN_ARTICLE_TAGS, max: MAX_ARTICLE_TAGS },
  
  // Comments
  comment: { min: 1, max: 2000 },
  
  // Profile
  name: { min: 2, max: 100 },
  bio: { max: 500 },
  handle: { min: 3, max: 30 },
}

export function validateTitle(title) {
  if (!title || !title.trim()) {
    return 'Title is required.'
  }
  if (title.length < FIELD_LIMITS.title.min) {
    return `Title must be at least ${FIELD_LIMITS.title.min} characters.`
  }
  if (title.length > FIELD_LIMITS.title.max) {
    return `Title must not exceed ${FIELD_LIMITS.title.max} characters.`
  }
  return null
}

export function validateSummary(summary) {
  if (!summary || !summary.trim()) {
    return 'Summary is required.'
  }
  if (summary.length < FIELD_LIMITS.summary.min) {
    return `Summary must be at least ${FIELD_LIMITS.summary.min} characters.`
  }
  if (summary.length > FIELD_LIMITS.summary.max) {
    return `Summary must not exceed ${FIELD_LIMITS.summary.max} characters.`
  }
  return null
}

export function validateCoverLabel(coverLabel) {
  if (coverLabel && coverLabel.length > FIELD_LIMITS.coverLabel.max) {
    return `Cover label must not exceed ${FIELD_LIMITS.coverLabel.max} characters.`
  }
  return null
}

export function validateBody(body) {
  const plainText = body
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim()
  
  if (!plainText || plainText.length < FIELD_LIMITS.body.min) {
    return `Article body must have at least ${FIELD_LIMITS.body.min} characters.`
  }
  return null
}

export function validateTags(tags, domain = '') {
  // Support both string and array formats
  let tagArray = tags;
  
  if (typeof tags === 'string') {
    tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  // Check tag count
  if (!tagArray || tagArray.length < FIELD_LIMITS.tags.min) {
    return `You must select at least ${FIELD_LIMITS.tags.min} tags.`
  }

  if (tagArray.length > FIELD_LIMITS.tags.max) {
    return `You can select a maximum of ${FIELD_LIMITS.tags.max} tags.`
  }

  // Check individual tag length
  for (const tag of tagArray) {
    if (tag.length > FIELD_LIMITS.tag.max) {
      return `Each tag must not exceed ${FIELD_LIMITS.tag.max} characters. "${tag}" is too long.`
    }
  }

  const unknownTags = getUnknownTags(tagArray, domain)
  if (unknownTags.length > 0) {
    return `Choose tags from the selected domain list. Remove: ${unknownTags.join(', ')}.`
  }

  return null
}

export function validateComment(body) {
  if (!body || !body.trim()) {
    return 'Comment cannot be empty.'
  }
  if (body.length > FIELD_LIMITS.comment.max) {
    return `Comment must not exceed ${FIELD_LIMITS.comment.max} characters.`
  }
  return null
}

export function validateName(name) {
  if (!name || !name.trim()) {
    return 'Name is required.'
  }
  if (name.length < FIELD_LIMITS.name.min) {
    return `Name must be at least ${FIELD_LIMITS.name.min} characters.`
  }
  if (name.length > FIELD_LIMITS.name.max) {
    return `Name must not exceed ${FIELD_LIMITS.name.max} characters.`
  }
  return null
}

export function validateBio(bio) {
  if (bio && bio.length > FIELD_LIMITS.bio.max) {
    return `Bio must not exceed ${FIELD_LIMITS.bio.max} characters.`
  }
  return null
}

export function validateHandle(handle) {
  if (!handle || !handle.trim()) {
    return 'Handle is required.'
  }
  if (handle.length < FIELD_LIMITS.handle.min) {
    return `Handle must be at least ${FIELD_LIMITS.handle.min} characters.`
  }
  if (handle.length > FIELD_LIMITS.handle.max) {
    return `Handle must not exceed ${FIELD_LIMITS.handle.max} characters.`
  }
  if (!/^[a-z0-9_-]+$/.test(handle)) {
    return 'Handle can only contain lowercase letters, numbers, underscores, and hyphens.'
  }
  return null
}

/**
 * Sanitize tag input - allow natural typing without aggressive processing
 */
export function sanitizeTags(tagsString) {
  // Just return the input as-is to allow natural typing with commas
  // The actual validation happens in validateTags()
  return tagsString
}

/**
 * Get tag preview for display - handles both string and array formats
 */
export function getTagsPreview(tags) {
  if (Array.isArray(tags)) {
    return tags
  }
  
  return (tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}
