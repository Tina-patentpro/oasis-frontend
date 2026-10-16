import { mkdtempSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { stripKatexLegacyFontFormats } from './strip-katex-fonts.mjs'

test('stripKatexLegacyFontFormats removes ttf and woff while keeping woff2', () => {
  const root = mkdtempSync(join(tmpdir(), 'katex-font-strip-'))
  const assetsDir = join(root, 'assets')
  mkdirSync(assetsDir)

  const ttfFile = join(assetsDir, 'KaTeX_Main-Regular-test.ttf')
  const woffFile = join(assetsDir, 'KaTeX_Main-Regular-test.woff')
  const woff2File = join(assetsDir, 'KaTeX_Main-Regular-test.woff2')
  const otherFile = join(assetsDir, 'app.js')

  writeFileSync(ttfFile, 'ttf')
  writeFileSync(woffFile, 'woff')
  writeFileSync(woff2File, 'woff2')
  writeFileSync(otherFile, 'js')

  try {
    const result = stripKatexLegacyFontFormats({ assetsDir })

    assert.equal(existsSync(ttfFile), false)
    assert.equal(existsSync(woffFile), false)
    assert.equal(existsSync(woff2File), true)
    assert.equal(existsSync(otherFile), true)
    assert.deepEqual(
      result.removed.map((filename) => filename.split('\\').join('/')).sort(),
      ['KaTeX_Main-Regular-test.ttf', 'KaTeX_Main-Regular-test.woff'],
    )
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})
