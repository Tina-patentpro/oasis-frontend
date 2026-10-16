#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const repositoryRoot = path.resolve(path.dirname(currentFile), '..')
const scriptsRoot = path.join(repositoryRoot, 'scripts')

export function isScriptTestFile(name) {
  return name.endsWith('.test.mjs')
}

export async function discoverScriptTestFiles(root = scriptsRoot) {
  const testFiles = []

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(entryPath)
      } else if (entry.isFile() && isScriptTestFile(entry.name)) {
        testFiles.push(path.relative(repositoryRoot, entryPath).split(path.sep).join('/'))
      }
    }
  }

  await visit(root)
  return testFiles.sort((left, right) => left.localeCompare(right, 'en'))
}

export function runScriptTests(
  testFiles,
  { spawn = spawnSync, execPath = process.execPath, cwd = repositoryRoot } = {},
) {
  if (!Array.isArray(testFiles) || testFiles.length === 0) {
    throw new Error('No script tests were found.')
  }

  const result = spawn(execPath, ['--test', ...testFiles], {
    cwd,
    shell: false,
    stdio: 'inherit',
    windowsHide: true,
  })
  if (result.error) throw result.error
  return Number.isInteger(result.status) ? result.status : 1
}

async function main() {
  const testFiles = await discoverScriptTestFiles()
  process.exitCode = runScriptTests(testFiles)
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(`Script test runner failed: ${error.message}`)
    process.exitCode = 1
  })
}
