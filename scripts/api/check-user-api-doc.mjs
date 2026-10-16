#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import YAML from 'yaml'

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
const STATUS_KEYS = [
  'current',
  'legacy',
  'legacy / OpenAPI gap',
  'deferred',
  'target-state overlay',
]

function stripCode(value) {
  return value.trim().replace(/^`|`$/g, '')
}

function splitTableRow(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return []
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function operationKey(method, path) {
  return `${method.toUpperCase()} ${normalizeOperationPath(path)}`
}

function classifyAuthText(text) {
  const values = new Set()
  if (/无需认证/.test(text)) values.add('none')
  if (/未显式声明/.test(text)) values.add('unspecified')
  if (/Bearer|✅/.test(text)) values.add('bearer')
  return values
}

function classifySecurity(security) {
  if (security === undefined) return 'unspecified'
  if (!Array.isArray(security) || security.length === 0) return 'none'
  return security.some((requirement) => Object.keys(requirement ?? {}).length > 0)
    ? 'bearer'
    : 'none'
}

function statusBucket(status) {
  if (status.includes('legacy / OpenAPI gap')) return 'legacy / OpenAPI gap'
  if (status.startsWith('current')) return 'current'
  if (status.startsWith('legacy')) return 'legacy'
  if (status.startsWith('deferred')) return 'deferred'
  return null
}

function extractSources(cell) {
  return [...cell.matchAll(/`((?:docs\/api|src)\/[^`]+)`/g)].map((match) => match[1])
}

export function normalizeOperationPath(path) {
  const withoutQuery = path.trim().split('?')[0]
  const withPrefix =
    withoutQuery.startsWith('/api/') || withoutQuery === '/api'
      ? withoutQuery
      : `/api${withoutQuery.startsWith('/') ? '' : '/'}${withoutQuery}`
  return withPrefix
    .replace(/\/+/g, '/')
    .replace(/\{[^}]+\}/g, '{}')
    .replace(/\/$/, '')
}

export function findInvalidJsonFences(markdown) {
  const issues = []
  const lines = markdown.split(/\r?\n/)
  let fenceStart = null
  let buffer = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (fenceStart === null && /^```json\s*$/.test(line)) {
      fenceStart = index + 1
      buffer = []
      continue
    }
    if (fenceStart !== null && /^```\s*$/.test(line)) {
      try {
        JSON.parse(buffer.join('\n'))
      } catch (error) {
        issues.push({
          code: 'invalid-json-fence',
          line: fenceStart,
          message: `JSON 示例无法解析：${error.message}`,
        })
      }
      fenceStart = null
      buffer = []
      continue
    }
    if (fenceStart !== null) buffer.push(line)
  }

  if (fenceStart !== null) {
    issues.push({
      code: 'unclosed-json-fence',
      line: fenceStart,
      message: 'JSON 示例代码块未闭合',
    })
  }

  return issues
}

function parseStatusCounts(lines) {
  const start = lines.findIndex((line) => line.trim() === '## 接口状态')
  const end = lines.findIndex((line, index) => index > start && line.trim() === '## 完整接口总览')
  const counts = new Map()
  if (start < 0 || end < 0) return counts

  for (let index = start + 1; index < end; index += 1) {
    const cells = splitTableRow(lines[index])
    if (cells.length !== 4 || isSeparatorRow(cells)) continue
    const status = stripCode(cells[0])
    if (!STATUS_KEYS.includes(status)) continue
    const count = Number.parseInt(cells[1], 10)
    if (Number.isInteger(count)) counts.set(status, count)
  }
  return counts
}

function parseInventory(lines) {
  const start = lines.findIndex((line) => line.trim() === '## 完整接口总览')
  const end = lines.findIndex(
    (line, index) => index > start && line.trim() === '## 现网兼容详细说明',
  )
  const rows = []
  const groups = new Map()
  let currentGroup = null

  if (start < 0 || end < 0) return { rows, groups }

  for (let index = start + 1; index < end; index += 1) {
    const groupMatch = lines[index].match(/^###\s+([A-R])\.\s+(.+)$/)
    if (groupMatch) {
      currentGroup = groupMatch[1]
      groups.set(currentGroup, { line: index + 1, declared: null, actual: 0 })
      continue
    }

    if (currentGroup) {
      const countMatch = lines[index].match(/（(\d+)\s*个唯一接口）/)
      if (countMatch && groups.get(currentGroup).declared === null) {
        groups.get(currentGroup).declared = Number.parseInt(countMatch[1], 10)
      }
    }

    const cells = splitTableRow(lines[index])
    if (cells.length !== 7 || isSeparatorRow(cells)) continue
    const method = stripCode(cells[1]).toUpperCase()
    const path = stripCode(cells[2])
    if (!HTTP_METHODS.has(method) || !path.startsWith('/')) continue

    const row = {
      line: index + 1,
      group: currentGroup,
      status: stripCode(cells[0]),
      method,
      path,
      auth: cells[4],
      operationIdCell: cells[5],
      sourceCell: cells[6],
      sources: extractSources(cells[6]),
    }
    rows.push(row)
    if (currentGroup) groups.get(currentGroup).actual += 1
  }

  return { rows, groups }
}

function parseDetails(lines) {
  const start = lines.findIndex((line) => line.trim() === '## 现网兼容详细说明')
  if (start < 0) return []
  const headings = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^###\s+(\d+\.\d+)\s+(.+)$/)
    if (match) headings.push({ index, line: index + 1, id: match[1], title: match[2] })
  }

  return headings.map((heading, position) => {
    const end = position + 1 < headings.length ? headings[position + 1].index : lines.length
    const sectionLines = lines.slice(heading.index + 1, end)
    const operations = []
    let auth = null
    for (let offset = 0; offset < sectionLines.length; offset += 1) {
      const operationMatch = sectionLines[offset].match(
        /^\*\*接口\*\*:\s*`(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^`]+)`\s*$/,
      )
      if (operationMatch) {
        operations.push({
          method: operationMatch[1],
          path: operationMatch[2],
          line: heading.index + offset + 2,
        })
      }
      const authMatch = sectionLines[offset].match(/^\*\*需要认证\*\*:\s*(.+)$/)
      if (authMatch) auth = { text: authMatch[1], line: heading.index + offset + 2 }
    }
    return { ...heading, operations, auth }
  })
}

export function auditUserApiDoc(markdown, options = {}) {
  const lines = markdown.split(/\r?\n/)
  const issues = findInvalidJsonFences(markdown)
  const { rows, groups } = parseInventory(lines)
  const details = parseDetails(lines)
  const statusCounts = parseStatusCounts(lines)
  const specOperations = options.specOperations ?? []
  const existingSources = options.existingSources
  const specByKeyAndFile = new Map()

  for (const operation of specOperations) {
    const key = `${operationKey(operation.method, operation.path)}|${operation.file.replaceAll('\\', '/')}`
    const values = specByKeyAndFile.get(key) ?? []
    values.push(operation)
    specByKeyAndFile.set(key, values)
  }

  for (const [group, data] of groups) {
    if (data.declared === null) {
      issues.push({
        code: 'missing-group-count',
        line: data.line,
        message: `${group} 组未声明唯一接口数量`,
      })
    } else if (data.declared !== data.actual) {
      issues.push({
        code: 'group-count-mismatch',
        line: data.line,
        message: `${group} 组声明 ${data.declared} 个接口，实际表格为 ${data.actual} 个`,
      })
    }
  }

  const seenInventory = new Map()
  for (const row of rows) {
    const key = operationKey(row.method, row.path)
    if (seenInventory.has(key)) {
      issues.push({
        code: 'duplicate-inventory-operation',
        line: row.line,
        message: `${key} 与第 ${seenInventory.get(key)} 行重复`,
      })
    } else {
      seenInventory.set(key, row.line)
    }

    if (row.sources.length === 0) {
      issues.push({
        code: 'missing-source-reference',
        line: row.line,
        message: `${key} 未声明来源文件`,
      })
    }

    for (const source of row.sources) {
      if (existingSources && !existingSources.has(source)) {
        issues.push({
          code: 'missing-source-file',
          line: row.line,
          message: `${key} 的来源文件不存在：${source}`,
        })
        continue
      }
      if (!source.startsWith('docs/api/')) continue

      const matches = specByKeyAndFile.get(`${key}|${source}`) ?? []
      if (matches.length === 0) {
        issues.push({
          code: 'source-operation-mismatch',
          line: row.line,
          message: `${source} 中未找到 ${key}`,
        })
        continue
      }
      for (const operation of matches) {
        if (operation.operationId && !row.operationIdCell.includes(operation.operationId)) {
          issues.push({
            code: 'operation-id-mismatch',
            line: row.line,
            message: `${key} 未引用 ${source} 的 operationId ${operation.operationId}`,
          })
        }
        if (!classifyAuthText(row.auth).has(operation.auth)) {
          issues.push({
            code: 'auth-mismatch',
            line: row.line,
            message: `${key} 的认证说明与 ${source} 不一致（应包含 ${operation.auth}）`,
          })
        }
      }
    }
  }

  const actualStatusCounts = new Map(STATUS_KEYS.map((status) => [status, 0]))
  for (const row of rows) {
    const bucket = statusBucket(row.status)
    if (bucket) actualStatusCounts.set(bucket, actualStatusCounts.get(bucket) + 1)
    if (row.status.includes('target-state overlay')) {
      actualStatusCounts.set(
        'target-state overlay',
        actualStatusCounts.get('target-state overlay') + 1,
      )
    }
  }
  for (const status of STATUS_KEYS) {
    const declared = statusCounts.get(status)
    const actual = actualStatusCounts.get(status)
    if (declared === undefined) {
      issues.push({ code: 'missing-status-count', line: 1, message: `状态 ${status} 未声明数量` })
    } else if (declared !== actual) {
      issues.push({
        code: 'status-count-mismatch',
        line: 1,
        message: `状态 ${status} 声明 ${declared} 个，实际表格为 ${actual} 个`,
      })
    }
  }

  for (const detail of details) {
    if (detail.operations.length !== 1) {
      issues.push({
        code: 'detail-operation-count',
        line: detail.line,
        message: `${detail.id} 应且仅应声明一个接口，实际为 ${detail.operations.length} 个`,
      })
      continue
    }
    if (!detail.auth) {
      issues.push({
        code: 'missing-detail-auth',
        line: detail.line,
        message: `${detail.id} 缺少“需要认证”说明`,
      })
    }

    const operation = detail.operations[0]
    const key = operationKey(operation.method, operation.path)
    const inventoryRow = rows.find((row) => operationKey(row.method, row.path) === key)
    if (!inventoryRow) {
      issues.push({
        code: 'detail-missing-from-inventory',
        line: operation.line,
        message: `${detail.id} 的 ${key} 未出现在完整接口总览`,
      })
    } else if (detail.auth) {
      const inventoryAuth = classifyAuthText(inventoryRow.auth)
      const detailAuth = classifyAuthText(detail.auth.text)
      const overlaps = [...detailAuth].some((value) => inventoryAuth.has(value))
      if (inventoryAuth.size > 0 && detailAuth.size > 0 && !overlaps) {
        issues.push({
          code: 'detail-auth-mismatch',
          line: detail.auth.line,
          message: `${detail.id} 的认证说明与总览 ${key} 不一致`,
        })
      }
    }
  }

  return {
    issues,
    stats: {
      inventoryOperations: rows.length,
      detailOperations: details.reduce((total, detail) => total + detail.operations.length, 0),
      jsonFences: (markdown.match(/^```json\s*$/gm) ?? []).length,
    },
  }
}

export async function loadSpecOperations(repoRoot) {
  const apiRoot = resolve(repoRoot, 'docs', 'api')
  const files = (await readdir(apiRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => entry.name)
    .sort()
  const operations = []

  for (const file of files) {
    const relativeFile = `docs/api/${file}`
    const spec = YAML.parse(await readFile(resolve(apiRoot, file), 'utf8'))
    for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
      for (const [method, operation] of Object.entries(pathItem ?? {})) {
        const normalizedMethod = method.toUpperCase()
        if (!HTTP_METHODS.has(normalizedMethod)) continue
        operations.push({
          method: normalizedMethod,
          path,
          file: relativeFile,
          operationId: operation?.operationId,
          auth: classifySecurity(
            Object.prototype.hasOwnProperty.call(operation ?? {}, 'security')
              ? operation.security
              : spec.security,
          ),
        })
      }
    }
  }

  return operations
}

async function collectExistingSources(markdown, repoRoot) {
  const sources = new Set(
    [...markdown.matchAll(/`((?:docs\/api|src)\/[^`]+)`/g)].map((match) => match[1]),
  )
  const existing = new Set()
  for (const source of sources) {
    try {
      await access(resolve(repoRoot, source))
      existing.add(source)
    } catch {
      // Missing sources are reported by auditUserApiDoc.
    }
  }
  return existing
}

async function main() {
  const scriptPath = fileURLToPath(import.meta.url)
  const repoRoot = resolve(dirname(scriptPath), '..', '..')
  const documentPath = resolve(repoRoot, 'API接口文档-用户端.md')
  const markdown = await readFile(documentPath, 'utf8')
  const [specOperations, existingSources] = await Promise.all([
    loadSpecOperations(repoRoot),
    collectExistingSources(markdown, repoRoot),
  ])
  const result = auditUserApiDoc(markdown, { specOperations, existingSources })

  if (result.issues.length > 0) {
    console.error(`[api:user-doc] FAIL (${result.issues.length} issues)`)
    for (const issue of result.issues) {
      console.error(`- L${issue.line} [${issue.code}] ${issue.message}`)
    }
    process.exitCode = 1
    return
  }

  console.log(
    `[api:user-doc] PASS inventory=${result.stats.inventoryOperations}, details=${result.stats.detailOperations}, json=${result.stats.jsonFences}`,
  )
}

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
if (isDirectRun) await main()
