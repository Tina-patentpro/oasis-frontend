#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export const EXPECTED_NODE_VERSION = '20.19.0'
export const EXPECTED_NPM_VERSION = '10.8.2'

function normalizedVersion(version) {
  return String(version ?? '').trim().replace(/^v/, '')
}

export function assertRuntimeContract({ nodeVersion, npmVersion }) {
  const actualNodeVersion = normalizedVersion(nodeVersion)
  const actualNpmVersion = normalizedVersion(npmVersion)

  if (actualNodeVersion !== EXPECTED_NODE_VERSION) {
    throw new Error(
      `Node ${EXPECTED_NODE_VERSION} required; received ${actualNodeVersion || 'unknown'}.`,
    )
  }

  if (actualNpmVersion !== EXPECTED_NPM_VERSION) {
    throw new Error(
      `npm ${EXPECTED_NPM_VERSION} required; received ${actualNpmVersion || 'unknown'}.`,
    )
  }

  return { nodeVersion: actualNodeVersion, npmVersion: actualNpmVersion }
}

function adjacentNpmRoots(execPath) {
  const nodeDirectory = path.dirname(execPath)
  return [
    path.join(nodeDirectory, 'node_modules', 'npm'),
    path.resolve(nodeDirectory, '..', 'lib', 'node_modules', 'npm'),
  ]
}

export function resolveAdjacentNpmRuntime({
  execPath = process.execPath,
  exists = existsSync,
  readFile = readFileSync,
} = {}) {
  for (const npmRoot of adjacentNpmRoots(execPath)) {
    const packageJsonPath = path.join(npmRoot, 'package.json')
    const npmCliPath = path.join(npmRoot, 'bin', 'npm-cli.js')
    if (!exists(packageJsonPath) || !exists(npmCliPath)) continue

    try {
      const packageJson = JSON.parse(readFile(packageJsonPath, 'utf8'))
      const npmVersion = normalizedVersion(packageJson?.version)
      assertRuntimeContract({ nodeVersion: EXPECTED_NODE_VERSION, npmVersion })
      return { npmVersion, npmCliPath }
    } catch {
      throw new Error('Unable to verify the adjacent npm runtime.')
    }
  }

  throw new Error('Unable to verify the adjacent npm runtime.')
}

export function assertCurrentRuntime(options = {}) {
  const nodeVersion = normalizedVersion(options.nodeVersion ?? process.versions.node)
  assertRuntimeContract({ nodeVersion, npmVersion: EXPECTED_NPM_VERSION })
  const npmRuntime = resolveAdjacentNpmRuntime(options)
  const contract = assertRuntimeContract({ nodeVersion, npmVersion: npmRuntime.npmVersion })
  return { ...contract, npmCliPath: npmRuntime.npmCliPath }
}

function isDirectExecution() {
  if (!process.argv[1]) return false
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
}

if (isDirectExecution()) {
  try {
    const result = assertCurrentRuntime()
    console.log(`Runtime verified: Node ${result.nodeVersion}, npm ${result.npmVersion}.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Runtime verification failed.')
    process.exitCode = 1
  }
}
