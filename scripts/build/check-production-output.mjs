#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const HASHED_ASSET_NAME = /-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/

export function extractMetaCsp(html) {
  const match = html.match(
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i,
  )
  if (!match) {
    throw new Error('Production index.html is missing the Content-Security-Policy meta tag.')
  }
  return match[1]
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)))
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }

  return files
}

export async function checkProductionOutput(distDirectory) {
  const resolvedDist = path.resolve(distDirectory)
  const indexPath = path.join(resolvedDist, 'index.html')
  const assetsDirectory = path.join(resolvedDist, 'assets')
  const html = await readFile(indexPath, 'utf8')
  const csp = extractMetaCsp(html)

  if (/localhost|127\.0\.0\.1/.test(csp)) {
    throw new Error('Production CSP contains a local development origin.')
  }
  if (!csp.includes("form-action 'self'")) {
    throw new Error("Production CSP is missing form-action 'self'.")
  }
  if (csp.includes('frame-ancestors')) {
    throw new Error('Meta CSP must not contain frame-ancestors; enforce it in HTTP headers.')
  }

  const distFiles = await listFiles(resolvedDist)
  const sourceMaps = distFiles.filter((filePath) => filePath.endsWith('.map'))
  if (sourceMaps.length > 0) {
    throw new Error(
      `Production output contains source maps: ${sourceMaps
        .map((filePath) => path.relative(resolvedDist, filePath))
        .join(', ')}`,
    )
  }

  const assetFiles = await listFiles(assetsDirectory)
  const unhashedAssets = assetFiles.filter(
    (filePath) => !HASHED_ASSET_NAME.test(path.basename(filePath)),
  )
  if (unhashedAssets.length > 0) {
    throw new Error(
      `Production assets without content hashes: ${unhashedAssets
        .map((filePath) => path.relative(resolvedDist, filePath))
        .join(', ')}`,
    )
  }

  return {
    csp,
    assetCount: assetFiles.length,
  }
}

async function main() {
  const distDirectory = process.argv[2] ?? 'dist'
  const result = await checkProductionOutput(distDirectory)
  console.log(
    `Production output check passed: ${result.assetCount} hashed assets; strict production CSP.`,
  )
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
