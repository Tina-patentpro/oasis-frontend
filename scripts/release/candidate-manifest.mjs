#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { lstat, mkdir, readFile, readlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..', '..')
const DELETED_MARKER = 'DELETED'
const LAYERS = ['index', 'worktree', 'untracked']
const LAYER_ORDER = new Map(LAYERS.map((layer, index) => [layer, index]))

function normalizeRelativePath(value) {
  const normalized = String(value ?? '').replaceAll('\\', '/').replace(/^\.\//, '')
  const segments = normalized.split('/')

  if (
    !normalized ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized) ||
    segments.includes('..') ||
    segments.includes('')
  ) {
    throw new Error(`Invalid repository-relative path: ${value || 'empty'}`)
  }

  return normalized
}

function splitNul(buffer) {
  const parts = Buffer.from(buffer).toString('utf8').split('\0')
  if (parts.at(-1) === '') parts.pop()
  return parts
}

export function parseNameStatusZ(buffer) {
  const parts = splitNul(buffer)
  const records = []

  for (let index = 0; index < parts.length; ) {
    let status = parts[index]
    index += 1
    let firstPath

    if (status.includes('\t')) {
      const separator = status.indexOf('\t')
      firstPath = status.slice(separator + 1)
      status = status.slice(0, separator)
    } else {
      firstPath = parts[index]
      index += 1
    }

    if (!status || firstPath == null) {
      throw new Error('Invalid NUL-delimited Git name-status output.')
    }

    if (/^[RC]\d+$/.test(status)) {
      const nextPath = parts[index]
      index += 1
      if (nextPath == null) throw new Error('Invalid renamed Git record.')
      records.push({
        status,
        previousPath: normalizeRelativePath(firstPath),
        path: normalizeRelativePath(nextPath),
      })
      continue
    }

    records.push({ status, path: normalizeRelativePath(firstPath) })
  }

  return records
}

export function parseIndexStageZ(buffer, expectedPath) {
  const records = splitNul(buffer)
  if (records.length !== 1) {
    throw new Error(`Expected exactly one stage-0 index record: ${expectedPath}`)
  }

  const record = records[0]
  const separator = record.indexOf('\t')
  if (separator < 0) throw new Error(`Invalid index stage record: ${expectedPath}`)

  const [mode, oid, stage, ...extra] = record.slice(0, separator).split(' ')
  const recordPath = normalizeRelativePath(record.slice(separator + 1))
  if (extra.length > 0 || stage !== '0' || recordPath !== expectedPath) {
    throw new Error(`Expected exactly one stage-0 index record: ${expectedPath}`)
  }
  if (!/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(oid ?? '')) {
    throw new Error(`Invalid index object ID: ${expectedPath}`)
  }
  if (!['100644', '100755', '120000'].includes(mode)) {
    throw new Error(`Unsupported index mode: ${mode ?? 'missing'}`)
  }

  return {
    kind: mode === '120000' ? 'symlink' : 'file',
    mode,
    oid,
  }
}

function runGit(args, { repoRoot, spawn = spawnSync }) {
  const result = spawn('git', args, {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  })

  if (result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    throw new Error(`Candidate Git scan failed: git ${args[0]}.`)
  }

  return result.stdout
}

function sortEntries(entries) {
  return entries.sort((left, right) => {
    const layerDifference = LAYER_ORDER.get(left.layer) - LAYER_ORDER.get(right.layer)
    if (layerDifference !== 0) return layerDifference
    if (left.path < right.path) return -1
    if (left.path > right.path) return 1
    return 0
  })
}

async function readWorktreeEntry(
  absolutePath,
  {
    lstatImpl = lstat,
    readlinkImpl = readlink,
    readFileImpl = readFile,
  } = {},
) {
  const stats = await lstatImpl(absolutePath)

  if (stats.isSymbolicLink()) {
    const bytes = await readlinkImpl(absolutePath, { encoding: 'buffer' })
    if (!Buffer.isBuffer(bytes)) {
      throw new Error(`Unable to read raw symbolic-link bytes: ${absolutePath}`)
    }
    return { bytes: Buffer.from(bytes), kind: 'symlink', mode: '120000' }
  }

  if (!stats.isFile()) {
    throw new Error(`Candidate path is not a regular file: ${absolutePath}`)
  }

  const bytes = Buffer.from(await readFileImpl(absolutePath))
  const mode = (stats.mode & 0o111) === 0 ? '100644' : '100755'
  return { bytes, kind: 'file', mode }
}

export async function readWorktreeBlob(absolutePath, options = {}) {
  return (await readWorktreeEntry(absolutePath, options)).bytes
}

async function hashRecord(record, { repoRoot, spawn }) {
  if (record.status === 'D') {
    return {
      ...record,
      kind: 'deleted',
      mode: null,
      bytes: 0,
      sha256: DELETED_MARKER,
    }
  }

  let bytes
  let kind
  let mode

  if (record.layer === 'index') {
    const indexEntry = parseIndexStageZ(
      runGit(['ls-files', '--stage', '-z', '--', record.path], { repoRoot, spawn }),
      record.path,
    )
    bytes = runGit(['cat-file', 'blob', indexEntry.oid], { repoRoot, spawn })
    kind = indexEntry.kind
    mode = indexEntry.mode
  } else {
    const worktreeEntry = await readWorktreeEntry(
      path.join(repoRoot, ...record.path.split('/')),
    )
    bytes = worktreeEntry.bytes
    kind = worktreeEntry.kind
    mode = worktreeEntry.mode
  }

  return {
    ...record,
    kind,
    mode,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

export async function buildCandidateManifest({
  repoRoot = defaultRepoRoot,
  baseline,
  spawn = spawnSync,
}) {
  if (!/^[0-9a-fA-F]{4,40}$/.test(String(baseline ?? ''))) {
    throw new Error('A hexadecimal baseline commit is required.')
  }

  const resolvedBaseline = runGit(
    ['rev-parse', '--verify', `${baseline}^{commit}`],
    { repoRoot, spawn },
  )
    .toString('utf8')
    .trim()
  const indexRecords = parseNameStatusZ(
    runGit(
      ['diff', '--cached', '--find-renames', '--name-status', '-z', resolvedBaseline, '--'],
      { repoRoot, spawn },
    ),
  ).map((record) => ({ layer: 'index', ...record }))
  const worktreeRecords = parseNameStatusZ(
    runGit(['diff', '--find-renames', '--name-status', '-z', '--'], { repoRoot, spawn }),
  ).map((record) => ({ layer: 'worktree', ...record }))
  const untracked = splitNul(
    runGit(['ls-files', '--others', '--exclude-standard', '-z'], { repoRoot, spawn }),
  )
    .map(normalizeRelativePath)
    .map((filePath) => ({ layer: 'untracked', status: '??', path: filePath }))
  const records = sortEntries([...indexRecords, ...worktreeRecords, ...untracked])
  const entries = await Promise.all(
    records.map((record) => hashRecord(record, { repoRoot, spawn })),
  )

  return {
    schemaVersion: 2,
    baseline: resolvedBaseline,
    entries,
  }
}

export async function writeCandidateManifest(outputPath, manifest) {
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
}

function manifestEntriesByKey(manifest) {
  if (!manifest || manifest.schemaVersion !== 2 || !Array.isArray(manifest.entries)) {
    throw new Error('Invalid candidate manifest.')
  }

  const entries = new Map()
  for (const entry of manifest.entries) {
    const entryPath = normalizeRelativePath(entry?.path)
    if (!LAYERS.includes(entry?.layer)) throw new Error(`Invalid candidate layer: ${entry?.layer}`)
    if (entry.status === 'D') {
      if (
        entry.kind !== 'deleted' ||
        entry.mode !== null ||
        entry.bytes !== 0 ||
        entry.sha256 !== DELETED_MARKER
      ) {
        throw new Error(`Invalid deleted candidate entry: ${entry.layer}:${entryPath}`)
      }
    } else if (
      !['file', 'symlink'].includes(entry.kind) ||
      !['100644', '100755', '120000'].includes(entry.mode) ||
      (entry.kind === 'symlink') !== (entry.mode === '120000')
    ) {
      throw new Error(`Invalid candidate file metadata: ${entry.layer}:${entryPath}`)
    }
    const entryKey = `${entry.layer}\0${entryPath}`
    if (entries.has(entryKey)) {
      throw new Error(`Duplicate candidate entry: ${entry.layer}:${entryPath}`)
    }
    entries.set(entryKey, entry)
  }
  return entries
}

function changedPaths(before, after) {
  const beforeEntries = manifestEntriesByKey(before)
  const afterEntries = manifestEntriesByKey(after)
  const keys = new Set([...beforeEntries.keys(), ...afterEntries.keys()])
  return [...keys]
    .filter((entryKey) => !isDeepStrictEqual(beforeEntries.get(entryKey), afterEntries.get(entryKey)))
    .sort()
}

export function compareCandidateManifests(
  before,
  after,
  { allowedPaths = [] } = {},
) {
  const allowed = new Set(allowedPaths.map(normalizeRelativePath))
  const changed = changedPaths(before, after)
  const unexpectedEntries = changed.filter((entryKey) => {
    const entryPath = entryKey.slice(entryKey.indexOf('\0') + 1)
    return !allowed.has(entryPath)
  })
  const beforeMetadata = { ...before, entries: undefined }
  const afterMetadata = { ...after, entries: undefined }

  if (!isDeepStrictEqual(beforeMetadata, afterMetadata)) {
    throw new Error('Candidate changed outside allowlist: manifest metadata.')
  }

  if (unexpectedEntries.length > 0) {
    const labels = unexpectedEntries.map((entryKey) => entryKey.replace('\0', ':'))
    throw new Error(`Candidate changed outside allowlist: ${labels.join(', ')}.`)
  }

  return {
    changedEntries: changed,
    changedPaths: [...new Set(changed.map((entryKey) => entryKey.slice(entryKey.indexOf('\0') + 1)))],
  }
}

export function parseArguments(argv = process.argv.slice(2)) {
  if (argv[0] === '--compare') {
    const beforePath = argv[1]
    const afterPath = argv[2]
    if (!beforePath || !afterPath) throw new Error('--compare requires two manifest paths.')

    const allowedPaths = []
    for (let index = 3; index < argv.length; index += 1) {
      if (argv[index] !== '--allow-change' || !argv[index + 1]) {
        throw new Error('Unsupported candidate manifest argument.')
      }
      allowedPaths.push(normalizeRelativePath(argv[index + 1]))
      index += 1
    }
    return { mode: 'compare', beforePath, afterPath, allowedPaths }
  }

  let baseline
  let outputPath
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]
    if ((argument === '--baseline' || argument === '--output') && value) {
      if (argument === '--baseline') baseline = value
      else outputPath = value
      index += 1
      continue
    }
    throw new Error('Unsupported candidate manifest argument.')
  }

  if (!baseline || !outputPath) throw new Error('--baseline and --output are required.')
  return { mode: 'generate', baseline, outputPath }
}

async function main() {
  const args = parseArguments()

  if (args.mode === 'compare') {
    const [before, after] = await Promise.all([
      readFile(args.beforePath, 'utf8').then(JSON.parse),
      readFile(args.afterPath, 'utf8').then(JSON.parse),
    ])
    const result = compareCandidateManifests(before, after, {
      allowedPaths: args.allowedPaths,
    })
    console.log(`Candidate manifests match (${result.changedPaths.length} allowed change(s)).`)
    return
  }

  const manifest = await buildCandidateManifest({ baseline: args.baseline })
  await writeCandidateManifest(args.outputPath, manifest)
  console.log(`Candidate manifest created: ${args.outputPath} (${manifest.entries.length} entries).`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Candidate manifest failed.')
    process.exitCode = 1
  })
}
