import { describe, expect, test } from '@jest/globals'

import { hasUsableFileUrl, normalizeFileUrlList, pickPrimaryFileUrl } from './file-url'

describe('file-url utilities', () => {
  test('normalizes string and string[] inputs to a clean url list', () => {
    expect(normalizeFileUrlList(' https://example.com/a.docx ')).toEqual([
      'https://example.com/a.docx',
    ])
    expect(
      normalizeFileUrlList(['https://example.com/a.docx', '', '   ', 'https://example.com/b.pdf']),
    ).toEqual(['https://example.com/a.docx', 'https://example.com/b.pdf'])
  })

  test('splits comma-separated file_url strings from backend into multiple urls', () => {
    expect(
      normalizeFileUrlList(
        'https://example.com/a.docx, https://example.com/b.docx,https://example.com/c.docx',
      ),
    ).toEqual([
      'https://example.com/a.docx',
      'https://example.com/b.docx',
      'https://example.com/c.docx',
    ])
  })

  test('returns false for empty inputs and true when any valid url exists', () => {
    expect(hasUsableFileUrl(undefined)).toBe(false)
    expect(hasUsableFileUrl('')).toBe(false)
    expect(hasUsableFileUrl([])).toBe(false)
    expect(hasUsableFileUrl(['', 'https://example.com/a.docx'])).toBe(true)
  })

  test('picks the first valid url from mixed formats', () => {
    expect(pickPrimaryFileUrl('https://example.com/a.docx')).toBe('https://example.com/a.docx')
    expect(pickPrimaryFileUrl(['', 'https://example.com/b.docx'])).toBe(
      'https://example.com/b.docx',
    )
    expect(pickPrimaryFileUrl([])).toBeUndefined()
  })
})
