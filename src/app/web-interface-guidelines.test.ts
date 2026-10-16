import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, test } from '@jest/globals'

function collectProductionTsxFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectProductionTsxFiles(absolutePath))
    } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
      files.push(absolutePath)
    }
  }
  return files
}

describe('Web Interface Guidelines regressions', () => {
  test('avoids transition-all and empty Suspense fallbacks in production UI', () => {
    const sourceRoot = join(process.cwd(), 'src')
    const violations = collectProductionTsxFiles(sourceRoot).flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      const issues: string[] = []
      if (source.includes('transition-all')) issues.push('transition-all')
      if (source.includes('fallback={null}')) issues.push('fallback={null}')
      if (/\p{Script=Han}[^\n]*\.\.\./u.test(source)) issues.push('Chinese UI copy uses ...')
      for (const imageTag of source.matchAll(/<img\b[\s\S]*?\/>/g)) {
        if (!/\bwidth=/.test(imageTag[0]) || !/\bheight=/.test(imageTag[0])) {
          issues.push('img missing explicit width/height')
        }
      }
      return issues.map((issue) => `${relative(process.cwd(), file)}: ${issue}`)
    })

    expect(violations).toEqual([])
  })

  test('lets users reduce Framer Motion animations through their system preference', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/ui/motion.tsx'), 'utf8')

    expect(source).toContain('reducedMotion="user"')
  })
})
