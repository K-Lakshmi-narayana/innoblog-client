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
  body: { min: 120, max: 60000 },
  bodyHtml: { max: 150000 },
  unbrokenText: { max: 80 },
  
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

export const ARTICLE_IMAGE_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  totalMaxBytes: 80 * 1024 * 1024,
  maxUploadedImages: 8,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
}

export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    const value = bytes / (1024 * 1024)
    return `${Number.isInteger(value) ? value : value.toFixed(1)} MB`
  }

  return `${Math.ceil(bytes / 1024)} KB`
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-US')
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ')
}

function getLongUnbrokenTextRun(value = '') {
  return stripHtml(value)
    .split(/\s+/)
    .find((part) => part.length > FIELD_LIMITS.unbrokenText.max)
}

function validateUnbrokenTextRun(value, label) {
  const longRun = getLongUnbrokenTextRun(value)

  if (!longRun) {
    return null
  }

  return `${label} contains a word or unbroken text run over ${FIELD_LIMITS.unbrokenText.max} characters. Add spaces or punctuation so it can wrap cleanly.`
}

function getDataUrlImageInfo(dataUrl = '') {
  const match = String(dataUrl).match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/i)

  if (!match) {
    return null
  }

  const mimeType = String(match[1] || '').toLowerCase()
  const isBase64 = Boolean(match[2])
  const payload = match[3] || ''
  let byteSize = 0

  if (isBase64) {
    const cleanedPayload = payload.replace(/\s/g, '')
    const paddingLength = cleanedPayload.endsWith('==')
      ? 2
      : cleanedPayload.endsWith('=')
      ? 1
      : 0

    byteSize = Math.max(0, Math.floor((cleanedPayload.length * 3) / 4) - paddingLength)
  } else {
    try {
      byteSize = new TextEncoder().encode(decodeURIComponent(payload)).length
    } catch {
      byteSize = new TextEncoder().encode(payload).length
    }
  }

  return {
    byteSize,
    mimeType,
  }
}

function getUploadedBodyImages(body = '') {
  const images = []
  const sourceHtml = String(body || '')
  const imageRegex = /<img\b[^>]*\bsrc=(["'])([^"']+)\1[^>]*>/gi
  let match = imageRegex.exec(sourceHtml)

  while (match) {
    images.push(match[2])
    match = imageRegex.exec(sourceHtml)
  }

  return images
}

function getHtmlLengthWithoutUploadedImages(body = '') {
  return String(body || '').replace(/<img[^>]+src=["']data:[^"']*["'][^>]*>/gi, '').length
}

export function validateImageFile(file, label = 'Image') {
  if (!file) {
    return null
  }

  if (!ARTICLE_IMAGE_LIMITS.allowedTypes.includes(file.type)) {
    return `${label} must be a JPEG, PNG, or WebP file.`
  }

  if (file.size > ARTICLE_IMAGE_LIMITS.maxBytes) {
    return `${label} must be ${formatFileSize(ARTICLE_IMAGE_LIMITS.maxBytes)} or smaller. Choose a smaller image.`
  }

  return null
}

function validateDataUrlImage(dataUrl, label) {
  const imageInfo = getDataUrlImageInfo(dataUrl)

  if (!imageInfo) {
    return {
      byteSize: 0,
      error: `${label} could not be read. Upload it again as a JPEG, PNG, or WebP image.`,
    }
  }

  if (!ARTICLE_IMAGE_LIMITS.allowedTypes.includes(imageInfo.mimeType)) {
    return {
      byteSize: imageInfo.byteSize,
      error: 'Article images must be JPEG, PNG, or WebP files.',
    }
  }

  if (imageInfo.byteSize > ARTICLE_IMAGE_LIMITS.maxBytes) {
    return {
      byteSize: imageInfo.byteSize,
      error: `${label} must be ${formatFileSize(ARTICLE_IMAGE_LIMITS.maxBytes)} or smaller. Choose a smaller image.`,
    }
  }

  return {
    byteSize: imageInfo.byteSize,
    error: null,
  }
}

export function getUploadedImageCount({ body = '', coverImage = '' } = {}) {
  return [
    ...(String(coverImage || '').trim() ? [coverImage] : []),
    ...getUploadedBodyImages(body),
  ].length
}

export function validateArticleImages({ body = '', coverImage = '' } = {}) {
  const imageEntries = []
  const trimmedCoverImage = String(coverImage || '').trim()

  if (trimmedCoverImage) {
    imageEntries.push({
      label: 'Cover image',
      src: trimmedCoverImage,
    })
  }

  getUploadedBodyImages(body).forEach((src, index) => {
    imageEntries.push({
      label: `Article image ${index + 1}`,
      src,
    })
  })

  if (imageEntries.length > ARTICLE_IMAGE_LIMITS.maxUploadedImages) {
    return `Use up to ${ARTICLE_IMAGE_LIMITS.maxUploadedImages} uploaded images per article, including the cover image.`
  }

  let totalImageBytes = 0

  for (const imageEntry of imageEntries) {
    if (!String(imageEntry.src || '').startsWith('data:')) {
      continue
    }

    const validation = validateDataUrlImage(imageEntry.src, imageEntry.label)
    totalImageBytes += validation.byteSize

    if (validation.error) {
      return validation.error
    }
  }

  if (totalImageBytes > ARTICLE_IMAGE_LIMITS.totalMaxBytes) {
    return `Uploaded article images must total ${formatFileSize(ARTICLE_IMAGE_LIMITS.totalMaxBytes)} or less.`
  }

  return null
}

export function validateArticlePayloadSize(body = '') {
  const htmlLength = getHtmlLengthWithoutUploadedImages(body)

  if (htmlLength > FIELD_LIMITS.bodyHtml.max) {
    return `Article formatting is too large. Keep the article HTML under ${formatNumber(FIELD_LIMITS.bodyHtml.max)} characters, not counting uploaded images.`
  }

  return null
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
  const unbrokenTextError = validateUnbrokenTextRun(title, 'Title')
  if (unbrokenTextError) {
    return unbrokenTextError
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
  const unbrokenTextError = validateUnbrokenTextRun(summary, 'Summary')
  if (unbrokenTextError) {
    return unbrokenTextError
  }
  return null
}

export function validateCoverLabel(coverLabel) {
  if (coverLabel && coverLabel.length > FIELD_LIMITS.coverLabel.max) {
    return `Cover label must not exceed ${FIELD_LIMITS.coverLabel.max} characters.`
  }
  const unbrokenTextError = validateUnbrokenTextRun(coverLabel, 'Cover label')
  if (unbrokenTextError) {
    return unbrokenTextError
  }
  return null
}

export function validateBody(body) {
  const plainText = stripHtml(body).trim()
  
  if (!plainText || plainText.length < FIELD_LIMITS.body.min) {
    return `Article body must have at least ${FIELD_LIMITS.body.min} characters.`
  }
  if (plainText.length > FIELD_LIMITS.body.max) {
    return `Article body must not exceed ${formatNumber(FIELD_LIMITS.body.max)} characters.`
  }
  const payloadError = validateArticlePayloadSize(body)
  if (payloadError) {
    return payloadError
  }
  const unbrokenTextError = validateUnbrokenTextRun(plainText, 'Article body')
  if (unbrokenTextError) {
    return unbrokenTextError
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
    return `Choose tags from the selected topic list. Remove: ${unknownTags.join(', ')}.`
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
