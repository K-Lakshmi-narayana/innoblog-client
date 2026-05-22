import {
  getTagsPreview,
  sanitizeTags,
  validateBio,
  validateBody,
  validateComment,
  validateHandle,
  validateName,
  validateSummary,
  validateTags,
  validateTitle,
} from '../utils/validations'

describe('frontend validation utilities', () => {
  it('validates article title and summary length boundaries', () => {
    expect(validateTitle('Valid title')).toBeNull()
    expect(validateTitle('bad')).toContain('at least 5 characters')

    expect(validateSummary('This summary is valid.')).toBeNull()
    expect(validateSummary('short')).toContain('at least 10 characters')
  })

  it('validates article body based on plain text length', () => {
    expect(validateBody(`<p>${'A'.repeat(150)}</p>`)).toBeNull()
    expect(validateBody('<p>short</p>')).toContain('at least 120 characters')
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
      'selected domain list',
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
