import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_ASSETS_DIR = 'dist/assets'
const LEGACY_KATEX_FONT_PATTERN = /^KaTeX_.+\.(?:ttf|woff)$/i
const MODERN_KATEX_FONT_PATTERN = /^KaTeX_.+\.woff2$/i

export function stripKatexLegacyFontFormats({
  assetsDir = resolve(process.cwd(), DEFAULT_ASSETS_DIR),
  output = console,
} = {}) {
  const resolvedAssetsDir = resolve(assetsDir)

  if (!existsSync(resolvedAssetsDir) || !statSync(resolvedAssetsDir).isDirectory()) {
    output.warn?.(
      `[strip-katex-fonts] assets directory not found, skipped: ${resolvedAssetsDir}`,
    )
    return { assetsDir: resolvedAssetsDir, removed: [], kept: [] }
  }

  const removed = []
  const kept = []

  for (const filename of readdirSync(resolvedAssetsDir)) {
    if (LEGACY_KATEX_FONT_PATTERN.test(filename)) {
      rmSync(resolve(resolvedAssetsDir, filename), { force: true })
      removed.push(filename)
      continue
    }

    if (MODERN_KATEX_FONT_PATTERN.test(filename)) {
      kept.push(filename)
    }
  }

  output.log?.(
    `[strip-katex-fonts] removed ${removed.length} legacy KaTeX font files; ` +
      `kept ${kept.length} woff2 files.`,
  )

  return { assetsDir: resolvedAssetsDir, removed, kept }
}

function runCli() {
  stripKatexLegacyFontFormats()
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  runCli()
}
