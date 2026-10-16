import { readFileSync } from 'node:fs'

const files = [
  'src/components/workspace/InputSection.tsx',
  'src/components/workspace/OutputSection.tsx',
  'src/components/workspace/left-sidebar/LeftSidebar.tsx',
  'src/components/error-boundaries/AsyncBoundary.tsx',
  'src/index.css',
]

const forbiddenPattern = /emerald-|#059669|#10b981/g
const violations: string[] = []

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  const matches = content.match(forbiddenPattern)
  if (matches && matches.length > 0) {
    violations.push(`${file}: ${[...new Set(matches)].join(', ')}`)
  }
}

if (violations.length > 0) {
  throw new Error(`theme token validation failed:\n${violations.join('\n')}`)
}

process.stdout.write('theme token validation passed\n')
