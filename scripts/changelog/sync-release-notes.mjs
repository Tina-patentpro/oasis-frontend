#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')

const DEFAULT_SOURCE_PATH = path.join(repoRoot, 'docs', 'CHANGELOG.md')
const DEFAULT_OUTPUT_PATH = path.join(repoRoot, 'public', 'help', 'release-notes.md')

function normalizeNewlines(source) {
  return source.replace(/\r\n/g, '\n')
}

function findFirstReleaseSection(source) {
  const match = source.match(/^##\s+\[[^\]]+\](?:\s+-\s+.*)?$/m)
  return match?.index ?? -1
}

function findReleaseSectionEnd(source, startIndex) {
  if (startIndex < 0) {
    return source.length
  }

  const footerMatch = /^##\s+版本说明$/m.exec(source.slice(startIndex))
  if (!footerMatch || footerMatch.index == null) {
    return source.length
  }

  return startIndex + footerMatch.index
}

export function extractReleaseSections(source) {
  const normalized = normalizeNewlines(source)
  const startIndex = findFirstReleaseSection(normalized)

  if (startIndex < 0) {
    return ''
  }

  const endIndex = findReleaseSectionEnd(normalized, startIndex)
  return normalized.slice(startIndex, endIndex).trim()
}

export function buildReleaseNotesMarkdown(source) {
  const releaseSections = extractReleaseSections(source)

  return [
    '# 版本更新',
    '',
    '> 这里按版本倒序展示每次发布带来的新增、优化与修复内容。',
    '',
    releaseSections || '暂无版本更新记录。',
    '',
  ].join('\n')
}

export async function syncReleaseNotes({
  sourcePath = DEFAULT_SOURCE_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
} = {}) {
  const source = await readFile(sourcePath, 'utf-8')
  const markdown = buildReleaseNotesMarkdown(source)

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, markdown, 'utf-8')

  return {
    sourcePath,
    outputPath,
    bytes: Buffer.byteLength(markdown),
  }
}

export async function checkReleaseNotes({
  sourcePath = DEFAULT_SOURCE_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
} = {}) {
  const source = await readFile(sourcePath, 'utf-8')
  const markdown = buildReleaseNotesMarkdown(source)
  let current
  try {
    current = await readFile(outputPath, 'utf-8')
  } catch {
    throw new Error('Release notes are out of sync.')
  }

  if (current !== markdown) {
    throw new Error('Release notes are out of sync.')
  }

  return {
    sourcePath,
    outputPath,
    bytes: Buffer.byteLength(markdown),
  }
}

export function parseArguments(argv) {
  if (argv.length === 0) return { check: false }
  if (argv.length === 1 && argv[0] === '--check') return { check: true }
  throw new Error('Unsupported argument.')
}

async function main() {
  const { check } = parseArguments(process.argv.slice(2))
  const result = check ? await checkReleaseNotes() : await syncReleaseNotes()
  console.log(
    `Release notes ${check ? 'verified' : 'synced'}: ${path.relative(repoRoot, result.outputPath)} (${result.bytes} bytes)`,
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Failed to sync release notes.')
    process.exitCode = 1
  })
}
