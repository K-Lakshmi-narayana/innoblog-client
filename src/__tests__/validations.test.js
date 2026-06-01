import {
  ARTICLE_IMAGE_LIMITS,
  getTagsPreview,
  sanitizeTags,
  validateBio,
  validateArticleImages,
  validateBody,
  validateComment,
  validateHandle,
  validateImageFile,
  validateName,
  validateSummary,
  validateTags,
  validateTitle,
} from '../utils/validations'

function buildDataImage(byteSize, mimeType = 'image/png') {
  return `data:${mimeType};base64,${'A'.repeat(Math.ceil(byteSize / 3) * 4)}`
}

describe('frontend validation utilities', () => {
  it('validates article title and summary length boundaries', () => {
    expect(validateTitle('Valid title')).toBeNull()
    expect(validateTitle('bad')).toContain('at least 5 characters')

    expect(validateSummary('This summary is valid.')).toBeNull()
    expect(validateSummary('short')).toContain('at least 10 characters')
  })

  it('validates article body based on plain text length', () => {
    expect(validateBody(`<p>${'Readable article content '.repeat(8)}</p>`)).toBeNull()
    expect(validateBody('<p>short</p>')).toContain('at least 120 characters')
    expect(validateBody(`<p>${'A'.repeat(60001)}</p>`)).toContain(
      'must not exceed 60,000 characters',
    )
  })

  it('rejects article fields with excessive unbroken text runs', () => {
    const longToken = 'a'.repeat(81)

    expect(validateTitle(`Valid ${longToken}`)).toContain('unbroken text run')
    expect(validateSummary(`Readable summary ${longToken}`)).toContain('unbroken text run')
    expect(validateBody(`<p>${'Readable words '.repeat(10)} ${longToken}</p>`)).toContain(
      'unbroken text run',
    )
  })

  it('validates article image uploads by type, size, and embedded data URLs', () => {
    expect(validateImageFile(new File(['ok'], 'cover.png', { type: 'image/png' }))).toBeNull()

    const oversizedFile = new File(
      [new Uint8Array(ARTICLE_IMAGE_LIMITS.maxBytes + 1)],
      'large.png',
      { type: 'image/png' },
    )
    expect(validateImageFile(oversizedFile, 'Cover image')).toContain('10 MB or smaller')

    expect(
      validateImageFile(new File(['svg'], 'diagram.svg', { type: 'image/svg+xml' })),
    ).toContain('JPEG, PNG, or WebP')

    expect(
      validateArticleImages({
        body: `<p>${'A'.repeat(150)}</p><img src="${buildDataImage(100, 'image/svg+xml')}" />`,
      }),
    ).toContain('JPEG, PNG, or WebP')
  })

  it('validates tag counts and tag lengths', () => {
    expect(
      validateTags(
        ['Computer Vision', 'Object Detection', 'Model Deployment'],
        'cv',
      ),
    ).toBeNull()
    expect(validateTags('cv, ai')).toContain('at least 3 tags')
    expect(
      validateTags(
        [
          'Computer Vision',
          'Object Detection',
          'Model Deployment',
          'OCR',
          'Video Analytics',
          'Image Classification',
          'Edge Vision',
          'Data Augmentation',
          'Pose Estimation',
        ],
        'cv',
      ),
    ).toContain('maximum of 8 tags')
    expect(validateTags(['A'.repeat(51), 'Object Detection', 'Model Deployment'])).toContain(
      'must not exceed 50 characters',
    )
    expect(validateTags(['Unknown', 'Object Detection', 'Model Deployment'], 'cv')).toContain(
      'selected topic list',
    )
  })

  it('keeps tag sanitizing non-destructive and previews trimmed tags', () => {
    expect(sanitizeTags(' JavaScript, React ')).toBe(' JavaScript, React ')
    expect(getTagsPreview(' javascript, react , testing ')).toEqual([
      'javascript',
      'react',
      'testing',
    ])
  })

  it('validates comments and profile fields', () => {
    expect(validateComment('Helpful note')).toBeNull()
    expect(validateComment('')).toContain('cannot be empty')

    expect(validateName('Lakshmi')).toBeNull()
    expect(validateName('L')).toContain('at least 2 characters')

    expect(validateBio('A short bio')).toBeNull()
    expect(validateBio('A'.repeat(501))).toContain('must not exceed 500 characters')

    expect(validateHandle('valid_handle')).toBeNull()
    expect(validateHandle('Bad Handle!')).toContain('lowercase letters, numbers, underscores, and hyphens')
  })
})
