import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import {
  ALLOWED_REGISTRY_ORIGIN,
  assertLockfileRegistry,
  inspectLockfileRegistry,
} from './check-lockfile-registry.mjs'

const execFileAsync = promisify(execFile)
const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), 'check-lockfile-registry.mjs')

function lockfileWith(packages) {
  return {
    name: 'registry-policy-fixture',
    lockfileVersion: 3,
    packages,
  }
}

test('allows missing resolved values and non-HTTP package sources', () => {
  const result = inspectLockfileRegistry(
    lockfileWith({
      '': {},
      'node_modules/file': { resolved: 'file:../file-package' },
      'node_modules/git': { resolved: 'git+https://github.com/example/package.git' },
      'node_modules/workspace': { resolved: 'workspace:*' },
      'node_modules/local': { resolved: '../local-package.tgz' },
      'node_modules/malformed': { resolved: 'https://[not-a-valid-url' },
      'node_modules/npm': {
        resolved: 'https://registry.npmjs.org/npm/-/npm-10.8.2.tgz',
      },
    }),
  )

  assert.deepEqual(result, {
    packageCount: 7,
    httpResolvedCount: 1,
    violations: [],
  })
  assert.equal(ALLOWED_REGISTRY_ORIGIN, 'https://registry.npmjs.org')
})

test('checks only package entries and accepts the canonical npm registry origin', () => {
  const lockfile = lockfileWith({
    'node_modules/npm': {
      resolved: 'https://registry.npmjs.org/npm/-/npm-10.8.2.tgz?cache=1#integrity',
    },
  })
  lockfile.dependencies = {
    ignoredLegacyEntry: {
      resolved: 'https://registry.npmmirror.com/ignored/-/ignored-1.0.0.tgz',
    },
  }

  assert.doesNotThrow(() => assertLockfileRegistry(lockfile))
})

test('rejects every parseable HTTP(S) source outside the exact allowed origin', () => {
  const lockfile = lockfileWith({
    'node_modules/mirror': {
      resolved: 'https://registry.npmmirror.com/mirror/-/mirror-1.0.0.tgz',
    },
    'node_modules/http': {
      resolved: 'http://registry.npmjs.org/http/-/http-1.0.0.tgz',
    },
    'node_modules/credentials': {
      resolved: 'https://alice:super-secret@registry.npmjs.org/private/-/private-1.0.0.tgz',
    },
    'node_modules/port': {
      resolved: 'https://registry.npmjs.org:4443/port/-/port-1.0.0.tgz',
    },
  })

  assert.throws(
    () => assertLockfileRegistry(lockfile),
    (error) => {
      assert.equal(error.name, 'LockfileRegistryPolicyError')
      assert.match(error.message, /package="node_modules\/mirror" host="registry\.npmmirror\.com"/)
      assert.match(error.message, /package="node_modules\/http" host="registry\.npmjs\.org"/)
      assert.match(error.message, /package="node_modules\/credentials" host="registry\.npmjs\.org"/)
      assert.match(
        error.message,
        /package="node_modules\/port" host="registry\.npmjs\.org:4443"/,
      )
      assert.doesNotMatch(error.message, /alice|super-secret|\.tgz|https?:\/\//)
      return true
    },
  )
})

test('CLI failure output contains only the package path and host from a rejected URL', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oasis-lockfile-registry-'))
  try {
    const lockfile = lockfileWith({
      'node_modules/private': {
        resolved: 'https://alice:super-secret@mirror.example/private/-/private-1.0.0.tgz?token=url-token',
      },
    })
    await writeFile(join(directory, 'package-lock.json'), `${JSON.stringify(lockfile, null, 2)}\n`)

    await assert.rejects(
      () =>
        execFileAsync(process.execPath, [scriptPath], {
          cwd: directory,
          env: { ...process.env, REGISTRY_TEST_SECRET: 'environment-secret' },
        }),
      (error) => {
        assert.equal(error.code, 1)
        assert.equal(error.stdout, '')
        assert.match(error.stderr, /package="node_modules\/private" host="mirror\.example"/)
        assert.doesNotMatch(
          error.stderr,
          /alice|super-secret|url-token|environment-secret|private-1\.0\.0\.tgz|https?:\/\//,
        )
        return true
      },
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
