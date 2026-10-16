import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from '@jest/globals'

describe('index.html favicon link', () => {
  test('points the browser tab icon to the unified workspace logo asset', () => {
    const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')

    expect(html).toContain('rel="icon"')
    expect(html).toContain('type="image/webp"')
    expect(html).toContain('href="/workspace-logo.webp"')
  })

  test('uses the workspace title as the protected-route reload fallback', () => {
    const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')

    expect(html).toContain('<title>绿洲慧写智能工作台 | AI 专利撰写项目管理系统</title>')
  })
})
