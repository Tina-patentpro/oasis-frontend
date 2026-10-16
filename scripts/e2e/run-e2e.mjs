#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { createArtifactManifest } from './create-artifact-manifest.mjs'
import { prepareEvidenceRoot } from './prepare-evidence-root.mjs'

const require = createRequire(import.meta.url)

export function parseRunE2EArgs(argv) {
  return {
    prebuilt: argv.includes('--prebuilt'),
    playwrightArgs: argv.filter((argument) => argument !== '--prebuilt'),
  }
}

function normalizeChildStatus(result) {
  return Number.isInteger(result?.status) && result.status >= 0 ? result.status : 1
}

function resolveNpmCli({ env, execPath }) {
  if (env.npm_execpath) return env.npm_execpath
  return path.resolve(path.dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
}

function createChildEnvironment({ cwd, env }) {
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH'
  const existingPath = env[pathKey]
  const localBin = path.resolve(cwd, 'node_modules', '.bin')

  return {
    ...env,
    [pathKey]: existingPath ? `${localBin}${path.delimiter}${existingPath}` : localBin,
  }
}

function resolvePlaywrightCli() {
  const packagePath = require.resolve('playwright/package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  const bin =
    typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.playwright
  if (typeof bin !== 'string' || bin.length === 0) {
    throw new Error('Unable to resolve the local Playwright CLI.')
  }
  return path.resolve(path.dirname(packagePath), bin)
}

export async function runE2E({
  argv = process.argv.slice(2),
  cwd = process.cwd(),
  env = process.env,
  execPath = process.execPath,
  npmCliPath = resolveNpmCli({ env, execPath }),
  playwrightCliPath = resolvePlaywrightCli(),
  spawnSyncImpl = spawnSync,
  prepareEvidenceRootImpl = prepareEvidenceRoot,
  createArtifactManifestImpl = createArtifactManifest,
} = {}) {
  const { prebuilt, playwrightArgs } = parseRunE2EArgs(argv)
  const childEnv = createChildEnvironment({ cwd, env })
  const spawnNode = (args) =>
    normalizeChildStatus(
      spawnSyncImpl(execPath, args, {
        cwd,
        env: childEnv,
        stdio: 'inherit',
        shell: false,
      }),
    )

  if (!prebuilt) {
    for (const script of ['changelog:check', 'build:verify']) {
      const status = spawnNode([npmCliPath, 'run', script])
      if (status !== 0) return status
    }
  }

  const root = await prepareEvidenceRootImpl({ cwd, env })
  const playwrightStatus = spawnNode([playwrightCliPath, 'test', ...playwrightArgs])
  if (playwrightStatus !== 0) return playwrightStatus

  await createArtifactManifestImpl({ root, cwd, env })
  return 0
}

async function main() {
  process.exitCode = await runE2E()
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'E2E orchestration failed.')
    process.exitCode = 1
  })
}
