import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const BYTES_PER_KIB = 1024

export const DEFAULT_BUNDLE_SIZE_LIMITS = {
  assetsDir: 'dist/assets',
  maxDiagramKib: 600,
  maxDiagramParserKib: 700,
  maxDiagramVendorKib: 400,
  minDiagramChunks: 6,
}

const MERMAID_GENERATED_CHUNK_PATTERNS = [
  /^(?:architecture|block|c4|class|er|flow|gantt|gitGraph|info|journey|kanban|mindmap|packet|pie|quadrant|radar|requirement|sankey|sequence|state|timeline|xychart)(?:Diagram)?(?:[-_.]|$)/i,
  /^flowchart(?:[-_.]|$)/i,
]

function toBytes(kib) {
  return kib * BYTES_PER_KIB
}

function formatKiB(bytes) {
  return `${(bytes / BYTES_PER_KIB).toFixed(2)} KiB`
}

function parsePositiveNumber(value, optionName) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive number, received: ${value}`)
  }
  return parsed
}

function parsePositiveInteger(value, optionName) {
  const parsed = parsePositiveNumber(value, optionName)
  if (!Number.isInteger(parsed)) {
    throw new Error(`${optionName} must be an integer, received: ${value}`)
  }
  return parsed
}

export function parseCliArgs(args, cwd = process.cwd()) {
  const options = { ...DEFAULT_BUNDLE_SIZE_LIMITS }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const nextValue = args[index + 1]

    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true }
    }

    if (!nextValue) {
      throw new Error(`Missing value for ${arg}`)
    }

    if (arg === '--assets-dir') {
      options.assetsDir = nextValue
      index += 1
      continue
    }

    if (arg === '--max-diagram-kib') {
      options.maxDiagramKib = parsePositiveNumber(nextValue, arg)
      index += 1
      continue
    }

    if (arg === '--max-diagram-parser-kib') {
      options.maxDiagramParserKib = parsePositiveNumber(nextValue, arg)
      index += 1
      continue
    }

    if (arg === '--max-diagram-vendor-kib') {
      options.maxDiagramVendorKib = parsePositiveNumber(nextValue, arg)
      index += 1
      continue
    }

    if (arg === '--min-diagram-chunks') {
      options.minDiagramChunks = parsePositiveInteger(nextValue, arg)
      index += 1
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return {
    ...options,
    assetsDir: resolve(cwd, options.assetsDir),
  }
}

function isDiagramAsset(filename) {
  return (
    /^diagram-.+\.js$/i.test(filename) ||
    MERMAID_GENERATED_CHUNK_PATTERNS.some((pattern) => pattern.test(filename))
  )
}

function isDiagramVendorAsset(filename) {
  return /^diagram-vendor-.+\.js$/i.test(filename)
}

function isDiagramParserAsset(filename) {
  return /^diagram-parser-vendor-.+\.js$/i.test(filename)
}

function readJavaScriptAssets(assetsDir) {
  if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) {
    throw new Error(
      `Build assets directory not found: ${assetsDir}. Run npm run build before npm run build:size-check.`,
    )
  }

  return readdirSync(assetsDir)
    .filter((filename) => filename.endsWith('.js'))
    .map((filename) => ({
      filename,
      size: statSync(resolve(assetsDir, filename)).size,
    }))
    .sort((left, right) => left.filename.localeCompare(right.filename))
}

export function checkBundleSize({
  assetsDir = resolve(process.cwd(), DEFAULT_BUNDLE_SIZE_LIMITS.assetsDir),
  maxDiagramKib = DEFAULT_BUNDLE_SIZE_LIMITS.maxDiagramKib,
  maxDiagramParserKib = DEFAULT_BUNDLE_SIZE_LIMITS.maxDiagramParserKib,
  maxDiagramVendorKib = DEFAULT_BUNDLE_SIZE_LIMITS.maxDiagramVendorKib,
  minDiagramChunks = DEFAULT_BUNDLE_SIZE_LIMITS.minDiagramChunks,
} = {}) {
  const resolvedAssetsDir = resolve(assetsDir)
  const allAssets = readJavaScriptAssets(resolvedAssetsDir)
  const diagramAssets = allAssets.filter((asset) => isDiagramAsset(asset.filename))
  const failures = []

  if (diagramAssets.length < minDiagramChunks) {
    failures.push(
      `Expected at least ${minDiagramChunks} diagram chunks, found ${diagramAssets.length}. ` +
        'This usually means Mermaid chunks were merged back into a large diagram-vendor bundle. ' +
        'Check vite.config.ts manualChunks.',
    )
  }

  for (const asset of diagramAssets) {
    let limitKib = maxDiagramKib
    if (isDiagramParserAsset(asset.filename)) {
      limitKib = maxDiagramParserKib
    } else if (isDiagramVendorAsset(asset.filename)) {
      limitKib = maxDiagramVendorKib
    }
    const limitBytes = toBytes(limitKib)

    if (asset.size > limitBytes) {
      failures.push(
        `${asset.filename} is ${formatKiB(asset.size)}, above the ${formatKiB(limitBytes)} limit. ` +
          'Check vite.config.ts manualChunks and keep Mermaid dependencies split.',
      )
    }
  }

  const largestDiagramAsset = diagramAssets.reduce(
    (largest, asset) => (asset.size > largest.size ? asset : largest),
    { filename: 'none', size: 0 },
  )

  return {
    ok: failures.length === 0,
    assetsDir: resolvedAssetsDir,
    failures,
    diagramAssets,
    limits: {
      maxDiagramKib,
      maxDiagramParserKib,
      maxDiagramVendorKib,
      minDiagramChunks,
    },
    largestDiagramAsset,
  }
}

function printHelp() {
  console.log(`Usage: node scripts/build/check-bundle-size.mjs [options]

Options:
  --assets-dir <path>                 Build assets directory. Default: dist/assets
  --max-diagram-kib <number>          Max size for any diagram/Mermaid generated chunk. Default: 600
  --max-diagram-parser-kib <number>   Max size for the lazy Mermaid parser chunk. Default: 700
  --max-diagram-vendor-kib <number>   Max size for diagram-vendor-*.js. Default: 400
  --min-diagram-chunks <integer>      Minimum diagram/Mermaid chunks. Default: 6
`)
}

export function printBundleSizeResult(result, output = console) {
  if (result.ok) {
    output.log(
      `Bundle size check passed: ${result.diagramAssets.length} diagram chunks; ` +
        `largest ${result.largestDiagramAsset.filename} ${formatKiB(result.largestDiagramAsset.size)}.`,
    )
    return
  }

  output.error('Bundle size check failed:')
  for (const failure of result.failures) {
    output.error(`- ${failure}`)
  }
}

async function runCli() {
  const options = parseCliArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const result = checkBundleSize(options)
  printBundleSizeResult(result)

  if (!result.ok) {
    process.exitCode = 1
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
