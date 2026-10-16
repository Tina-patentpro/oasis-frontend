import assert from 'node:assert/strict'
import { delimiter, dirname, resolve } from 'node:path'
import test from 'node:test'

import { parseRunE2EArgs, runE2E } from './run-e2e.mjs'

function createHarness(statuses = []) {
  const events = []
  const spawnedEnvironments = []
  const remainingStatuses = [...statuses]
  return {
    events,
    spawnedEnvironments,
    options: {
      argv: [],
      cwd: 'D:/repo',
      env: { npm_execpath: 'D:/node/npm-cli.js' },
      execPath: 'D:/node/node.exe',
      npmCliPath: 'D:/node/npm-cli.js',
      playwrightCliPath: 'D:/repo/node_modules/playwright/cli.js',
      spawnSyncImpl(command, args, options) {
        spawnedEnvironments.push(options.env)
        events.push({ kind: 'spawn', command, args, cwd: options.cwd })
        return { status: remainingStatuses.length > 0 ? remainingStatuses.shift() : 0 }
      },
      async prepareEvidenceRootImpl() {
        events.push({ kind: 'prepare' })
      },
      async createArtifactManifestImpl() {
        events.push({ kind: 'manifest' })
      },
    },
  }
}

test('prefers npm_execpath and launches it with the current Node executable', async () => {
  const harness = createHarness()
  delete harness.options.npmCliPath
  harness.options.env = {
    npm_execpath: 'D:/preferred/npm-cli.js',
    PATH: 'D:/existing-path',
  }

  assert.equal(await runE2E(harness.options), 0)
  assert.deepEqual(harness.events[0], {
    kind: 'spawn',
    command: 'D:/node/node.exe',
    args: ['D:/preferred/npm-cli.js', 'run', 'changelog:check'],
    cwd: 'D:/repo',
  })
})

test('falls back to the npm CLI adjacent to the current Node executable', async () => {
  const harness = createHarness()
  const execPath = resolve('fixture-runtime', 'node.exe')
  delete harness.options.npmCliPath
  harness.options.execPath = execPath
  harness.options.env = { PATH: 'D:/existing-path' }

  assert.equal(await runE2E(harness.options), 0)
  assert.deepEqual(harness.events[0], {
    kind: 'spawn',
    command: execPath,
    args: [
      resolve(dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      'run',
      'changelog:check',
    ],
    cwd: 'D:/repo',
  })
})

test('prepends the repository binary directory while preserving the actual PATH key', async () => {
  const harness = createHarness()
  harness.options.env = {
    npm_execpath: 'D:/node/npm-cli.js',
    Path: 'D:/existing-path',
    OASIS_E2E_OUTPUT_DIR: 'output/evidence',
  }

  assert.equal(await runE2E(harness.options), 0)
  assert.equal(harness.spawnedEnvironments.length, 3)
  for (const childEnv of harness.spawnedEnvironments) {
    assert.equal(
      childEnv.Path,
      `${resolve('D:/repo', 'node_modules', '.bin')}${delimiter}D:/existing-path`,
    )
    assert.equal(childEnv.OASIS_E2E_OUTPUT_DIR, 'output/evidence')
    assert.equal(Object.hasOwn(childEnv, 'PATH'), false)
  }
})

test('parses the internal prebuilt flag without changing remaining Playwright arguments', () => {
  assert.deepEqual(
    parseRunE2EArgs(['--project=chromium', '--prebuilt', '--grep', '会话|320px']),
    {
      prebuilt: true,
      playwrightArgs: ['--project=chromium', '--grep', '会话|320px'],
    },
  )
})

test('default mode runs one changelog check, one build, Playwright, then the manifest', async () => {
  const harness = createHarness()
  harness.options.argv = ['--project=chromium', '--grep', '会话|320px']

  assert.equal(await runE2E(harness.options), 0)
  assert.deepEqual(harness.events, [
    {
      kind: 'spawn',
      command: 'D:/node/node.exe',
      args: ['D:/node/npm-cli.js', 'run', 'changelog:check'],
      cwd: 'D:/repo',
    },
    {
      kind: 'spawn',
      command: 'D:/node/node.exe',
      args: ['D:/node/npm-cli.js', 'run', 'build:verify'],
      cwd: 'D:/repo',
    },
    { kind: 'prepare' },
    {
      kind: 'spawn',
      command: 'D:/node/node.exe',
      args: [
        'D:/repo/node_modules/playwright/cli.js',
        'test',
        '--project=chromium',
        '--grep',
        '会话|320px',
      ],
      cwd: 'D:/repo',
    },
    { kind: 'manifest' },
  ])
})

test('prebuilt mode skips changelog and build while forwarding all remaining arguments', async () => {
  const harness = createHarness()
  harness.options.argv = ['--prebuilt', '--project', 'chromium', '--grep=详情失败']

  assert.equal(await runE2E(harness.options), 0)
  assert.deepEqual(harness.events, [
    { kind: 'prepare' },
    {
      kind: 'spawn',
      command: 'D:/node/node.exe',
      args: [
        'D:/repo/node_modules/playwright/cli.js',
        'test',
        '--project',
        'chromium',
        '--grep=详情失败',
      ],
      cwd: 'D:/repo',
    },
    { kind: 'manifest' },
  ])
})

test('preserves an npm child exit code and short-circuits all later work', async () => {
  const harness = createHarness([0, 7])

  assert.equal(await runE2E(harness.options), 7)
  assert.deepEqual(
    harness.events.map((event) => event.kind),
    ['spawn', 'spawn'],
  )
})

test('does not write a success manifest when Playwright fails', async () => {
  const harness = createHarness([9])
  harness.options.argv = ['--prebuilt']

  assert.equal(await runE2E(harness.options), 9)
  assert.deepEqual(
    harness.events.map((event) => event.kind),
    ['prepare', 'spawn'],
  )
})

test('maps an unavailable child status to exit code 1', async () => {
  const harness = createHarness([null])
  harness.options.argv = ['--prebuilt']

  assert.equal(await runE2E(harness.options), 1)
})
