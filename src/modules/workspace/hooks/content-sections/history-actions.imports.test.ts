import { describe, expect, test } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('history-actions imports', () => {
  test('does not dynamically import session.service from the history read path', () => {
    const source = readFileSync(join(__dirname, 'history-actions.ts'), 'utf8')

    expect(source).not.toContain("import('@/api/services/session.service')")
  })
})
