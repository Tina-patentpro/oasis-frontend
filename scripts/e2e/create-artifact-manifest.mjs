#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { resolveEvidenceRoot } from './prepare-evidence-root.mjs'

const MANIFEST_FILENAME = 'artifact-manifest.json'

async function requireDirectory(directory, label) {
  let stats
  try {
    stats = await lstat(directory)
  } catch {
    throw new Error(`E2E evidence root is missing ${label}.`)
  }
  if (!stats.isDirectory()) {
    throw new Error(`E2E evidence root is missing ${label}.`)
  }
}

async function collectRelativeFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      throw new Error(`E2E evidence root contains an unsupported symbolic link: ${entry.name}`)
    }
    if (entry.isDirectory()) {
      files.push(...(await collectRelativeFiles(root, absolutePath)))
      continue
    }
    if (!entry.isFile()) {
      throw new Error(`E2E evidence root contains an unsupported entry: ${entry.name}`)
    }

    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/')
    if (relativePath !== MANIFEST_FILENAME) {
      files.push({ absolutePath, relativePath })
    }
  }

  return files
}

async function buildManifest(root) {
  await requireDirectory(path.join(root, 'html-report'), 'html-report/')
  await requireDirectory(path.join(root, 'test-results'), 'test-results/')

  const files = await collectRelativeFiles(root)
  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'en'))
  if (files.length === 0) {
    throw new Error('E2E evidence root contains no artifacts.')
  }

  const records = []
  for (const file of files) {
    const bytes = await readFile(file.absolutePath)
    records.push({
      path: file.relativePath,
      size: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  }

  return {
    version: 1,
    algorithm: 'sha256',
    files: records,
  }
}

export async function createArtifactManifest(options = {}) {
  const root = options.root ? path.resolve(options.root) : resolveEvidenceRoot(options)
  const manifestPath = path.join(root, MANIFEST_FILENAME)
  const manifest = await buildManifest(root)

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  return manifestPath
}

export async function checkArtifactManifest(options = {}) {
  const root = options.root ? path.resolve(options.root) : resolveEvidenceRoot(options)
  const manifestPath = path.join(root, MANIFEST_FILENAME)
  let recorded
  try {
    recorded = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    throw new Error('Artifact manifest does not match the evidence root.')
  }
  const actual = await buildManifest(root)

  if (JSON.stringify(recorded) !== JSON.stringify(actual)) {
    throw new Error('Artifact manifest does not match the evidence root.')
  }

  return manifestPath
}

export function parseArtifactManifestArgs(argv) {
  if (argv.length === 0) return { check: false }
  if (argv.length === 1 && argv[0] === '--check') return { check: true }
  throw new Error('Unsupported artifact manifest argument.')
}

async function main() {
  const { check } = parseArtifactManifestArgs(process.argv.slice(2))
  const manifestPath = check
    ? await checkArtifactManifest()
    : await createArtifactManifest()
  console.log(`${check ? 'Verified' : 'Created'} E2E artifact manifest: ${manifestPath}`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'E2E artifact manifest failed.')
    process.exitCode = 1
  })
}
