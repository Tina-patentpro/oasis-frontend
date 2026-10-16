import test from 'node:test'
import assert from 'node:assert/strict'

import {
  detectSecrets,
  mergeUniqueFiles,
  resolveScanFiles,
} from './scan-secrets.mjs'

test('detects leaked secret-like tokens', () => {
  const skToken = `sk-${'abcdefghijklmnopqrstuvwxyz123456'}`
  const appToken = `app-${'ABCDEFGHijklmnopQRST1234'}`
  const findings = detectSecrets(
    `api_key=${skToken} and key=${appToken}`,
    'tmp/test.json',
  )

  assert.ok(findings.length >= 2)
})

test('detects production password-login debug credentials', () => {
  const debugScript = [
    "await fetch('https://lzhxpy.oasisintwrite.com/api/auth/pwdlogin', {",
    "  method: 'POST',",
    "  body: JSON.stringify({ phone: '13512342996', password: '789012' }),",
    "})",
  ].join('\n')
  const findings = detectSecrets(debugScript, 'scripts/debug_categories.mjs')

  assert.ok(findings.some((item) => item.kind === 'production-password-login'))
  assert.ok(findings.some((item) => item.kind === 'phone-password-combo'))
})

test('allows test-only phone and password fixtures without production login endpoint', () => {
  const testFixture = "const data = { phone: '13800001111', password: 'mypassword' }"
  const findings = detectSecrets(testFixture, 'src/api/services/__tests__/auth.service.test.ts')

  assert.deepEqual(findings, [])
})

test('full scan includes both tracked and untracked files', () => {
  const files = resolveScanFiles(new Set(['--all']), {
    staged: () => ['staged-only.ts'],
    tracked: () => ['src/tracked.ts', 'src/shared.ts'],
    untracked: () => ['src/untracked.ts', 'src/shared.ts'],
  })

  assert.deepEqual(files, ['src/tracked.ts', 'src/shared.ts', 'src/untracked.ts'])
})

test('all-tracked scan keeps legacy tracked-only behavior', () => {
  const files = resolveScanFiles(new Set(['--all-tracked']), {
    staged: () => ['staged-only.ts'],
    tracked: () => ['src/tracked.ts'],
    untracked: () => ['src/untracked.ts'],
  })

  assert.deepEqual(files, ['src/tracked.ts'])
})

test('staged scan remains the default mode', () => {
  const files = resolveScanFiles(new Set(), {
    staged: () => ['staged-only.ts'],
    tracked: () => ['src/tracked.ts'],
    untracked: () => ['src/untracked.ts'],
  })

  assert.deepEqual(files, ['staged-only.ts'])
})

test('mergeUniqueFiles removes duplicate and empty file names', () => {
  assert.deepEqual(
    mergeUniqueFiles(['src/a.ts', ''], ['src/a.ts', 'src/b.ts']),
    ['src/a.ts', 'src/b.ts'],
  )
})
