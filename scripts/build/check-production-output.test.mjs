import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { checkProductionOutput, extractMetaCsp } from './check-production-output.mjs'

const STRICT_META_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'"

async function withDist(run) {
  const dist = await mkdtemp(path.join(tmpdir(), 'oasis-production-output-'))
  await mkdir(path.join(dist, 'assets'))
  await writeFile(
    path.join(dist, 'index.html'),
    `<meta http-equiv="Content-Security-Policy" content="${STRICT_META_CSP}" />`,
  )
  await writeFile(path.join(dist, 'assets', 'index-Ab12_cd3.js'), 'export {}')

  try {
    await run(dist)
  } finally {
    await rm(dist, { recursive: true, force: true })
  }
}

test('extracts the generated CSP meta content', () => {
  assert.equal(
    extractMetaCsp(
      `<meta http-equiv="Content-Security-Policy" content="${STRICT_META_CSP}" />`,
    ),
    STRICT_META_CSP,
  )
})

test('accepts strict production CSP and hashed assets', async () => {
  await withDist(async (dist) => {
    const result = await checkProductionOutput(dist)
    assert.equal(result.assetCount, 1)
    assert.equal(result.csp, STRICT_META_CSP)
  })
})

test('rejects local origins in the production CSP', async () => {
  await withDist(async (dist) => {
    await writeFile(
      path.join(dist, 'index.html'),
      `<meta http-equiv="Content-Security-Policy" content="${STRICT_META_CSP}; connect-src http://localhost:*" />`,
    )
    await assert.rejects(() => checkProductionOutput(dist), /local development origin/)
  })
})

test('rejects source maps and unhashed production assets', async () => {
  await withDist(async (dist) => {
    await writeFile(path.join(dist, 'assets', 'index.js.map'), '{}')
    await writeFile(path.join(dist, 'assets', 'font.woff2'), 'font')
    await assert.rejects(() => checkProductionOutput(dist), /source maps/)

    await rm(path.join(dist, 'assets', 'index.js.map'))
    await assert.rejects(() => checkProductionOutput(dist), /without content hashes/)
  })
})
