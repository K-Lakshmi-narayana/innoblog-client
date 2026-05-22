import { describe, expect, it, vi } from 'vitest'

import {
  estimateReadTime,
  formatLongDate,
  formatShortDate,
  getDisplayName,
  getHeadline,
  getInitials,
  slugify,
  stripHtml,
  withProtocol,
} from '../utils/articleUtils'

describe('article utilities', () => {
  it('slugifies values and falls back when the slug is empty', () => {
    expect(slugify(' Practical ML Launch Guide ')).toBe('practical-ml-launch-guide')

    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    expect(slugify('!!!')).toBe('story-1700000000000')
    Date.now.mockRestore()
  })

  it('strips html and estimates reading time', () => {
    expect(stripHtml('<h2>Hello</h2><p>world</p>')).toBe('Hello world')
    expect(estimateReadTime(`<p>${'word '.repeat(600)}</p>`)).toBe('4 min read')
    expect(estimateReadTime('<p>tiny post</p>')).toBe('3 min read')
  })

  it('formats valid and invalid dates safely', () => {
    expect(formatShortDate('2024-05-01T00:00:00.000Z')).toBe('May 1, 2024')
    expect(formatLongDate('2024-05-01T00:00:00.000Z')).toBe('May 1, 2024')
    expect(formatShortDate('not-a-date', 'Fallback')).toBe('Fallback')
    expect(formatLongDate('', 'Missing')).toBe('Missing')
  })

  it('derives initials, display names, and headlines', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL')
    expect(getInitials(' single ')).toBe('S')
    expect(getDisplayName({ profile: { displayName: 'Profile Name' } })).toBe('Profile Name')
    expect(getDisplayName({ displayName: 'Fallback Name' })).toBe('Fallback Name')
    expect(getDisplayName(null)).toBe('InnoBlog Member')
    expect(getHeadline({ profile: { headline: 'Researcher' } })).toBe('Researcher')
    expect(getHeadline({ headline: 'Writer' })).toBe('Writer')
    expect(getHeadline({ role: 'reader' })).toBe('reader')
    expect(getHeadline(null)).toBe('Reader')
  })

  it('normalizes external links with protocols', () => {
    expect(withProtocol('example.com')).toBe('https://example.com')
    expect(withProtocol('http://example.com')).toBe('http://example.com')
    expect(withProtocol('https://example.com')).toBe('https://example.com')
    expect(withProtocol('')).toBe('')
  })
})
