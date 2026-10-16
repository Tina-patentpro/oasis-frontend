#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const DEFAULT_EVIDENCE_ROOT = 'output/playwright'

export function resolveEvidenceRoot({ cwd = process.cwd(), env = process.env } = {}) {
  return path.resolve(cwd, env.OASIS_E2E_OUTPUT_DIR ?? DEFAULT_EVIDENCE_ROOT)
}

export async function prepareEvidenceRoot(options = {}) {
  const { env = process.env } = options
  const root = resolveEvidenceRoot(options)

  if (env.OASIS_E2E_REQUIRE_FRESH_ROOT === '1') {
    try {
      await mkdir(root)
    } catch (error) {
      if (error?.code === 'EEXIST') {
        throw new Error(`Evidence root already exists: ${root}`)
      }
      throw error
    }
  } else {
    await mkdir(root, { recursive: true })
  }

  return root
}

async function main() {
  const root = await prepareEvidenceRoot()
  console.log(`E2E evidence root ready: ${root}`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Failed to prepare E2E evidence root.')
    process.exitCode = 1
  })
}
