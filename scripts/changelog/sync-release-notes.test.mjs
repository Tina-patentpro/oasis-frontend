import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  buildReleaseNotesMarkdown,
  checkReleaseNotes,
  parseArguments,
} from './sync-release-notes.mjs'

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'oasis-changelog-check-'))
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('buildReleaseNotesMarkdown keeps release entries and removes internal sections', () => {
  const source = `# 📝 更新日志

## Stage D 流程与订阅

- 这是内部流程

## [未发布]

### 新增

- 新增功能 A

## [1.0.0] - 2025-10-02

### 修复

- 修复问题 B

## 版本说明

- 这是额外说明
`

  const output = buildReleaseNotesMarkdown(source)

  assert.match(output, /# 版本更新/)
  assert.match(output, /## \[未发布\]/)
  assert.match(output, /## \[1\.0\.0\] - 2025-10-02/)
  assert.doesNotMatch(output, /Stage D 流程与订阅/)
  assert.doesNotMatch(output, /## 版本说明/)
})

test('checkReleaseNotes succeeds without rewriting an identical output file', async () => {
  await withTemporaryDirectory(async (directory) => {
    const sourcePath = resolve(directory, 'CHANGELOG.md')
    const outputPath = resolve(directory, 'public', 'release-notes.md')
    const source = '# 更新日志\n\n## [1.0.5] - 2026-07-19\n\n- 已发布\n'
    const expected = buildReleaseNotesMarkdown(source)
    await mkdir(resolve(directory, 'public'))
    await writeFile(sourcePath, source)
    await writeFile(outputPath, expected)
    const before = await stat(outputPath)

    const result = await checkReleaseNotes({ sourcePath, outputPath })
    const after = await stat(outputPath)

    assert.equal(result.bytes, Buffer.byteLength(expected))
    assert.equal(await readFile(outputPath, 'utf8'), expected)
    assert.equal(after.mtimeMs, before.mtimeMs)
  })
})

test('checkReleaseNotes rejects drift with a fixed content-free error', async () => {
  await withTemporaryDirectory(async (directory) => {
    const sourcePath = resolve(directory, 'CHANGELOG.md')
    const outputPath = resolve(directory, 'release-notes.md')
    await writeFile(sourcePath, '# 更新日志\n\n## [1.0.5]\n\n- secret source text\n')
    await writeFile(outputPath, 'secret stale text')

    await assert.rejects(
      () => checkReleaseNotes({ sourcePath, outputPath }),
      (error) => {
        assert.equal(error.message, 'Release notes are out of sync.')
        assert.doesNotMatch(error.message, /secret/i)
        return true
      },
    )
  })
})

test('checkReleaseNotes does not create a missing output directory or file', async () => {
  await withTemporaryDirectory(async (directory) => {
    const sourcePath = resolve(directory, 'CHANGELOG.md')
    const outputPath = resolve(directory, 'missing', 'release-notes.md')
    await writeFile(sourcePath, '# 更新日志\n\n## [1.0.5]\n\n- current\n')

    await assert.rejects(
      () => checkReleaseNotes({ sourcePath, outputPath }),
      /Release notes are out of sync\./,
    )
    await assert.rejects(() => stat(resolve(directory, 'missing')), { code: 'ENOENT' })
  })
})

test('parseArguments accepts only the exact read-only check flag', () => {
  assert.deepEqual(parseArguments([]), { check: false })
  assert.deepEqual(parseArguments(['--check']), { check: true })
  assert.throws(() => parseArguments(['--unknown']), /Unsupported argument/)
  assert.throws(() => parseArguments(['--check', '--check']), /Unsupported argument/)
})
