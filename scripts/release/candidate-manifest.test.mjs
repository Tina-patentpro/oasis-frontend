import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  buildCandidateManifest,
  compareCandidateManifests,
  parseArguments,
  parseIndexStageZ,
  parseNameStatusZ,
  readWorktreeBlob,
  writeCandidateManifest,
} from './candidate-manifest.mjs'

function runGit(repoRoot, args, { input } = {}) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', input })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

async function withGitRepository(run) {
  const repoRoot = await mkdtemp(path.join(tmpdir(), 'oasis-candidate-manifest-'))
  try {
    runGit(repoRoot, ['init', '--quiet'])
    runGit(repoRoot, ['config', 'user.email', 'candidate@example.invalid'])
    runGit(repoRoot, ['config', 'user.name', 'Candidate Test'])
    await writeFile(path.join(repoRoot, 'tracked.txt'), 'alpha\n')
    await writeFile(path.join(repoRoot, 'cached-only.txt'), 'cached-only\n')
    await writeFile(path.join(repoRoot, 'deleted.txt'), 'delete-only\n')
    await writeFile(path.join(repoRoot, 'old-name.txt'), 'rename-only\n')
    runGit(repoRoot, ['add', '.'])
    runGit(repoRoot, ['commit', '--quiet', '-m', 'baseline'])
    const baseline = runGit(repoRoot, ['rev-parse', 'HEAD'])
    await run({ repoRoot, baseline })
  } finally {
    await rm(repoRoot, { recursive: true, force: true })
  }
}

test('parses NUL-delimited tracked and renamed Git records', () => {
  const records = parseNameStatusZ(
    Buffer.from('M\0tracked.txt\0R096\0old.txt\0new.txt\0D\0deleted.txt\0'),
  )

  assert.deepEqual(records, [
    { status: 'M', path: 'tracked.txt' },
    { status: 'R096', previousPath: 'old.txt', path: 'new.txt' },
    { status: 'D', path: 'deleted.txt' },
  ])
})

test('parses only a supported stage-0 index record and rejects conflicts or gitlinks', () => {
  const oid = 'a'.repeat(40)
  assert.deepEqual(parseIndexStageZ(Buffer.from(`120000 ${oid} 0\tlink.txt\0`), 'link.txt'), {
    kind: 'symlink',
    mode: '120000',
    oid,
  })
  assert.throws(
    () =>
      parseIndexStageZ(
        Buffer.from(`100644 ${oid} 2\tconflict.txt\0`),
        'conflict.txt',
      ),
    /stage-0/,
  )
  assert.throws(
    () => parseIndexStageZ(Buffer.from(`160000 ${oid} 0\tvendor.txt\0`), 'vendor.txt'),
    /Unsupported index mode: 160000/,
  )
})

test('freezes index, tracked worktree and untracked layers with explicit rename detection', async () => {
  await withGitRepository(async ({ repoRoot, baseline }) => {
    await writeFile(path.join(repoRoot, 'tracked.txt'), 'index beta\n')
    runGit(repoRoot, ['add', 'tracked.txt'])
    runGit(repoRoot, ['update-index', '--chmod=+x', 'tracked.txt'])
    await writeFile(path.join(repoRoot, 'tracked.txt'), 'alpha\n')
    runGit(repoRoot, ['rm', '--cached', 'cached-only.txt'])
    await unlink(path.join(repoRoot, 'deleted.txt'))
    runGit(repoRoot, ['mv', 'old-name.txt', 'new-name.txt'])
    await writeFile(path.join(repoRoot, 'untracked-plan.md'), '# plan\n')
    const sharedOid = runGit(repoRoot, ['hash-object', '-w', '--stdin'], {
      input: 'shared-mode-bytes\n',
    })
    runGit(repoRoot, [
      'update-index',
      '--add',
      '--cacheinfo',
      `100644,${sharedOid},mode-file.txt`,
    ])
    runGit(repoRoot, [
      'update-index',
      '--add',
      '--cacheinfo',
      `120000,${sharedOid},mode-link.txt`,
    ])

    const gitCalls = []
    const manifest = await buildCandidateManifest({
      repoRoot,
      baseline,
      spawn: (command, args, options) => {
        gitCalls.push(args)
        return spawnSync(command, args, options)
      },
    })
    const entry = (layer, filePath) =>
      manifest.entries.find((candidate) => candidate.layer === layer && candidate.path === filePath)

    assert.equal(manifest.schemaVersion, 2)
    assert.deepEqual(entry('index', 'cached-only.txt'), {
      layer: 'index',
      status: 'D',
      path: 'cached-only.txt',
      kind: 'deleted',
      mode: null,
      bytes: 0,
      sha256: 'DELETED',
    })
    assert.match(entry('index', 'new-name.txt').status, /^R\d+$/)
    assert.equal(entry('index', 'new-name.txt').previousPath, 'old-name.txt')
    assert.equal(entry('index', 'tracked.txt').kind, 'file')
    assert.equal(entry('index', 'tracked.txt').mode, '100755')
    assert.equal(entry('index', 'mode-file.txt').kind, 'file')
    assert.equal(entry('index', 'mode-file.txt').mode, '100644')
    assert.equal(entry('index', 'mode-link.txt').kind, 'symlink')
    assert.equal(entry('index', 'mode-link.txt').mode, '120000')
    assert.equal(entry('index', 'mode-file.txt').sha256, entry('index', 'mode-link.txt').sha256)
    assert.deepEqual(entry('worktree', 'deleted.txt'), {
      layer: 'worktree',
      status: 'D',
      path: 'deleted.txt',
      kind: 'deleted',
      mode: null,
      bytes: 0,
      sha256: 'DELETED',
    })
    assert.equal(entry('untracked', 'cached-only.txt').status, '??')
    assert.equal(entry('untracked', 'untracked-plan.md').status, '??')
    assert.equal(entry('untracked', 'untracked-plan.md').kind, 'file')
    assert.equal(entry('untracked', 'untracked-plan.md').mode, '100644')

    const indexRaw = Buffer.from('index beta\n')
    const worktreeRaw = Buffer.from('alpha\n')
    assert.equal(entry('index', 'tracked.txt').bytes, indexRaw.byteLength)
    assert.equal(
      entry('index', 'tracked.txt').sha256,
      createHash('sha256').update(indexRaw).digest('hex'),
    )
    assert.equal(
      entry('worktree', 'tracked.txt').sha256,
      createHash('sha256').update(worktreeRaw).digest('hex'),
    )
    assert.notEqual(entry('index', 'tracked.txt').sha256, entry('worktree', 'tracked.txt').sha256)

    const diffCalls = gitCalls.filter((args) => args[0] === 'diff')
    assert.equal(diffCalls.length, 2)
    assert.ok(diffCalls.every((args) => args.includes('--find-renames')))
    assert.ok(diffCalls.some((args) => args.includes('--cached')))
    assert.ok(diffCalls.some((args) => !args.includes('--cached')))
    const stageCalls = gitCalls.filter(
      (args) => args[0] === 'ls-files' && args.includes('--stage'),
    )
    assert.ok(stageCalls.length > 0)
    assert.ok(
      stageCalls.every(
        (args) => args.includes('--stage') && args.includes('-z') && args.includes('--'),
      ),
    )
    const catFileCalls = gitCalls.filter((args) => args[0] === 'cat-file')
    assert.ok(catFileCalls.length > 0)
    assert.ok(catFileCalls.every((args) => /^[0-9a-f]{40,64}$/.test(args.at(-1))))
  })
})

test('worktree symlinks hash link text without following the target', async () => {
  let fileRead = false
  let readlinkOptions
  const rawLinkText = Buffer.from([0xff, 0x00, 0x61])
  const bytes = await readWorktreeBlob('ignored-link', {
    lstatImpl: async () => ({
      isSymbolicLink: () => true,
      isFile: () => false,
    }),
    readlinkImpl: async (_filePath, options) => {
      readlinkOptions = options
      return rawLinkText
    },
    readFileImpl: async () => {
      fileRead = true
      return Buffer.from('secret')
    },
  })

  assert.deepEqual(bytes, rawLinkText)
  assert.deepEqual(readlinkOptions, { encoding: 'buffer' })
  assert.equal(fileRead, false)
})

test('comparison permits only an exact allow-listed ledger path', () => {
  const ledger = 'reports/remediation-ledger.md'
  const before = {
    schemaVersion: 2,
    baseline: 'abc',
    entries: [
      {
        layer: 'index',
        status: 'M',
        path: ledger,
        kind: 'file',
        mode: '100644',
        bytes: 10,
        sha256: 'before-index',
      },
      {
        layer: 'worktree',
        status: 'M',
        path: ledger,
        kind: 'file',
        mode: '100644',
        bytes: 11,
        sha256: 'before-worktree',
      },
      {
        layer: 'worktree',
        status: 'M',
        path: 'src/app.ts',
        kind: 'file',
        mode: '100644',
        bytes: 20,
        sha256: 'stable',
      },
    ],
  }
  const ledgerOnly = {
    ...before,
    entries: [
      { ...before.entries[0], bytes: 12, sha256: 'after-index' },
      { ...before.entries[1], bytes: 13, sha256: 'after-worktree' },
      before.entries[2],
    ],
  }

  assert.throws(() => compareCandidateManifests(before, ledgerOnly), /Candidate changed/)
  assert.doesNotThrow(() =>
    compareCandidateManifests(before, ledgerOnly, { allowedPaths: [ledger] }),
  )

  const extraChange = {
    ...ledgerOnly,
    entries: [
      ledgerOnly.entries[0],
      ledgerOnly.entries[1],
      { ...before.entries[2], sha256: 'unexpected' },
    ],
  }
  assert.throws(
    () => compareCandidateManifests(before, extraChange, { allowedPaths: [ledger] }),
    /src\/app\.ts/,
  )

  const addedPath = {
    ...ledgerOnly,
    entries: [
      ...ledgerOnly.entries,
      {
        layer: 'untracked',
        status: '??',
        path: 'reports/unexpected.md',
        kind: 'file',
        mode: '100644',
        bytes: 1,
        sha256: 'added',
      },
    ],
  }
  assert.throws(
    () => compareCandidateManifests(before, addedPath, { allowedPaths: [ledger] }),
    /reports\/unexpected\.md/,
  )

  const deletedPath = {
    ...ledgerOnly,
    entries: [ledgerOnly.entries[0], ledgerOnly.entries[1]],
  }
  assert.throws(
    () => compareCandidateManifests(before, deletedPath, { allowedPaths: [ledger] }),
    /src\/app\.ts/,
  )
})

test('comparison rejects a hash change in every frozen layer', () => {
  for (const layer of ['index', 'worktree', 'untracked']) {
    const filePath = `evidence/${layer}.txt`
    const before = {
      schemaVersion: 2,
      baseline: 'abc',
      entries: [
        {
          layer,
          status: 'M',
          path: filePath,
          kind: 'file',
          mode: '100644',
          bytes: 1,
          sha256: 'before',
        },
      ],
    }
    const after = {
      ...before,
      entries: [{ ...before.entries[0], sha256: 'after' }],
    }

    assert.throws(() => compareCandidateManifests(before, after), new RegExp(filePath))
  }
})

test('comparison rejects file-kind and mode changes even when bytes and hash match', () => {
  const stable = {
    layer: 'index',
    status: 'M',
    path: 'assets/same-bytes',
    bytes: 8,
    sha256: 'same-hash',
  }
  const before = {
    schemaVersion: 2,
    baseline: 'abc',
    entries: [{ ...stable, kind: 'symlink', mode: '120000' }],
  }
  const after = {
    ...before,
    entries: [{ ...stable, kind: 'file', mode: '100644' }],
  }

  assert.throws(() => compareCandidateManifests(before, after), /assets\/same-bytes/)
})

test('CLI arguments keep generation and exact comparison modes separate', () => {
  assert.deepEqual(parseArguments(['--baseline', '481c943', '--output', 'out.json']), {
    mode: 'generate',
    baseline: '481c943',
    outputPath: 'out.json',
  })
  assert.deepEqual(
    parseArguments([
      '--compare',
      'before.json',
      'after.json',
      '--allow-change',
      'reports/remediation-ledger.md',
    ]),
    {
      mode: 'compare',
      beforePath: 'before.json',
      afterPath: 'after.json',
      allowedPaths: ['reports/remediation-ledger.md'],
    },
  )
  assert.throws(
    () => parseArguments(['--compare', 'before.json', 'after.json', '--baseline', 'abc']),
    /Unsupported candidate manifest argument/,
  )
})

test('manifest output uses exclusive creation and cannot overwrite frozen evidence', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'oasis-manifest-output-'))
  const outputPath = path.join(directory, 'candidate.json')
  const manifest = { schemaVersion: 2, baseline: 'abc', entries: [] }

  try {
    await writeCandidateManifest(outputPath, manifest)
    assert.deepEqual(JSON.parse(await readFile(outputPath, 'utf8')), manifest)
    await assert.rejects(() => writeCandidateManifest(outputPath, manifest), { code: 'EEXIST' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
