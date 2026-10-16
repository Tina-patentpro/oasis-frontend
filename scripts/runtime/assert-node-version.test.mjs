import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  EXPECTED_NODE_VERSION,
  EXPECTED_NPM_VERSION,
  assertCurrentRuntime,
  assertRuntimeContract,
  resolveAdjacentNpmRuntime,
} from './assert-node-version.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptPath = path.join(__dirname, 'assert-node-version.mjs')

function createRuntimeLayout() {
  const execPath = path.resolve(path.sep, 'runtime', 'bin', 'node.exe')
  const nodeDirectory = path.dirname(execPath)
  const roots = [
    path.join(nodeDirectory, 'node_modules', 'npm'),
    path.resolve(nodeDirectory, '..', 'lib', 'node_modules', 'npm'),
  ]
  return {
    execPath,
    roots,
    packageJsonPaths: roots.map((root) => path.join(root, 'package.json')),
    cliPaths: roots.map((root) => path.join(root, 'bin', 'npm-cli.js')),
  }
}

test('accepts only the pinned official Node and npm pair', () => {
  assert.equal(EXPECTED_NODE_VERSION, '20.19.0')
  assert.equal(EXPECTED_NPM_VERSION, '10.8.2')
  assert.doesNotThrow(() =>
    assertRuntimeContract({ nodeVersion: 'v20.19.0', npmVersion: '10.8.2' }),
  )
})

test('rejects the wrong Node version before release work can start', () => {
  assert.throws(
    () => assertRuntimeContract({ nodeVersion: '22.19.0', npmVersion: '10.8.2' }),
    /Node 20\.19\.0 required; received 22\.19\.0\./,
  )
})

test('rejects the wrong adjacent npm version', () => {
  assert.throws(
    () => assertRuntimeContract({ nodeVersion: '20.19.0', npmVersion: '10.9.0' }),
    /npm 10\.8\.2 required; received 10\.9\.0\./,
  )
})

test('resolves npm version and CLI atomically from the same adjacent root', () => {
  const layout = createRuntimeLayout()
  const packageJsonPath = layout.packageJsonPaths[1]
  const npmCliPath = layout.cliPaths[1]
  const result = resolveAdjacentNpmRuntime({
    execPath: layout.execPath,
    exists: (filePath) => filePath === npmCliPath || filePath === packageJsonPath,
    readFile: (filePath) => {
      if (filePath === packageJsonPath) return '{"version":"10.8.2"}'
      throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    },
  })

  assert.deepEqual(result, {
    npmVersion: '10.8.2',
    npmCliPath,
  })
  assert.deepEqual(
    assertCurrentRuntime({
      nodeVersion: '20.19.0',
      execPath: layout.execPath,
      exists: (filePath) => filePath === npmCliPath || filePath === packageJsonPath,
      readFile: (filePath) => {
        if (filePath === packageJsonPath) return '{"version":"10.8.2"}'
        throw new Error('missing')
      },
    }),
    { nodeVersion: '20.19.0', npmVersion: '10.8.2', npmCliPath },
  )
})

test('rejects a mixed npm layout where version and CLI come from different roots', () => {
  const layout = createRuntimeLayout()

  assert.throws(
    () =>
      resolveAdjacentNpmRuntime({
        execPath: layout.execPath,
        exists: (filePath) =>
          filePath === layout.packageJsonPaths[0] || filePath === layout.cliPaths[1],
        readFile: (filePath) => {
          if (filePath === layout.packageJsonPaths[0]) return '{"version":"10.8.2"}'
          throw Object.assign(new Error('missing'), { code: 'ENOENT' })
        },
      }),
    /Unable to verify the adjacent npm runtime/,
  )
})

test('the direct CLI uses the same successful runtime contract', () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: path.resolve(__dirname, '..', '..'),
    env: {
      ...process.env,
      PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}`,
    },
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Runtime verified: Node 20\.19\.0, npm 10\.8\.2\./)
})
