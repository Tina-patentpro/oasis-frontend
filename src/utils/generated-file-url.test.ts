import { describe, expect, jest, test } from '@jest/globals'

jest.mock('@/config/runtime-env', () => ({
  getViteApiBaseUrl: jest.fn(() => 'https://api.example.com/api'),
}))

import { isGeneratedFilePath, resolveGeneratedFileUrl } from './generated-file-url'

describe('generated-file-url', () => {
  test('recognizes backend generated file paths', () => {
    expect(isGeneratedFilePath('/files/tools/result.png?sign=1')).toBe(true)
    expect(isGeneratedFilePath('files/tools/result.png?sign=1')).toBe(true)
    expect(isGeneratedFilePath('/images/local.png')).toBe(false)
  })

  test('resolves backend generated file paths against the API base URL', () => {
    expect(
      resolveGeneratedFileUrl(
        '/files/tools/result.png?sign=1',
        'https://api.example.com/api',
      ),
    ).toBe('https://api.example.com/files/tools/result.png?sign=1')
  })

  test('resolves generated file paths without a leading slash from the API origin', () => {
    expect(
      resolveGeneratedFileUrl(
        'files/tools/result.png?sign=1',
        'https://api.example.com/api/',
      ),
    ).toBe('https://api.example.com/files/tools/result.png?sign=1')
  })

  test('does not resolve generated file paths against unsafe API base protocols', () => {
    expect(
      resolveGeneratedFileUrl('/files/tools/result.png?sign=1', 'file:///tmp/api'),
    ).not.toMatch(/^file:/i)
    expect(
      resolveGeneratedFileUrl('/files/tools/result.png?sign=1', 'ftp://api.example.com/api'),
    ).not.toMatch(/^ftp:/i)
  })

  test('keeps non-generated and already absolute URLs unchanged', () => {
    expect(resolveGeneratedFileUrl('/api/files/tools/result.png')).toBe(
      '/api/files/tools/result.png',
    )
    expect(resolveGeneratedFileUrl('https://cdn.example.com/files/tools/result.png')).toBe(
      'https://cdn.example.com/files/tools/result.png',
    )
    expect(resolveGeneratedFileUrl('   ')).toBe('   ')
  })
})
