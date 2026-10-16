import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  buildLocationSnippet,
  buildSecurityHeaderSnippet,
  writeNginxCandidate,
} from './nginx-candidate.mjs'

const STRICT_CSP =
  "default-src 'self'; script-src 'self'; form-action 'self'; object-src 'none'"

test('generates report-only and enforced security phases with staged HSTS', () => {
  const reportOnly = buildSecurityHeaderSnippet(STRICT_CSP, 'report-only')
  const enforced = buildSecurityHeaderSnippet(STRICT_CSP, 'enforced')

  assert.match(reportOnly, /Content-Security-Policy-Report-Only/)
  assert.match(reportOnly, /frame-ancestors 'none'/)
  assert.match(reportOnly, /max-age=300/)
  assert.match(enforced, /add_header Content-Security-Policy /)
  assert.doesNotMatch(enforced, /Content-Security-Policy-Report-Only/)
  assert.match(enforced, /max-age=31536000/)
  assert.match(enforced, /X-Frame-Options "DENY"/)
})

test('rejects local development origins in the server policy', () => {
  assert.throws(
    () =>
      buildSecurityHeaderSnippet(
        `${STRICT_CSP}; connect-src http://localhost:3000`,
        'enforced',
      ),
    /local origins/,
  )
})

test('repeats the security include in every cache-bearing location', () => {
  const snippet = buildLocationSnippet({
    securityIncludePath: '/new/oasis/security.conf',
  })
  const blocks = snippet.match(/location[\s\S]*?\n}/g) ?? []

  assert.equal(blocks.length, 7)
  for (const block of blocks) {
    if (block.includes('add_header Cache-Control')) {
      assert.match(block, /include \/new\/oasis\/security\.conf;/)
    }
  }
  assert.match(snippet, /location \/\assets\//)
  assert.match(snippet, /try_files \$uri =404;/)
  assert.match(snippet, /max-age=31536000, immutable/)
  assert.match(snippet, /location \^~ \/api\//)
})

test('writes a complete candidate once and refuses to overwrite it', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'oasis-nginx-candidate-'))
  const dist = path.join(root, 'dist')
  const output = path.join(root, 'candidate')
  await mkdir(dist)
  await writeFile(
    path.join(dist, 'index.html'),
    `<meta http-equiv="Content-Security-Policy" content="${STRICT_CSP}" />`,
  )

  try {
    const files = await writeNginxCandidate({
      distDirectory: dist,
      outputDirectory: output,
    })
    assert.deepEqual(files.sort(), [
      'README.md',
      'oasis-frontend-locations.conf',
      'oasis-frontend-security-headers-enforced.conf',
      'oasis-frontend-security-headers-report-only.conf',
    ])
    assert.match(
      await readFile(path.join(output, 'README.md'), 'utf8'),
      /must not overwrite an existing remote file/,
    )
    await assert.rejects(
      () =>
        writeNginxCandidate({
          distDirectory: dist,
          outputDirectory: output,
        }),
      { code: 'EEXIST' },
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
