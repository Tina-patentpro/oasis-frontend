import { describe, expect, jest, test } from '@jest/globals'

jest.mock('@/config/runtime-env', () => ({
  getViteApiBaseUrl: jest.fn(() => 'https://api.example.com/api'),
}))

import { transformContentUrl } from './content-url-transform'

describe('transformContentUrl', () => {
  test('allows embedded PNG data images for self-contained render tests', () => {
    const src = 'data:image/png;base64,iVBORw0KGgo='

    expect(transformContentUrl(src, 'src', { tagName: 'img' })).toBe(src)
  })

  test('rejects non-image data URLs', () => {
    expect(transformContentUrl('data:text/html;base64,PGh0bWw+')).toBe('')
  })

  test('rejects data images outside image src attributes', () => {
    expect(
      transformContentUrl('data:image/png;base64,iVBORw0KGgo=', 'href', { tagName: 'a' }),
    ).toBe('')
  })

  test('keeps normal https image URLs supported by the markdown renderer', () => {
    expect(transformContentUrl('https://example.com/image.png')).toBe(
      'https://example.com/image.png',
    )
  })

  test('resolves generated file image URLs against the API base URL', () => {
    const src = '/files/tools/result.png?timestamp=1&sign=2'

    expect(transformContentUrl(src, 'src', { tagName: 'img' })).toBe(
      'https://api.example.com/files/tools/result.png?timestamp=1&sign=2',
    )
  })

  test('keeps ordinary relative image URLs on the current site', () => {
    const src = '/images/result.png?timestamp=1&sign=2'

    expect(transformContentUrl(src, 'src', { tagName: 'img' })).toBe(src)
  })

  test('rejects dangerous protocols for image sources', () => {
    expect(transformContentUrl('javascript:alert(1)', 'src', { tagName: 'img' })).toBe('')
    expect(transformContentUrl('vbscript:msgbox(1)', 'src', { tagName: 'img' })).toBe('')
    expect(transformContentUrl('file:///etc/passwd', 'src', { tagName: 'img' })).toBe('')
    expect(transformContentUrl('ftp://example.com/result.png', 'src', { tagName: 'img' })).toBe('')
  })

  test('does not resolve generated file URLs outside image src attributes', () => {
    const href = '/files/tools/result.png?timestamp=1&sign=2'

    expect(transformContentUrl(href, 'href', { tagName: 'a' })).toBe(href)
  })
})
