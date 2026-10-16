import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from '@jest/globals'

const SOURCE_ROOT = path.join(process.cwd(), 'src')

const isScannedFile = (fileName: string) =>
  (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) && !fileName.includes('.test.')

const findOpeningTagEnd = (source: string, startIndex: number) => {
  let quote = 0
  let braceDepth = 0

  for (let index = startIndex; index < source.length; index += 1) {
    const code = source.charCodeAt(index)
    const previousCode = source.charCodeAt(index - 1)

    if (quote) {
      if (code === quote && previousCode !== 92) {
        quote = 0
      }
      continue
    }

    if (code === 34 || code === 39 || code === 96) {
      quote = code
      continue
    }

    if (code === 123) {
      braceDepth += 1
      continue
    }

    if (code === 125) {
      braceDepth = Math.max(0, braceDepth - 1)
      continue
    }

    if (code === 62 && braceDepth === 0) {
      return index
    }
  }

  return -1
}

const findButtonsWithoutType = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<button\b/g)) {
    const tagEnd = findOpeningTagEnd(source, match.index)
    const openingTag = source.slice(match.index, tagEnd + 1)

    if (tagEnd < 0 || !openingTag.includes('type=')) {
      const line = source.slice(0, match.index).split('\n').length
      findings.push(`${path.relative(process.cwd(), filePath)}:${line}`)
    }
  }

  return findings
}

const collectScannedFiles = (directory: string): string[] =>
  fs.readdirSync(directory).flatMap((name) => {
    const filePath = path.join(directory, name)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      return collectScannedFiles(filePath)
    }

    return isScannedFile(name) ? [filePath] : []
  })

describe('button type safety', () => {
  test('all production buttons declare an explicit type', () => {
    const findings = collectScannedFiles(SOURCE_ROOT).flatMap(findButtonsWithoutType)

    expect(findings).toEqual([])
  })
})
