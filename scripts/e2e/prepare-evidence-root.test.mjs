import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

import { prepareEvidenceRoot, resolveEvidenceRoot } from './prepare-evidence-root.mjs'

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'oasis-e2e-root-'))
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('resolves relative and absolute evidence roots from the configured working directory', async () => {
  await withTemporaryDirectory(async (directory) => {
    assert.equal(
      resolveEvidenceRoot({
        cwd: directory,
        env: { OASIS_E2E_OUTPUT_DIR: 'output/custom-evidence' },
      }),
      resolve(directory, 'output/custom-evidence'),
    )

    const absoluteRoot = resolve(directory, 'absolute-evidence')
    assert.equal(
      resolveEvidenceRoot({
        cwd: resolve(directory, 'other-cwd'),
        env: { OASIS_E2E_OUTPUT_DIR: absoluteRoot },
      }),
      absoluteRoot,
    )
  })
})

test('creates a missing development evidence root and allows reuse', async () => {
  await withTemporaryDirectory(async (directory) => {
    const root = resolve(directory, 'output/playwright')
    const options = {
      cwd: directory,
      env: { OASIS_E2E_OUTPUT_DIR: 'output/playwright' },
    }

    assert.equal(await prepareEvidenceRoot(options), root)
    assert.equal(await prepareEvidenceRoot(options), root)
  })
})

test('fresh-root mode atomically creates a missing root and rejects an existing root', async () => {
  await withTemporaryDirectory(async (directory) => {
    const parent = resolve(directory, 'output')
    await mkdir(parent)
    const options = {
      cwd: directory,
      env: {
        OASIS_E2E_OUTPUT_DIR: 'output/fresh-evidence',
        OASIS_E2E_REQUIRE_FRESH_ROOT: '1',
      },
    }

    assert.equal(await prepareEvidenceRoot(options), resolve(parent, 'fresh-evidence'))
    await assert.rejects(() => prepareEvidenceRoot(options), /already exists/i)
  })
})
