import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { checkBundleSize } from './check-bundle-size.mjs'

function createTempAssetsDir() {
  const root = mkdtempSync(join(tmpdir(), 'oasis-bundle-size-'))
  const assetsDir = join(root, 'dist', 'assets')
  mkdirSync(assetsDir, { recursive: true })
  return { root, assetsDir }
}

function writeAsset(assetsDir, filename, kib) {
  writeFileSync(join(assetsDir, filename), Buffer.alloc(kib * 1024))
}

function writeHealthyDiagramSplit(assetsDir) {
  writeAsset(assetsDir, 'diagram-vendor-a.js', 326)
  writeAsset(assetsDir, 'diagram-parser-b.js', 325)
  writeAsset(assetsDir, 'diagram-graph-core-c.js', 441)
  writeAsset(assetsDir, 'diagram-graph-layout-d.js', 202)
  writeAsset(assetsDir, 'diagram-d3-e.js', 106)
  writeAsset(assetsDir, 'diagram-utils-f.js', 100)
  writeAsset(assetsDir, 'WorkspaceApp-a.js', 389)
}

test('passes when diagram chunks stay split under the baseline', () => {
  const { root, assetsDir } = createTempAssetsDir()
  try {
    writeHealthyDiagramSplit(assetsDir)

    const result = checkBundleSize({ assetsDir })

    assert.equal(result.ok, true)
    assert.equal(result.failures.length, 0)
    assert.equal(result.diagramAssets.length, 6)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('fails when diagram-vendor exceeds its stricter baseline', () => {
  const { root, assetsDir } = createTempAssetsDir()
  try {
    writeHealthyDiagramSplit(assetsDir)
    writeAsset(assetsDir, 'diagram-vendor-oversized.js', 401)

    const result = checkBundleSize({ assetsDir })

    assert.equal(result.ok, false)
    assert.match(result.failures.join('\n'), /diagram-vendor-oversized\.js/)
    assert.match(result.failures.join('\n'), /400\.00 KiB/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('allows the lazy Mermaid parser only within its dedicated ceiling', () => {
  const { root, assetsDir } = createTempAssetsDir()
  try {
    writeHealthyDiagramSplit(assetsDir)
    writeAsset(assetsDir, 'diagram-parser-vendor-secure.js', 700)

    const result = checkBundleSize({ assetsDir })

    assert.equal(result.ok, true)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('fails when the lazy Mermaid parser exceeds its dedicated ceiling', () => {
  const { root, assetsDir } = createTempAssetsDir()
  try {
    writeHealthyDiagramSplit(assetsDir)
    writeAsset(assetsDir, 'diagram-parser-vendor-oversized.js', 701)

    const result = checkBundleSize({ assetsDir })

    assert.equal(result.ok, false)
    assert.match(result.failures.join('\n'), /diagram-parser-vendor-oversized\.js/)
    assert.match(result.failures.join('\n'), /700\.00 KiB/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('keeps the original ceiling for non-parser diagram chunks', () => {
  const { root, assetsDir } = createTempAssetsDir()
  try {
    writeHealthyDiagramSplit(assetsDir)
    writeAsset(assetsDir, 'diagram-graph-core-oversized.js', 601)

    const result = checkBundleSize({ assetsDir })

    assert.equal(result.ok, false)
    assert.match(result.failures.join('\n'), /diagram-graph-core-oversized\.js/)
    assert.match(result.failures.join('\n'), /600\.00 KiB/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('fails when Mermaid generated chunks outside the diagram prefix exceed the baseline', () => {
  const { root, assetsDir } = createTempAssetsDir()
  try {
    writeHealthyDiagramSplit(assetsDir)
    writeAsset(assetsDir, 'flowDiagram-oversized.js', 601)
    writeAsset(assetsDir, 'sequenceDiagram-healthy.js', 100)

    const result = checkBundleSize({ assetsDir })

    assert.equal(result.ok, false)
    assert.match(result.failures.join('\n'), /flowDiagram-oversized\.js/)
    assert.match(result.failures.join('\n'), /600\.00 KiB/)
    assert.equal(
      result.diagramAssets.some((asset) => asset.filename === 'sequenceDiagram-healthy.js'),
      true,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('fails when diagram chunks collapse back into too few files', () => {
  const { root, assetsDir } = createTempAssetsDir()
  try {
    writeAsset(assetsDir, 'diagram-vendor-a.js', 326)

    const result = checkBundleSize({ assetsDir })

    assert.equal(result.ok, false)
    assert.match(result.failures.join('\n'), /Expected at least 6 diagram chunks/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('fails with a clear message when dist assets are missing', () => {
  const missingAssetsDir = join(tmpdir(), 'oasis-missing-assets-dir')

  assert.throws(
    () => checkBundleSize({ assetsDir: missingAssetsDir }),
    /Build assets directory not found/,
  )
})
