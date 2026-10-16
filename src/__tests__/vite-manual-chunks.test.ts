import { describe, expect, test } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('vite manual chunks', () => {
  const source = readFileSync(join(__dirname, '..', '..', 'vite.config.ts'), 'utf8')

  test('keeps the production chunk warning threshold active', () => {
    expect(source).toContain('chunkSizeWarningLimit: 620')
  })

  test('splits diagram dependencies into multiple async vendor chunks', () => {
    expect(source).toContain('diagram-d3-vendor')
    expect(source).toContain('diagram-langium-vendor')
    expect(source).toContain('diagram-chevrotain-vendor')
    expect(source).toContain('diagram-parser-vendor')
    expect(source).toContain('diagram-layout-vendor')
    expect(source).toContain('diagram-graph-layout-vendor')
    expect(source).toContain('diagram-graph-core-vendor')
    expect(source).toContain('diagram-core-vendor')
    expect(source).not.toContain("return 'diagram-mermaid-vendor'")
  })

  test('proxies generated uploads in both development and preview servers', () => {
    expect(source.match(/'\/uploads':\s*\{/g)).toHaveLength(2)
    expect(source).toContain('target: apiProxyTarget')
    expect(source).toContain('changeOrigin: true')
  })
})
