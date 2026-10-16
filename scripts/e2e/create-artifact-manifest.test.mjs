import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

import {
  checkArtifactManifest,
  createArtifactManifest,
} from './create-artifact-manifest.mjs'

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'oasis-e2e-manifest-'))
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function seedEvidenceRoot(root) {
  await mkdir(resolve(root, 'html-report'), { recursive: true })
  await mkdir(resolve(root, 'test-results', 'nested'), { recursive: true })
  await writeFile(resolve(root, 'html-report', 'index.html'), '<html>report</html>')
  await writeFile(resolve(root, 'test-results', 'nested', 'trace.zip'), 'trace-bytes')
}

test('writes a sorted SHA-256 manifest and excludes the manifest itself', async () => {
  await withTemporaryDirectory(async (root) => {
    await seedEvidenceRoot(root)
    const manifestPath = await createArtifactManifest({ root })
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

    assert.deepEqual(
      manifest.files.map((entry) => entry.path),
      ['html-report/index.html', 'test-results/nested/trace.zip'],
    )
    assert.deepEqual(manifest.files[0], {
      path: 'html-report/index.html',
      size: Buffer.byteLength('<html>report</html>'),
      sha256: createHash('sha256').update('<html>report</html>').digest('hex'),
    })
    assert.equal(manifest.files.some((entry) => entry.path === 'artifact-manifest.json'), false)
    assert.equal(await checkArtifactManifest({ root }), manifestPath)
    assert.equal(await createArtifactManifest({ root }), manifestPath)
  })
})

test('check mode is read-only and rejects artifact drift', async () => {
  await withTemporaryDirectory(async (root) => {
    await seedEvidenceRoot(root)
    const manifestPath = await createArtifactManifest({ root })
    const originalManifest = await readFile(manifestPath, 'utf8')

    await writeFile(resolve(root, 'test-results', 'nested', 'trace.zip'), 'changed-trace')
    await assert.rejects(() => checkArtifactManifest({ root }), /does not match/i)
    assert.equal(await readFile(manifestPath, 'utf8'), originalManifest)
  })
})

test('rejects empty roots and roots missing either required Playwright directory', async () => {
  await withTemporaryDirectory(async (root) => {
    await assert.rejects(() => createArtifactManifest({ root }), /html-report/i)

    await mkdir(resolve(root, 'html-report'))
    await writeFile(resolve(root, 'html-report', 'index.html'), 'report')
    await assert.rejects(() => createArtifactManifest({ root }), /test-results/i)

    await mkdir(resolve(root, 'test-results'))
    await rm(resolve(root, 'html-report'), { recursive: true })
    await assert.rejects(() => createArtifactManifest({ root }), /html-report/i)
  })
})
