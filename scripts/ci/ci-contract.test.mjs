import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import jestConfig from '../../jest.config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml')
const packageJsonPath = path.join(repoRoot, 'package.json')

async function readContracts() {
  const [workflow, packageJsonSource] = await Promise.all([
    readFile(workflowPath, 'utf8'),
    readFile(packageJsonPath, 'utf8'),
  ])

  return { workflow, packageJson: JSON.parse(packageJsonSource) }
}

function extractEventPaths(workflow, eventName) {
  const lines = workflow.replaceAll('\r\n', '\n').split('\n')
  const eventStart = lines.findIndex((line) => line === `  ${eventName}:`)
  assert.notEqual(eventStart, -1, `missing ${eventName} trigger`)

  const nextEventOffset = lines
    .slice(eventStart + 1)
    .findIndex((line) => /^  [a-zA-Z][\w-]*:$/.test(line))
  const eventEnd = nextEventOffset === -1 ? lines.length : eventStart + 1 + nextEventOffset
  const eventLines = lines.slice(eventStart + 1, eventEnd)
  const pathsStart = eventLines.findIndex((line) => line === '    paths:')
  assert.notEqual(pathsStart, -1, `missing ${eventName}.paths`)

  return eventLines
    .slice(pathsStart + 1)
    .filter((line) => /^      - /.test(line))
    .map((line) => line.trim().replace(/^- ["']?|["']$/g, ''))
}

function extractJob(workflow, jobName) {
  const normalized = workflow.replaceAll('\r\n', '\n')
  const marker = `  ${jobName}:\n`
  const start = normalized.indexOf(marker)
  assert.notEqual(start, -1, `missing ${jobName} job`)
  const remainder = normalized.slice(start + marker.length)
  const nextJob = remainder.search(/^  [a-zA-Z][\w-]*:\n/m)
  return nextJob === -1 ? remainder : remainder.slice(0, nextJob)
}

function assertInstallPreflightOrder(job) {
  const runtimeIndex = job.indexOf('run: node scripts/runtime/assert-node-version.mjs')
  const registryIndex = job.indexOf(
    'run: node scripts/dependencies/check-lockfile-registry.mjs',
  )
  const installIndex = job.indexOf('run: npm ci')

  assert.notEqual(runtimeIndex, -1, 'runtime hard gate is missing')
  assert.notEqual(registryIndex, -1, 'registry hard gate is missing')
  assert.notEqual(installIndex, -1, 'npm ci is missing')
  assert.ok(runtimeIndex < registryIndex, 'runtime hard gate must run before registry gate')
  assert.ok(registryIndex < installIndex, 'registry gate must run before npm ci')
}

test('push and pull_request paths cover the active release contracts', async () => {
  const { workflow } = await readContracts()

  for (const eventName of ['pull_request', 'push']) {
    const paths = extractEventPaths(workflow, eventName)
    assert.ok(paths.includes('jest.config.mjs'))
    assert.ok(paths.includes('.nvmrc'))
    assert.ok(paths.includes('docs/CHANGELOG.md'))
    assert.equal(paths.includes('jest.config.ts'), false)
  }
})

test('both jobs run zero-dependency hard gates before npm ci', async () => {
  const { workflow } = await readContracts()

  assertInstallPreflightOrder(extractJob(workflow, 'ci'))
  assertInstallPreflightOrder(extractJob(workflow, 'e2e'))
})

test('API strict drift is an explicit CI step', async () => {
  const { workflow } = await readContracts()
  const ciJob = extractJob(workflow, 'ci')

  assert.match(ciJob, /- name: API strict drift[\s\S]*?run: npm run api:drift:strict/)
})

test('E2E uses the deterministic runner and uploads its exact evidence root', async () => {
  const { workflow } = await readContracts()
  const e2eJob = extractJob(workflow, 'e2e')

  assert.match(
    e2eJob,
    /- name: Run Playwright E2E\n\s+env:\n\s+OASIS_E2E_OUTPUT_DIR: output\/playwright\n\s+run: npm run test:e2e -- --project=chromium/,
  )
  assert.match(e2eJob, /path: output\/playwright\//)
  assert.doesNotMatch(e2eJob, /path: playwright-report\//)
})

test('coverage thresholds are the audited integer floor and build verification is read-only', async () => {
  const { packageJson } = await readContracts()

  assert.deepEqual(jestConfig.coverageThreshold.global, {
    branches: 62,
    functions: 69,
    lines: 74,
    statements: 73,
  })
  assert.equal(
    packageJson.scripts['build:verify'],
    'vite build && node scripts/build/strip-katex-fonts.mjs && npm run build:size-check && npm run build:production-check',
  )
  assert.equal(
    packageJson.scripts['build:production-check'],
    'node scripts/build/check-production-output.mjs',
  )
  assert.equal(
    packageJson.scripts['test:e2e:prebuilt'],
    'node scripts/e2e/run-e2e.mjs --prebuilt',
  )
  assert.doesNotMatch(packageJson.scripts['build:verify'], /changelog:(?:sync|check)|npm run build(?:\s|$)/)
})

test('dependency checks enforce the canonical lockfile registry before static analysis', async () => {
  const { packageJson } = await readContracts()

  assert.equal(
    packageJson.scripts['deps:registry:check'],
    'node scripts/dependencies/check-lockfile-registry.mjs',
  )
  assert.equal(
    packageJson.scripts['deps:check'],
    'npm run deps:registry:check && knip --include dependencies,unlisted --no-progress',
  )
  assert.equal(
    packageJson.scripts['audit:prod:raw:ci'],
    'npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org',
  )
  assert.equal(
    packageJson.scripts['audit:full:ci'],
    'node scripts/security/audit-full.mjs',
  )
  assert.equal(
    packageJson.scripts['audit:prod:ci'],
    'node scripts/security/audit-production.mjs',
  )
})
