import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  auditUserApiDoc,
  findInvalidJsonFences,
  normalizeOperationPath,
} from './check-user-api-doc.mjs'

const validSpecOperation = {
  method: 'GET',
  path: '/api/items/{itemId}',
  file: 'docs/api/items.yaml',
  operationId: 'getItem',
  auth: 'bearer',
}

const validDocument = `
## 接口状态

| 状态 | 数量 | 含义 | 使用规则 |
| --- | ---: | --- | --- |
| \`current\` | 1 | 示例 | 示例 |
| \`legacy\` | 0 | 示例 | 示例 |
| \`legacy / OpenAPI gap\` | 0 | 示例 | 示例 |
| \`deferred\` | 0 | 示例 | 示例 |
| \`target-state overlay\` | 0 | 示例 | 示例 |

## 完整接口总览

### A. 示例

示例接口。（1 个唯一接口）

| 状态 | 方法 | 代理后路径 | 功能 | 认证 | operationId / 代码标识 | 来源 |
| --- | --- | --- | --- | --- | --- | --- |
| \`current\` | \`GET\` | \`/api/items/{itemId}\` | 获取示例 | Bearer | \`getItem\` | \`docs/api/items.yaml\` |

## 现网兼容详细说明

### 1.1 获取示例

**接口**: \`GET /items/{id}\`

**需要认证**: Bearer Token

\`\`\`json
{"id": 1}
\`\`\`
`

describe('check-user-api-doc', () => {
  test('normalizes path parameter names before matching operations', () => {
    assert.equal(normalizeOperationPath('/api/items/{itemId}'), '/api/items/{}')
    assert.equal(normalizeOperationPath('/items/{id}'), '/api/items/{}')
  })

  test('reports invalid JSON fences with their source line', () => {
    const issues = findInvalidJsonFences('before\n```json\n{"id": 1,}\n```\nafter')

    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'invalid-json-fence')
    assert.equal(issues[0].line, 2)
  })

  test('accepts a consistent inventory, detail section, and OpenAPI operation', () => {
    const result = auditUserApiDoc(validDocument, {
      specOperations: [validSpecOperation],
      existingSources: new Set(['docs/api/items.yaml']),
    })

    assert.deepEqual(result.issues, [])
    assert.deepEqual(result.stats, {
      inventoryOperations: 1,
      detailOperations: 1,
      jsonFences: 1,
    })
  })

  test('reports group-count drift, duplicate inventory rows, and missing detail auth', () => {
    const broken = validDocument
      .replace('（1 个唯一接口）', '（3 个唯一接口）')
      .replace(
        '| `current` | `GET` | `/api/items/{itemId}` | 获取示例 | Bearer | `getItem` | `docs/api/items.yaml` |',
        '| `current` | `GET` | `/api/items/{itemId}` | 获取示例 | Bearer | `getItem` | `docs/api/items.yaml` |\n| `current` | `GET` | `/api/items/{id}` | 重复示例 | Bearer | `getItem` | `docs/api/items.yaml` |',
      )
      .replace('**需要认证**: Bearer Token\n', '')

    const codes = auditUserApiDoc(broken, {
      specOperations: [validSpecOperation],
      existingSources: new Set(['docs/api/items.yaml']),
    }).issues.map((issue) => issue.code)

    assert.ok(codes.includes('group-count-mismatch'))
    assert.ok(codes.includes('duplicate-inventory-operation'))
    assert.ok(codes.includes('missing-detail-auth'))
  })

  test('reports OpenAPI operationId and auth mismatches', () => {
    const broken = validDocument.replace('Bearer | `getItem`', '无需认证 | `wrongOperation`')

    const codes = auditUserApiDoc(broken, {
      specOperations: [validSpecOperation],
      existingSources: new Set(['docs/api/items.yaml']),
    }).issues.map((issue) => issue.code)

    assert.ok(codes.includes('operation-id-mismatch'))
    assert.ok(codes.includes('auth-mismatch'))
  })
})
