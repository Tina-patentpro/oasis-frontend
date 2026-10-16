import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from '@jest/globals'

describe('session export production data boundary', () => {
  test('does not fabricate a local placeholder when session export fails', () => {
    const source = readFileSync(join(process.cwd(), 'src/hooks/useSessionManagement.ts'), 'utf8')

    expect(source).not.toContain('Mock Fallback')
    expect(source).not.toContain('导出占位数据')
    expect(source).not.toContain('本地占位文件')
  })
})
