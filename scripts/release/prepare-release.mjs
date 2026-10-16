#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { assertCurrentRuntime } from '../runtime/assert-node-version.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')

const PACKAGE_JSON_PATH = path.join(repoRoot, 'package.json')
const PACKAGE_LOCK_PATH = path.join(repoRoot, 'package-lock.json')
const CHANGELOG_PATH = path.join(repoRoot, 'docs', 'CHANGELOG.md')
const RELEASE_NOTES_PATH = path.join(repoRoot, 'public', 'help', 'release-notes.md')

export const CANONICAL_RELEASE_CHECKS = [
  ['npm', ['run', 'scripts:test']],
  ['npm', ['run', 'test:ci']],
  ['npm', ['run', 'type-check']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'api:validate:ci']],
  ['npm', ['run', 'api:drift:strict']],
  ['npm', ['run', 'api:docs:check']],
  ['npm', ['run', 'security:scan']],
  ['npm', ['run', 'deps:check']],
  ['npm', ['run', 'audit:prod:ci']],
  ['npm', ['run', 'audit:full:ci']],
  ['npm', ['run', 'changelog:check']],
  ['npm', ['run', 'build:verify']],
  ['npm', ['run', 'test:e2e:prebuilt']],
]

const EMPTY_ITEM_TEXT = {
  added: '本版本无需要单独对外说明的新增项。',
  changed: '本版本无需要单独对外说明的优化项。',
  fixed: '本版本无需要单独对外说明的修复项。',
  notes: '本版本无需要特别注意的事项。',
}

function normalizeNewlines(source) {
  return source.replace(/\r\n/g, '\n')
}

function normalizeList(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
  }

  return [String(value).trim()].filter(Boolean)
}

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

export function formatLocalDate(date = new Date()) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-')
}

function todayString() {
  return formatLocalDate()
}

function parseFlagValue(args, index, flag) {
  const value = args[index + 1]

  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} 需要填写后面的值。`)
  }

  return value
}

export function parseReleaseArgs(args = process.argv.slice(2)) {
  const result = {
    bump: '',
    version: '',
    summary: '',
    added: [],
    changed: [],
    fixed: [],
    notes: [],
    checkCurrent: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--bump') {
      result.bump = parseFlagValue(args, index, arg)
      index += 1
      continue
    }

    if (arg === '--version') {
      result.version = parseFlagValue(args, index, arg)
      index += 1
      continue
    }

    if (arg === '--summary') {
      result.summary = parseFlagValue(args, index, arg)
      index += 1
      continue
    }

    if (arg === '--added') {
      result.added.push(parseFlagValue(args, index, arg))
      index += 1
      continue
    }

    if (arg === '--changed') {
      result.changed.push(parseFlagValue(args, index, arg))
      index += 1
      continue
    }

    if (arg === '--fixed') {
      result.fixed.push(parseFlagValue(args, index, arg))
      index += 1
      continue
    }

    if (arg === '--note') {
      result.notes.push(parseFlagValue(args, index, arg))
      index += 1
      continue
    }

    if (arg === '--check-current') {
      result.checkCurrent = true
      continue
    }

    if (arg === '--allow-same-version') {
      throw new Error('--allow-same-version 已停用。请使用 --check-current 只运行当前版本检查。')
    }

    throw new Error(`无法识别的参数：${arg}`)
  }

  if (result.bump && result.version) {
    throw new Error('请只使用 --bump 或 --version 其中一种版本方式。')
  }

  if (result.checkCurrent && (result.bump || result.version)) {
    throw new Error('--check-current 不能和发布版本参数一起使用。')
  }

  if (!result.checkCurrent && !result.bump && !result.version) {
    throw new Error('请提供 --bump patch/minor/major、--version x.y.z，或 --check-current。')
  }

  if (result.bump && !['patch', 'minor', 'major'].includes(result.bump)) {
    throw new Error('--bump 只支持 patch、minor、major。')
  }

  if (result.checkCurrent) {
    const hasReleaseNotes = [
      result.summary,
      ...result.added,
      ...result.changed,
      ...result.fixed,
      ...result.notes,
    ].some(Boolean)

    if (hasReleaseNotes) {
      throw new Error('--check-current 只运行检查，不写更新日志；请移除发布说明参数。')
    }
  }

  return result
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)

  if (!match) {
    throw new Error(`版本号格式不正确：${version}。请使用 x.y.z 格式。`)
  }

  return match.slice(1).map((part) => Number(part))
}

export function calculateNextVersion(currentVersion, options) {
  if (options.version) {
    parseSemver(options.version)
    return options.version
  }

  const [major, minor, patch] = parseSemver(currentVersion)

  if (options.bump === 'major') {
    return `${major + 1}.0.0`
  }

  if (options.bump === 'minor') {
    return `${major}.${minor + 1}.0`
  }

  return `${major}.${minor}.${patch + 1}`
}

function compareVersions(leftVersion, rightVersion) {
  const leftParts = parseSemver(leftVersion)
  const rightParts = parseSemver(rightVersion)

  for (let index = 0; index < leftParts.length; index += 1) {
    const left = leftParts[index]
    const right = rightParts[index]

    if (left > right) return 1
    if (left < right) return -1
  }

  return 0
}

export function validateTargetVersion(currentVersion, targetVersion) {
  const comparison = compareVersions(targetVersion, currentVersion)

  if (comparison < 0) {
    throw new Error(
      `目标版本必须大于当前版本，避免误降级：当前 ${currentVersion}，目标 ${targetVersion}。`,
    )
  }

  if (comparison === 0) {
    throw new Error(
      `目标版本和当前版本相同：${targetVersion}。如需只跑当前版本检查，请使用 --check-current。`,
    )
  }
}

export function shouldWriteReleaseFiles(args) {
  return !args.checkCurrent
}

export function getReleaseChecks(args) {
  void args
  return CANONICAL_RELEASE_CHECKS
}

function firstReleaseVersion(source, label) {
  const match = /^##\s+\[([^\]]+)\]/m.exec(normalizeNewlines(source))
  if (!match) throw new Error(`Version chain mismatch: ${label} has no release section.`)
  return match[1]
}

export function assertVersionChain({
  packageJsonSource,
  packageLockSource,
  changelogSource,
  releaseNotesSource,
}) {
  const packageVersion = JSON.parse(packageJsonSource).version
  const packageLock = JSON.parse(packageLockSource)
  const versions = {
    package: packageVersion,
    packageLock: packageLock.version,
    packageLockRoot: packageLock.packages?.['']?.version,
    changelog: firstReleaseVersion(changelogSource, 'CHANGELOG'),
    releaseNotes: firstReleaseVersion(releaseNotesSource, 'release notes'),
  }
  const uniqueVersions = new Set(Object.values(versions))

  if (!packageVersion || uniqueVersions.size !== 1) {
    const summary = Object.entries(versions)
      .map(([label, version]) => `${label}=${version ?? 'missing'}`)
      .join(', ')
    throw new Error(`Version chain mismatch: ${summary}.`)
  }

  return packageVersion
}

function stringifyJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`
}

export function updatePackageJsonContent(source, version) {
  const packageJson = JSON.parse(source)
  packageJson.version = version
  return stringifyJson(packageJson)
}

export function updatePackageLockContent(source, version) {
  const packageLock = JSON.parse(source)
  packageLock.version = version

  if (packageLock.packages?.['']) {
    packageLock.packages[''].version = version
  }

  return stringifyJson(packageLock)
}

function renderList(items, emptyText) {
  const normalizedItems = normalizeList(items)

  if (normalizedItems.length === 0) {
    return `- ${emptyText}`
  }

  return normalizedItems.map((item) => `- ${item}`).join('\n')
}

export function buildReleaseSection({
  version,
  date = todayString(),
  summary = '',
  added = [],
  changed = [],
  fixed = [],
  notes = [],
}) {
  const summaryText = summary || '完善发布前检查流程，提升版本发布稳定性。'

  return [
    `## [${version}]`,
    '',
    '### 本次重点',
    '',
    `\`${version}\` ${summaryText}`,
    '',
    '### 新增',
    '',
    renderList(added, EMPTY_ITEM_TEXT.added),
    '',
    '### 优化',
    '',
    renderList(changed, EMPTY_ITEM_TEXT.changed),
    '',
    '### 修复',
    '',
    renderList(fixed, EMPTY_ITEM_TEXT.fixed),
    '',
    '### 需要注意',
    '',
    renderList(notes, EMPTY_ITEM_TEXT.notes),
    '',
  ].join('\n')
}

function replaceLastUpdated(source, date) {
  const footerPattern = /\*\*最后更新：\*\*\s+\d{4}-\d{2}-\d{2}/

  if (footerPattern.test(source)) {
    return source.replace(footerPattern, `**最后更新：** ${date}`)
  }

  return `${source.trimEnd()}\n\n**最后更新：** ${date}\n`
}

export function updateChangelogContent(source, release) {
  const normalized = normalizeNewlines(source)
  const versionHeading = `## [${release.version}]`
  let next = normalized

  if (!next.includes(versionHeading)) {
    const firstReleaseMatch = /^##\s+\[[^\]]+\]/m.exec(next)
    const releaseSection = buildReleaseSection(release)

    if (firstReleaseMatch?.index != null) {
      next = `${next.slice(0, firstReleaseMatch.index)}${releaseSection}\n${next.slice(firstReleaseMatch.index)}`
    } else {
      next = `${next.trimEnd()}\n\n${releaseSection}`
    }
  }

  return replaceLastUpdated(next, release.date)
}

export class ReleaseCheckError extends Error {
  constructor(message, exitCode = 1) {
    super(message)
    this.name = 'ReleaseCheckError'
    this.exitCode = Number.isInteger(exitCode) ? exitCode : 1
  }
}

export function runCheck(
  [command, args],
  {
    spawn = spawnSync,
    env = process.env,
    cwd = repoRoot,
    npmCliPath,
  } = {},
) {
  const displayCommand = `${command} ${args.join(' ')}`
  console.log(`\n▶ ${displayCommand}`)

  if (command === 'npm' && !npmCliPath) {
    throw new ReleaseCheckError('Verified npm CLI path is required.', 1)
  }

  const executable = command === 'npm' ? process.execPath : command
  const executableArgs = command === 'npm' ? [npmCliPath, ...args] : args

  const result = spawn(executable, executableArgs, {
    cwd,
    env,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0) {
    const exitCode = Number.isInteger(result.status) ? result.status : 1
    throw new ReleaseCheckError(`发布检查失败：${displayCommand}`, exitCode)
  }
}

export function runChecks(
  checks,
  {
    runCheckImpl = runCheck,
    spawn,
    env = process.env,
    cwd = repoRoot,
    npmCliPath,
  } = {},
) {
  for (const check of checks) {
    runCheckImpl(check, { spawn, env, cwd, npmCliPath })
  }
}

export function exitCodeForError(error) {
  return error instanceof ReleaseCheckError && Number.isInteger(error.exitCode)
    ? error.exitCode
    : 1
}

async function readVersionSources(readFileImpl) {
  const [packageJsonSource, packageLockSource, changelogSource, releaseNotesSource] =
    await Promise.all([
      readFileImpl(PACKAGE_JSON_PATH, 'utf-8'),
      readFileImpl(PACKAGE_LOCK_PATH, 'utf-8'),
      readFileImpl(CHANGELOG_PATH, 'utf-8'),
      readFileImpl(RELEASE_NOTES_PATH, 'utf-8'),
    ])

  return { packageJsonSource, packageLockSource, changelogSource, releaseNotesSource }
}

export async function runRelease({
  argv = process.argv.slice(2),
  assertRuntime = assertCurrentRuntime,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
  runCheckImpl = runCheck,
  env = process.env,
} = {}) {
  const runtime = assertRuntime()
  const npmCliPath = runtime?.npmCliPath
  if (!npmCliPath) throw new Error('Runtime contract did not return a verified npm CLI path.')

  const args = parseReleaseArgs(argv)
  const sources = await readVersionSources(readFileImpl)
  const currentVersion = assertVersionChain(sources)

  if (!shouldWriteReleaseFiles(args)) {
    console.log(`只检查当前版本：v${currentVersion}`)

    runChecks(getReleaseChecks(args), { runCheckImpl, env, npmCliPath })

    console.log(`\n当前版本检查完成：v${currentVersion}`)
    return
  }

  const targetVersion = calculateNextVersion(currentVersion, args)
  validateTargetVersion(currentVersion, targetVersion)
  const date = todayString()

  console.log(`准备发布版本：${currentVersion} -> ${targetVersion}`)

  await writeFileImpl(
    PACKAGE_JSON_PATH,
    updatePackageJsonContent(sources.packageJsonSource, targetVersion),
    'utf-8',
  )

  await writeFileImpl(
    PACKAGE_LOCK_PATH,
    updatePackageLockContent(sources.packageLockSource, targetVersion),
    'utf-8',
  )

  await writeFileImpl(
    CHANGELOG_PATH,
    updateChangelogContent(sources.changelogSource, {
      version: targetVersion,
      date,
      summary: args.summary,
      added: args.added,
      changed: args.changed,
      fixed: args.fixed,
      notes: args.notes,
    }),
    'utf-8',
  )

  runCheckImpl(['npm', ['run', 'changelog:sync']], { env, npmCliPath })
  assertVersionChain(await readVersionSources(readFileImpl))
  runChecks(getReleaseChecks(args), { runCheckImpl, env, npmCliPath })

  console.log(`\n发布准备完成：v${targetVersion}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRelease().catch((error) => {
    console.error(error instanceof Error ? error.message : '发布检查失败。')
    process.exitCode = exitCodeForError(error)
  })
}
