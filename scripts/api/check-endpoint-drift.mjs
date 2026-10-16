#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import YAML from 'yaml'

const __dirname = resolve(fileURLToPath(new URL('.', import.meta.url)))
const repoRoot = resolve(__dirname, '..', '..')

const SERVICES_DIR = resolve(repoRoot, 'src/api/services')
const SPEC_DIR = resolve(repoRoot, 'docs/api')
// 排除不包含 apiClient 调用的纯辅助文件；requests 文件必须保留在扫描范围内。
const SERVICE_SKIP_SUFFIX = /(normalizers|selectors|workflow-list|config|index)\.ts$/
const SPEC_SKIP_FILES = ['openapi-template.yaml']

const API_CLIENT_ENDPOINT_PATTERN =
  /apiClient\.(get|post|put|delete|patch|uploadFile)\s*(?:<[^>]+>)?\s*\(\s*(['"`])([\s\S]*?)\2/g
const DECLARED_ENDPOINTS_PATTERN =
  /defineApiEndpoints\(\s*(['"])(get|post|put|delete|patch)\1\s*,\s*\[([\s\S]*?)\]\s*as const\s*,?\s*(?:(true|false)\s*,?)?\s*\)/gi
const STRING_LITERAL_PATTERN = /(['"`])([^'"`]+)\1/g
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'])

/**
 * 动态收集所有 service 源文件（排除辅助文件和测试文件）。
 * v1 版本只硬编码了 auth、notification 两个文件，导致其余十几个 service
 * 的端点漂移完全不可见（A-4）。
 */
export async function resolveDefaultCodeFiles() {
  const entries = await readdir(SERVICES_DIR, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
    .filter((entry) => !SERVICE_SKIP_SUFFIX.test(entry.name))
    .map((entry) => `src/api/services/${entry.name}`)
    .sort()
}

/**
 * 动态收集所有 API 契约文件（排除模板文件）。
 * v1 版本只扫描单份 users-auth.yaml，遗漏了 billing/projects 等其他契约。
 */
export async function resolveDefaultSpecFiles() {
  const entries = await readdir(SPEC_DIR, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .filter((entry) => !SPEC_SKIP_FILES.includes(entry.name))
    .map((entry) => `docs/api/${entry.name}`)
    .sort()
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
}

export function normalizeCodeEndpoint(endpoint) {
  if (typeof endpoint !== 'string') {
    return null
  }

  const trimmed = endpoint.trim()
  if (!trimmed.startsWith('/')) {
    return null
  }

  const withoutQuery = trimmed.split('?')[0]
  const normalizedParams = withoutQuery.replace(/\$\{[^}]+\}/g, '{param}')
  const withApiPrefix = normalizedParams.startsWith('/api/')
    ? normalizedParams
    : `/api${normalizedParams}`

  return withApiPrefix.replace(/\/{2,}/g, '/')
}

export function normalizeSpecPath(pathValue) {
  if (typeof pathValue !== 'string' || !pathValue.startsWith('/')) {
    return null
  }
  return pathValue.replace(/\{[^/}]+\}/g, '{param}').replace(/\/{2,}/g, '/')
}

export function extractApiClientEndpoints(sourceText) {
  return uniqueSorted(extractApiClientOperations(sourceText).map((operation) => operation.endpoint))
}

export function extractApiClientOperations(sourceText) {
  const operations = []

  for (const match of sourceText.matchAll(API_CLIENT_ENDPOINT_PATTERN)) {
    const normalized = normalizeCodeEndpoint(match[3])
    if (normalized) {
      operations.push({
        endpoint: normalized,
        method: match[1] === 'uploadFile' ? 'POST' : match[1].toUpperCase(),
      })
    }
  }

  for (const declaration of sourceText.matchAll(DECLARED_ENDPOINTS_PATTERN)) {
    const method = declaration[2].toUpperCase()
    const appendPathParam = declaration[4] === 'true'
    for (const literal of declaration[3].matchAll(STRING_LITERAL_PATTERN)) {
      const normalized = normalizeCodeEndpoint(literal[2])
      if (normalized) {
        operations.push({
          endpoint: appendPathParam ? `${normalized}/{param}` : normalized,
          method,
        })
      }
    }
  }

  return Array.from(
    new Map(operations.map((operation) => [`${operation.method} ${operation.endpoint}`, operation])).values(),
  ).sort(
    (a, b) =>
      a.endpoint.localeCompare(b.endpoint) ||
      a.method.localeCompare(b.method),
  )
}

export function findEndpointDrift({ codeEndpoints, specPaths }) {
  const codeSet = new Set(codeEndpoints.map(normalizeSpecPath).filter(Boolean))
  const specSet = new Set(specPaths.map(normalizeSpecPath).filter(Boolean))

  return {
    missingInSpec: uniqueSorted([...codeSet].filter((endpoint) => !specSet.has(endpoint))),
    unusedInCode: uniqueSorted([...specSet].filter((pathValue) => !codeSet.has(pathValue))),
  }
}

function isTargetStateOperation(operation) {
  if (operation?.operationScope === 'deferred') {
    return false
  }

  if (operation?.operationScope === 'current') {
    return false
  }

  return (
    operation?.implemented === false ||
    operation?.operationScope === 'target-state' ||
    operation?.fileScope === 'target-state'
  )
}

function isLegacyOperation(operation) {
  const tags = Array.isArray(operation?.tags) ? operation.tags : []
  return (
    operation?.operationScope === 'legacy' ||
    operation?.fileScope === 'legacy' ||
    /legacy/i.test(operation?.file ?? '') ||
    tags.some((tag) => /legacy/i.test(String(tag)))
  )
}

function isDeferredOperation(operation) {
  return operation?.operationScope === 'deferred'
}

export function classifyEndpointDrift({ codeEndpoints = [], codeOperations = [], specOperations }) {
  const hasMethodAwareCode = Array.isArray(codeOperations) && codeOperations.length > 0
  const codeSet = new Set(codeEndpoints.map(normalizeSpecPath).filter(Boolean))
  const codeOperationSet = new Set(
    codeOperations
      .map((operation) => {
        const endpoint = normalizeSpecPath(operation.endpoint)
        return endpoint ? `${String(operation.method).toUpperCase()} ${endpoint}` : null
      })
      .filter(Boolean),
  )
  const specSet = new Set(
    specOperations.map((operation) => normalizeSpecPath(operation.endpoint)).filter(Boolean),
  )
  const specOperationSet = new Set(
    specOperations
      .map((operation) => {
        const endpoint = normalizeSpecPath(operation.endpoint)
        return endpoint ? `${String(operation.method).toUpperCase()} ${endpoint}` : null
      })
      .filter(Boolean),
  )
  const unusedOperations = specOperations.filter((operation) => {
    const normalizedEndpoint = normalizeSpecPath(operation.endpoint)
    if (!normalizedEndpoint) {
      return false
    }

    if (hasMethodAwareCode) {
      return !codeOperationSet.has(`${String(operation.method).toUpperCase()} ${normalizedEndpoint}`)
    }

    return !codeSet.has(normalizedEndpoint)
  })

  const targetStateUnused = []
  const deferredUnused = []
  const legacyUnused = []
  const currentUnused = []

  for (const operation of unusedOperations) {
    if (isDeferredOperation(operation)) {
      deferredUnused.push(operation)
    } else if (isTargetStateOperation(operation)) {
      targetStateUnused.push(operation)
    } else if (isLegacyOperation(operation)) {
      legacyUnused.push(operation)
    } else {
      currentUnused.push(operation)
    }
  }

  const compareOperation = (a, b) =>
    a.endpoint.localeCompare(b.endpoint) ||
    a.method.localeCompare(b.method) ||
    (a.operationId ?? '').localeCompare(b.operationId ?? '')

  return {
    missingInSpec: hasMethodAwareCode
      ? uniqueSorted([...codeOperationSet].filter((operation) => !specOperationSet.has(operation)))
      : uniqueSorted([...codeSet].filter((endpoint) => !specSet.has(endpoint))),
    currentUnused: currentUnused.sort(compareOperation),
    targetStateUnused: targetStateUnused.sort(compareOperation),
    deferredUnused: deferredUnused.sort(compareOperation),
    legacyUnused: legacyUnused.sort(compareOperation),
  }
}

async function loadCodeEndpoints(files) {
  const results = []

  for (const file of files) {
    const absoluteFile = resolve(repoRoot, file)
    const sourceText = await readFile(absoluteFile, 'utf8')
    const operations = extractApiClientOperations(sourceText)
    for (const operation of operations) {
      results.push({ ...operation, file })
    }
  }

  return results
}

async function loadSpecPaths(files) {
  // 聚合多份契约文件的 paths，去重后返回。
  // v1 只接受单文件参数；扩展后需扫描 docs/api/*.yaml 全部契约（A-1/A-4）。
  const allFiles = Array.isArray(files) ? files : [files]
  const aggregated = new Set()

  for (const file of allFiles) {
    const absoluteFile = resolve(repoRoot, file)
    const spec = YAML.parse(await readFile(absoluteFile, 'utf8')) ?? {}
    const paths = spec.paths && typeof spec.paths === 'object' ? Object.keys(spec.paths) : []
    for (const pathValue of paths) {
      const normalized = normalizeSpecPath(pathValue)
      if (typeof normalized === 'string') {
        aggregated.add(normalized)
      }
    }
  }

  return uniqueSorted([...aggregated])
}

async function loadSpecOperations(files) {
  const allFiles = Array.isArray(files) ? files : [files]
  const operations = []

  for (const file of allFiles) {
    const absoluteFile = resolve(repoRoot, file)
    const spec = YAML.parse(await readFile(absoluteFile, 'utf8')) ?? {}
    const fileScope = spec['x-contract-scope']
    const paths = spec.paths && typeof spec.paths === 'object' ? spec.paths : {}

    for (const [pathValue, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== 'object') {
        continue
      }

      for (const [method, operation] of Object.entries(pathItem)) {
        if (!HTTP_METHODS.has(method.toLowerCase())) {
          continue
        }
        if (!operation || typeof operation !== 'object') {
          continue
        }

        const normalizedEndpoint = normalizeSpecPath(pathValue)
        if (!normalizedEndpoint) {
          continue
        }

        operations.push({
          endpoint: normalizedEndpoint,
          method: method.toUpperCase(),
          file,
          operationId: operation.operationId,
          implemented: operation['x-implemented'],
          fileScope,
          operationScope: operation['x-contract-scope'],
          tags: Array.isArray(operation.tags) ? operation.tags : [],
        })
      }
    }
  }

  return operations.sort(
    (a, b) =>
      a.endpoint.localeCompare(b.endpoint) ||
      a.method.localeCompare(b.method) ||
      (a.operationId ?? '').localeCompare(b.operationId ?? ''),
  )
}

function printEndpointList(title, endpoints, endpointToFiles = new Map()) {
  console.log(title)
  if (endpoints.length === 0) {
    console.log('  - 无')
    return
  }

  for (const endpoint of endpoints) {
    const files = endpointToFiles.get(endpoint)
    const suffix = files?.length ? ` (${files.join(', ')})` : ''
    console.log(`  - ${endpoint}${suffix}`)
  }
}

function printOperationList(title, operations) {
  console.log(title)
  if (operations.length === 0) {
    console.log('  - 无')
    return
  }

  for (const operation of operations) {
    const operationName = operation.operationId ? ` ${operation.operationId}` : ''
    const scope =
      operation.operationScope || operation.fileScope
        ? ` [${operation.operationScope ?? operation.fileScope}]`
        : ''
    console.log(
      `  - ${operation.method} ${operation.endpoint}${operationName} (${operation.file})${scope}`,
    )
  }
}

async function main() {
  const strict = process.argv.includes('--strict')
  const codeFiles = await resolveDefaultCodeFiles()
  const specFiles = await resolveDefaultSpecFiles()
  const codeResults = await loadCodeEndpoints(codeFiles)
  const codeEndpoints = uniqueSorted(codeResults.map((item) => item.endpoint))
  const endpointToFiles = new Map()

  for (const item of codeResults) {
    const key = item.method ? `${item.method} ${item.endpoint}` : item.endpoint
    const list = endpointToFiles.get(key) ?? []
    list.push(relative(repoRoot, resolve(repoRoot, item.file)).replace(/\\/g, '/'))
    endpointToFiles.set(key, uniqueSorted(list))
  }

  const specOperations = await loadSpecOperations(specFiles)
  const drift = classifyEndpointDrift({ codeEndpoints, codeOperations: codeResults, specOperations })
  const hasBlockingDrift = drift.missingInSpec.length > 0 || drift.currentUnused.length > 0
  const hasReportOnlyDrift =
    drift.targetStateUnused.length > 0 ||
    drift.deferredUnused.length > 0 ||
    drift.legacyUnused.length > 0

  console.log('API endpoint drift check')
  console.log(`Code files (${codeFiles.length}): ${codeFiles.join(', ')}`)
  console.log(`Spec files (${specFiles.length}): ${specFiles.join(', ')}`)
  console.log()
  printEndpointList('代码已调用，但契约未覆盖:', drift.missingInSpec, endpointToFiles)
  console.log()
  printOperationList('当前态契约已声明，但代码未调用:', drift.currentUnused)
  console.log()
  printOperationList('目标态契约已声明，但当前代码未调用（报告项，不阻断）:', drift.targetStateUnused)
  console.log()
  printOperationList('已暂缓契约项（需业务确认/后端实现/高风险联调，报告项，不阻断）:', drift.deferredUnused)
  console.log()
  printOperationList('legacy/兼容契约未被静态扫描识别（报告项，不阻断）:', drift.legacyUnused)
  console.log()

  if (hasBlockingDrift) {
    console.log(
      strict
        ? '检测到端点漂移，strict 模式返回失败。'
        : '检测到端点漂移；当前为报告模式，不阻断现有校验。',
    )
  } else if (hasReportOnlyDrift) {
    console.log('未检测到阻断性端点漂移；仅存在目标态/deferred/legacy 报告项。')
  } else {
    console.log('未检测到端点漂移。')
  }

  process.exit(hasBlockingDrift && strict ? 1 : 0)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main()
}
