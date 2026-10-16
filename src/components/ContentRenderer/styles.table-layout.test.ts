import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from '@jest/globals'

const stylesPath = path.resolve(__dirname, 'styles.css')

describe('ContentRenderer table layout styles', () => {
  test('uses intrinsic table width strategy to avoid first-column overexpansion', () => {
    const css = readFileSync(stylesPath, 'utf8')

    expect(css).toContain('width: max-content;')
    expect(css).toContain('min-width: 100%;')
    expect(css).toContain('table-layout: auto;')
  })

  test('styles rendered markdown images with the active image class', () => {
    const css = readFileSync(stylesPath, 'utf8')

    expect(css).toContain('.content-image')
    expect(css).toContain('max-width: 100%;')
    expect(css).toContain('cursor: zoom-in;')
  })

  test('restores visible list markers for rendered markdown lists', () => {
    const css = readFileSync(stylesPath, 'utf8')

    expect(css).toMatch(/\.markdown-body ul\s*\{[^}]*list-style-type:\s*disc;/s)
    expect(css).toMatch(/\.markdown-body ol\s*\{[^}]*list-style-type:\s*decimal;/s)
  })

  test('hides regular bullets for GFM task list items', () => {
    const css = readFileSync(stylesPath, 'utf8')

    expect(css).toMatch(/\.markdown-body \.task-list-item\s*\{[^}]*list-style-type:\s*none;/s)
  })
})
