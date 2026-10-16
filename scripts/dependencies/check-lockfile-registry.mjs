import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const ALLOWED_REGISTRY_ORIGIN = 'https://registry.npmjs.org'

export class LockfileRegistryPolicyError extends Error {
  constructor(violations) {
    const details = violations
      .map(
        ({ packagePath, host }) =>
          `- package=${JSON.stringify(packagePath)} host=${JSON.stringify(host)}`,
      )
      .join('\n')
    super(`Lockfile registry policy failed.\n${details}`)
    this.name = 'LockfileRegistryPolicyError'
  }
}

export function inspectLockfileRegistry(lockfile) {
  const packageEntries = Object.entries(lockfile?.packages ?? {})
  const violations = []
  let httpResolvedCount = 0

  for (const [packagePath, packageMetadata] of packageEntries) {
    const resolved = packageMetadata?.resolved
    if (typeof resolved !== 'string') {
      continue
    }

    let parsed
    try {
      parsed = new URL(resolved)
    } catch {
      continue
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      continue
    }

    httpResolvedCount += 1
    const isAllowed =
      parsed.origin === ALLOWED_REGISTRY_ORIGIN &&
      parsed.username === '' &&
      parsed.password === ''
    if (!isAllowed) {
      violations.push({ packagePath, host: parsed.host })
    }
  }

  return {
    packageCount: packageEntries.length,
    httpResolvedCount,
    violations,
  }
}

export function assertLockfileRegistry(lockfile) {
  const result = inspectLockfileRegistry(lockfile)
  if (result.violations.length > 0) {
    throw new LockfileRegistryPolicyError(result.violations)
  }
  return result
}

async function run() {
  if (process.argv.length > 2) {
    throw new Error('Unsupported arguments.')
  }

  const lockfilePath = resolve(process.cwd(), 'package-lock.json')
  const lockfile = JSON.parse(await readFile(lockfilePath, 'utf8'))
  const result = assertLockfileRegistry(lockfile)
  console.log(
    `[deps:registry] PASS: ${result.httpResolvedCount} HTTP(S) package sources use the canonical registry.`,
  )
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isMain) {
  run().catch((error) => {
    if (error instanceof LockfileRegistryPolicyError) {
      console.error(error.message)
    } else {
      console.error('[deps:registry] Unable to validate package-lock.json.')
    }
    process.exitCode = 1
  })
}
