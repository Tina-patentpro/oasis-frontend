import { describe, expect, test } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('client-helpers imports', () => {
  test('does not dynamically import modules that are already part of the API client graph', () => {
    const source = readFileSync(join(__dirname, 'client-helpers.ts'), 'utf8')

    expect(source).not.toContain("import('./response-guards')")
    expect(source).not.toContain("import('./token-storage')")
    expect(source).not.toContain("import('./auth-refresh')")
  })
})
