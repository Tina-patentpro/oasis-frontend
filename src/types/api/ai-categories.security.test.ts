import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from '@jest/globals'

describe('ApiDetail credential boundary', () => {
  test('does not expose third-party credential fields to frontend consumers', () => {
    const source = readFileSync(join(process.cwd(), 'src/types/api/ai-categories.ts'), 'utf8')
    const apiDetailBody = source.match(/export interface ApiDetail\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

    expect(apiDetailBody).not.toMatch(/\bapi_key\s*:/)
    expect(apiDetailBody).not.toMatch(/\bcredentials\s*:/)
  })
})
