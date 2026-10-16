import { describe, expect, test } from '@jest/globals'

import { contentSanitizeSchema } from './sanitize-schema'

describe('ContentRenderer sanitize schema', () => {
  test('keeps base64 data image sources for self-contained Dify test output', () => {
    expect(contentSanitizeSchema.protocols?.src).toEqual(
      expect.arrayContaining(['http', 'https', 'data']),
    )
  })

  test('does not allow inline style attributes in rendered markdown', () => {
    const attributes = contentSanitizeSchema.attributes as Record<string, string[] | undefined>
    expect(contentSanitizeSchema.attributes['*']).not.toContain('style')
    expect(attributes.span ?? []).not.toContain('style')
  })
})
