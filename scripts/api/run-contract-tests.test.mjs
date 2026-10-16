import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  discoverContractTestFiles,
  runContractTests,
} from './run-contract-tests.mjs'

test('discovers contract tests recursively in a stable order', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'oasis-api-contracts-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  const nested = path.join(root, 'nested')
  await mkdir(nested)
  await Promise.all([
    writeFile(path.join(root, 'zeta.test.js'), ''),
    writeFile(path.join(root, 'helper.js'), ''),
    writeFile(path.join(nested, 'alpha.test.js'), ''),
  ])

  const files = await discoverContractTestFiles(root)

  assert.deepEqual(files, [
    path.join(nested, 'alpha.test.js'),
    path.join(root, 'zeta.test.js'),
  ])
})

test('rejects an empty explicit contract test list', () => {
  assert.throws(
    () => runContractTests([]),
    /No API contract tests were found/,
  )
})

test('spawns Node with explicit test files and propagates its status', () => {
  const calls = []
  const files = ['first.test.js', 'nested/second.test.js']
  const status = runContractTests(files, {
    cwd: 'repository-root',
    execPath: 'node-runtime',
    spawn(command, args, options) {
      calls.push({ command, args, options })
      return { status: 7 }
    },
  })

  assert.equal(status, 7)
  assert.deepEqual(calls, [
    {
      command: 'node-runtime',
      args: ['--test', ...files],
      options: {
        cwd: 'repository-root',
        shell: false,
        stdio: 'inherit',
        windowsHide: true,
      },
    },
  ])
})

test('propagates a process spawn error', () => {
  const expected = new Error('spawn failed')

  assert.throws(
    () =>
      runContractTests(['contract.test.js'], {
        spawn() {
          return { error: expected, status: null }
        },
      }),
    expected,
  )
})
