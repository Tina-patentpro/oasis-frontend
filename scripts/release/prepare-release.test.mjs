import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CANONICAL_RELEASE_CHECKS,
  ReleaseCheckError,
  assertVersionChain,
  buildReleaseSection,
  calculateNextVersion,
  exitCodeForError,
  formatLocalDate,
  getReleaseChecks,
  parseReleaseArgs,
  runCheck,
  runChecks,
  runRelease,
  shouldWriteReleaseFiles,
  validateTargetVersion,
  updateChangelogContent,
  updatePackageJsonContent,
  updatePackageLockContent,
} from './prepare-release.mjs'

test('parseReleaseArgs accepts a patch bump and changelog text', () => {
  const result = parseReleaseArgs([
    '--bump',
    'patch',
    '--summary',
    '优化生成结果预览稳定性',
    '--fixed',
    '修复特殊内容显示异常',
  ])

  assert.deepEqual(result, {
    bump: 'patch',
    version: '',
    summary: '优化生成结果预览稳定性',
    added: [],
    changed: [],
    fixed: ['修复特殊内容显示异常'],
    notes: [],
    checkCurrent: false,
  })
})

test('parseReleaseArgs accepts current-version checks without release intent', () => {
  const result = parseReleaseArgs(['--check-current'])

  assert.deepEqual(result, {
    bump: '',
    version: '',
    summary: '',
    added: [],
    changed: [],
    fixed: [],
    notes: [],
    checkCurrent: true,
  })
})

test('parseReleaseArgs rejects legacy same-version release checks', () => {
  assert.throws(
    () => parseReleaseArgs(['--version', '1.0.1', '--allow-same-version']),
    /--allow-same-version 已停用/,
  )
})

test('parseReleaseArgs keeps current-version checks separate from release arguments', () => {
  assert.throws(
    () => parseReleaseArgs(['--check-current', '--bump', 'patch']),
    /--check-current 不能和发布版本参数一起使用/,
  )
})

test('shouldWriteReleaseFiles only allows writes for explicit releases', () => {
  assert.equal(shouldWriteReleaseFiles(parseReleaseArgs(['--check-current'])), false)
  assert.equal(shouldWriteReleaseFiles(parseReleaseArgs(['--bump', 'patch'])), true)
})

test('both release paths use the same canonical checks in the fixed order', () => {
  const expected = [
    'npm run scripts:test',
    'npm run test:ci',
    'npm run type-check',
    'npm run lint',
    'npm run api:validate:ci',
    'npm run api:drift:strict',
    'npm run api:docs:check',
    'npm run security:scan',
    'npm run deps:check',
    'npm run audit:prod:ci',
    'npm run audit:full:ci',
    'npm run changelog:check',
    'npm run build:verify',
    'npm run test:e2e:prebuilt',
  ]
  const currentCommands = getReleaseChecks(parseReleaseArgs(['--check-current'])).map(
    ([command, args]) => `${command} ${args.join(' ')}`,
  )
  const releaseCommands = getReleaseChecks(parseReleaseArgs(['--bump', 'patch'])).map(
    ([command, args]) => `${command} ${args.join(' ')}`,
  )

  assert.deepEqual(currentCommands, expected)
  assert.deepEqual(releaseCommands, expected)
  assert.equal(getReleaseChecks(parseReleaseArgs(['--check-current'])), CANONICAL_RELEASE_CHECKS)
  assert.equal(getReleaseChecks(parseReleaseArgs(['--bump', 'patch'])), CANONICAL_RELEASE_CHECKS)
  assert.equal(expected.some((command) => command.startsWith('npx ')), false)
  assert.equal(expected.filter((command) => command === 'npm run changelog:check').length, 1)
  assert.equal(expected.filter((command) => command === 'npm run build:verify').length, 1)
  assert.equal(expected.filter((command) => command === 'npm run test:e2e:prebuilt').length, 1)
})

test('version chain requires package, lockfile and both release surfaces to agree', () => {
  const valid = {
    packageJsonSource: '{"version":"1.0.5"}',
    packageLockSource: '{"version":"1.0.5","packages":{"":{"version":"1.0.5"}}}',
    changelogSource: '# 更新日志\n\n## [1.0.5]\n',
    releaseNotesSource: '# 版本更新\n\n## [1.0.5]\n',
  }

  assert.equal(assertVersionChain(valid), '1.0.5')
  assert.throws(
    () => assertVersionChain({ ...valid, releaseNotesSource: '# 版本更新\n\n## [1.0.4]\n' }),
    /Version chain mismatch/,
  )
})

test('release runner checks runtime before reading any version file', async () => {
  let reads = 0

  await assert.rejects(
    () =>
      runRelease({
        argv: ['--check-current'],
        assertRuntime: () => {
          throw new Error('runtime blocked')
        },
        readFileImpl: async () => {
          reads += 1
          return ''
        },
      }),
    /runtime blocked/,
  )
  assert.equal(reads, 0)
})

test('ordinary release adds only version writes and release-note sync before canonical checks', async () => {
  const files = new Map([
    ['package.json', '{"version":"1.0.5"}'],
    [
      'package-lock.json',
      '{"version":"1.0.5","packages":{"":{"version":"1.0.5"}}}',
    ],
    ['CHANGELOG.md', '# 更新日志\n\n## [1.0.5]\n'],
    ['release-notes.md', '# 版本更新\n\n## [1.0.5]\n'],
  ])
  const npmCliPath = 'C:/verified/npm-cli.js'
  const keyFor = (filePath) => {
    for (const key of files.keys()) {
      if (filePath.endsWith(key)) return key
    }
    throw new Error(`unexpected path: ${filePath}`)
  }
  const commands = []
  const receivedNpmCliPaths = []

  await runRelease({
    argv: ['--bump', 'patch'],
    assertRuntime: () => ({
      nodeVersion: '20.19.0',
      npmVersion: '10.8.2',
      npmCliPath,
    }),
    readFileImpl: async (filePath) => files.get(keyFor(filePath)),
    writeFileImpl: async (filePath, content) => {
      files.set(keyFor(filePath), content)
    },
    runCheckImpl: (check, options) => {
      const command = `${check[0]} ${check[1].join(' ')}`
      commands.push(command)
      receivedNpmCliPaths.push(options.npmCliPath)
      if (command === 'npm run changelog:sync') {
        files.set('release-notes.md', '# 版本更新\n\n## [1.0.6]\n')
      }
    },
  })

  const canonical = CANONICAL_RELEASE_CHECKS.map(
    ([command, args]) => `${command} ${args.join(' ')}`,
  )
  assert.deepEqual(commands, ['npm run changelog:sync', ...canonical])
  assert.deepEqual(receivedNpmCliPaths, commands.map(() => npmCliPath))
  assert.equal(JSON.parse(files.get('package.json')).version, '1.0.6')
  assert.equal(JSON.parse(files.get('package-lock.json')).packages[''].version, '1.0.6')
  assert.match(files.get('CHANGELOG.md'), /^# 更新日志\n\n## \[1\.0\.6\]/)
})

test('runCheck preserves integer child exit codes and the caller environment', () => {
  const env = { ...process.env, OASIS_E2E_OUTPUT_DIR: 'exact-evidence-root' }
  const npmCliPath = 'C:/verified/npm-cli.js'
  let receivedCommand
  let receivedArgs
  let receivedOptions
  const spawn = (command, args, options) => {
    receivedCommand = command
    receivedArgs = args
    receivedOptions = options
    return { status: 7, signal: null }
  }

  assert.throws(
    () =>
      runCheck(['npm', ['run', 'test:e2e:prebuilt']], {
        spawn,
        env,
        npmCliPath,
      }),
    (error) => {
      assert.ok(error instanceof ReleaseCheckError)
      assert.equal(error.exitCode, 7)
      return true
    },
  )
  assert.equal(receivedCommand, process.execPath)
  assert.deepEqual(receivedArgs, [npmCliPath, 'run', 'test:e2e:prebuilt'])
  assert.equal(receivedOptions.env, env)
})

test('signal or unavailable status falls back to exit code 1', () => {
  assert.throws(
    () =>
      runCheck(['npm', ['run', 'lint']], {
        npmCliPath: 'C:/verified/npm-cli.js',
        spawn: () => ({ status: null, signal: 'SIGTERM' }),
      }),
    (error) => {
      assert.equal(error.exitCode, 1)
      return true
    },
  )
  assert.equal(exitCodeForError(new ReleaseCheckError('failed', 7)), 7)
  assert.equal(exitCodeForError(new Error('failed')), 1)
})

test('runChecks stops immediately after the first failed child', () => {
  const visited = []
  const npmCliPath = 'C:/verified/npm-cli.js'
  assert.throws(
    () =>
      runChecks(CANONICAL_RELEASE_CHECKS.slice(0, 3), {
        npmCliPath,
        runCheckImpl: (check, options) => {
          assert.equal(options.npmCliPath, npmCliPath)
          visited.push(check[1][1])
          if (visited.length === 2) throw new ReleaseCheckError('failed', 9)
        },
      }),
    (error) => error.exitCode === 9,
  )
  assert.deepEqual(visited, ['scripts:test', 'test:ci'])
})

test('formatLocalDate uses local calendar date instead of UTC date', () => {
  const earlyMorningLocalDate = new Date(2026, 0, 1, 1, 0, 0)

  assert.equal(formatLocalDate(earlyMorningLocalDate), '2026-01-01')
})

test('calculateNextVersion bumps semantic versions', () => {
  assert.equal(calculateNextVersion('1.0.1', { bump: 'patch' }), '1.0.2')
  assert.equal(calculateNextVersion('1.0.1', { bump: 'minor' }), '1.1.0')
  assert.equal(calculateNextVersion('1.0.1', { bump: 'major' }), '2.0.0')
  assert.equal(calculateNextVersion('1.0.1', { version: '1.2.3' }), '1.2.3')
})

test('validateTargetVersion rejects downgrades', () => {
  assert.throws(
    () => validateTargetVersion('1.0.1', '1.0.0', { allowSameVersion: false }),
    /目标版本必须大于当前版本/,
  )
})

test('validateTargetVersion rejects same-version releases by default', () => {
  assert.throws(
    () => validateTargetVersion('1.0.1', '1.0.1'),
    /目标版本和当前版本相同/,
  )
})

test('updatePackageJsonContent updates only the root version', () => {
  const output = updatePackageJsonContent(
    JSON.stringify(
      {
        name: 'oasis-workspace',
        version: '1.0.1',
        scripts: {
          test: 'jest',
        },
      },
      null,
      2,
    ),
    '1.0.2',
  )

  const parsed = JSON.parse(output)
  assert.equal(parsed.version, '1.0.2')
  assert.equal(parsed.scripts.test, 'jest')
  assert.match(output, /\n$/)
})

test('updatePackageLockContent updates root lock versions', () => {
  const output = updatePackageLockContent(
    JSON.stringify(
      {
        name: 'oasis-workspace',
        version: '1.0.1',
        packages: {
          '': {
            name: 'oasis-workspace',
            version: '1.0.1',
          },
          'node_modules/example': {
            version: '9.9.9',
          },
        },
      },
      null,
      2,
    ),
    '1.0.2',
  )

  const parsed = JSON.parse(output)
  assert.equal(parsed.version, '1.0.2')
  assert.equal(parsed.packages[''].version, '1.0.2')
  assert.equal(parsed.packages['node_modules/example'].version, '9.9.9')
})

test('buildReleaseSection creates the standard user-facing changelog block', () => {
  const section = buildReleaseSection({
    version: '1.0.2',
    date: '2026-04-29',
    summary: '提升发布流程稳定性',
    fixed: ['修复版本号同步遗漏'],
  })

  assert.match(section, /## \[1\.0\.2\]/)
  assert.match(section, /`1\.0\.2` 提升发布流程稳定性/)
  assert.match(section, /### 修复/)
  assert.match(section, /- 修复版本号同步遗漏/)
  assert.match(section, /### 新增\n\n- 本版本无需要单独对外说明的新增项。/)
})

test('updateChangelogContent inserts a new release before older versions and updates date', () => {
  const source = `# 产品更新日志

这里记录每次版本发布给用户带来的新增、优化、修复与使用注意事项。

## [1.0.1]

### 本次重点

旧版本说明。

## 版本说明

说明文字。

**最后更新：** 2026-04-27
`

  const output = updateChangelogContent(source, {
    version: '1.0.2',
    date: '2026-04-29',
    summary: '提升发布流程稳定性',
    fixed: ['修复版本号同步遗漏'],
  })

  assert.match(output, /## \[1\.0\.2\][\s\S]*## \[1\.0\.1\]/)
  assert.match(output, /\*\*最后更新：\*\* 2026-04-29/)
})

test('updateChangelogContent does not duplicate an existing release section', () => {
  const source = `# 产品更新日志

## [1.0.2]

### 本次重点

已有说明。

## [1.0.1]

旧版本说明。

**最后更新：** 2026-04-27
`

  const output = updateChangelogContent(source, {
    version: '1.0.2',
    date: '2026-04-29',
    summary: '提升发布流程稳定性',
  })

  assert.equal((output.match(/## \[1\.0\.2\]/g) ?? []).length, 1)
  assert.match(output, /\*\*最后更新：\*\* 2026-04-29/)
})
