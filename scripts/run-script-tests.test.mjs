import assert from 'node:assert/strict'
import { test } from 'node:test'

import { discoverScriptTestFiles, isScriptTestFile, runScriptTests } from './run-script-tests.mjs'

test('recognizes only Node script test modules', () => {
  assert.equal(isScriptTestFile('check.test.mjs'), true)
  assert.equal(isScriptTestFile('check.test.js'), false)
  assert.equal(isScriptTestFile('check.mjs'), false)
})

test('discovers script tests recursively in stable order', async () => {
  const files = await discoverScriptTestFiles()

  assert.ok(files.length >= 20)
  assert.ok(files.some((file) => file.endsWith('scripts/api/check-user-api-doc.test.mjs')))
  assert.deepEqual(
    files,
    [...files].sort((left, right) => left.localeCompare(right, 'en')),
  )
  assert.ok(files.every((file) => file.endsWith('.test.mjs')))
})

test('spawns Node with explicit test files and preserves the result status', () => {
  const calls = []
  const status = runScriptTests(['a.test.mjs', 'nested/b.test.mjs'], {
    execPath: 'node-bin',
    cwd: 'repo-root',
    spawn(command, args, options) {
      calls.push({ command, args, options })
      return { status: 7 }
    },
  })

  assert.equal(status, 7)
  assert.deepEqual(calls, [
    {
      command: 'node-bin',
      args: ['--test', 'a.test.mjs', 'nested/b.test.mjs'],
      options: {
        cwd: 'repo-root',
        shell: false,
        stdio: 'inherit',
        windowsHide: true,
      },
    },
  ])
})
