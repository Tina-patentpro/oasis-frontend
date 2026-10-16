import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  classifyEndpointDrift,
  extractApiClientEndpoints,
  extractApiClientOperations,
  findEndpointDrift,
  normalizeCodeEndpoint,
  resolveDefaultCodeFiles,
  resolveDefaultSpecFiles,
} from './check-endpoint-drift.mjs'

describe('check-endpoint-drift', () => {
  test('normalizes code endpoints to API paths', () => {
    assert.equal(normalizeCodeEndpoint('/auth/pwdlogin'), '/api/auth/pwdlogin')
    assert.equal(normalizeCodeEndpoint('/api/auth/login'), '/api/auth/login')
    assert.equal(
      normalizeCodeEndpoint('/user/userhasread/${id}'),
      '/api/user/userhasread/{param}',
    )
  })

  test('extracts apiClient endpoint literals from service source', () => {
    const source = `
      await apiClient.post<AuthLoginResponse>('/auth/pwdlogin', payload)
      return await apiClient.get(\`/user/userhasread/\${id}\`)
    `

    assert.deepEqual(extractApiClientEndpoints(source), [
      '/api/auth/pwdlogin',
      '/api/user/userhasread/{param}',
    ])
  })

  test('reports endpoints missing from spec and spec paths unused by code', () => {
    const drift = findEndpointDrift({
      codeEndpoints: ['/api/auth/pwdlogin', '/api/user/usermessagelist'],
      specPaths: ['/api/auth/login', '/api/notifications'],
    })

    assert.deepEqual(drift.missingInSpec, ['/api/auth/pwdlogin', '/api/user/usermessagelist'])
    assert.deepEqual(drift.unusedInCode, ['/api/auth/login', '/api/notifications'])
  })

  test('classifies unused contract operations by implementation scope', () => {
    const drift = classifyEndpointDrift({
      codeEndpoints: ['/api/current/used'],
      specOperations: [
        {
          endpoint: '/api/current/used',
          method: 'GET',
          file: 'docs/api/current.yaml',
          operationId: 'usedCurrent',
        },
        {
          endpoint: '/api/current/unused',
          method: 'GET',
          file: 'docs/api/current.yaml',
          operationId: 'unusedCurrent',
        },
        {
          endpoint: '/api/target/file',
          method: 'POST',
          file: 'docs/api/target.yaml',
          operationId: 'targetByFile',
          fileScope: 'target-state',
        },
        {
          endpoint: '/api/target/current-override',
          method: 'GET',
          file: 'docs/api/target.yaml',
          operationId: 'currentOverride',
          fileScope: 'target-state',
          operationScope: 'current',
        },
        {
          endpoint: '/api/target/operation',
          method: 'POST',
          file: 'docs/api/current.yaml',
          operationId: 'targetByOperation',
          implemented: false,
        },
        {
          endpoint: '/api/deferred/manual-review',
          method: 'POST',
          file: 'docs/api/deferred.yaml',
          operationId: 'deferredManualReview',
          fileScope: 'target-state',
          operationScope: 'deferred',
        },
        {
          endpoint: '/api/legacy/fallback',
          method: 'GET',
          file: 'docs/api/legacy.yaml',
          operationId: 'legacyFallback',
          fileScope: 'legacy',
        },
      ],
    })

    assert.deepEqual(drift.missingInSpec, [])
    assert.deepEqual(
      drift.currentUnused.map((item) => item.endpoint),
      ['/api/current/unused', '/api/target/current-override'],
    )
    assert.deepEqual(
      drift.targetStateUnused.map((item) => item.endpoint),
      ['/api/target/file', '/api/target/operation'],
    )
    assert.deepEqual(
      drift.deferredUnused.map((item) => item.endpoint),
      ['/api/deferred/manual-review'],
    )
    assert.deepEqual(
      drift.legacyUnused.map((item) => item.endpoint),
      ['/api/legacy/fallback'],
    )
  })

  test('distinguishes methods on the same contract path', () => {
    const drift = classifyEndpointDrift({
      codeEndpoints: [],
      codeOperations: [{ endpoint: '/api/files', method: 'GET' }],
      specOperations: [
        {
          endpoint: '/api/files',
          method: 'GET',
          file: 'docs/api/files.yaml',
          operationId: 'listFiles',
          operationScope: 'current',
        },
        {
          endpoint: '/api/files',
          method: 'POST',
          file: 'docs/api/files.yaml',
          operationId: 'uploadFile',
          fileScope: 'target-state',
        },
      ],
    })

    assert.deepEqual(drift.currentUnused, [])
    assert.deepEqual(
      drift.targetStateUnused.map((item) => `${item.method} ${item.endpoint}`),
      ['POST /api/files'],
    )
  })

  test('treats apiClient.uploadFile calls as POST operations', () => {
    const source = `
      return apiClient.uploadFile<CurrentFileResponse>('/api/files', formData)
      return apiClient.uploadFile<CurrentFileResponse>('/api/files/batch', formData)
    `

    assert.deepEqual(extractApiClientOperations(source), [
      { endpoint: '/api/files', method: 'POST' },
      { endpoint: '/api/files/batch', method: 'POST' },
    ])
  })

  test('extracts explicitly declared fallback endpoints from request helpers', () => {
    const source = `
      const endpoints = defineApiEndpoints(
        'POST',
        ['/user/user/createfolder', '/user/createfolder'] as const,
      )
      return requestWithEndpointFallback(endpoints, (endpoint) => apiClient.post(endpoint, payload))
    `

    assert.deepEqual(extractApiClientOperations(source), [
      { endpoint: '/api/user/createfolder', method: 'POST' },
      { endpoint: '/api/user/user/createfolder', method: 'POST' },
    ])
  })

  test('appends a normalized path parameter for declared endpoint bases', () => {
    const source = `
      const endpoints = defineApiEndpoints(
        'GET',
        ['/user/user/folderdetail', '/user/folderdetail'] as const,
        true,
      )
    `

    assert.deepEqual(extractApiClientOperations(source), [
      { endpoint: '/api/user/folderdetail/{param}', method: 'GET' },
      { endpoint: '/api/user/user/folderdetail/{param}', method: 'GET' },
    ])
  })

  test('resolveDefaultCodeFiles 覆盖所有核心 service（排除辅助文件）', async () => {
    const files = await resolveDefaultCodeFiles()
    const mustInclude = [
      'src/api/services/auth.service.ts',
      'src/api/services/notification.service.ts',
      'src/api/services/project.service.ts',
      'src/api/services/ai.service.ts',
      'src/api/services/session.service.ts',
      'src/api/services/billing.service.ts',
      'src/api/services/user.service.ts',
      'src/api/services/cms.service.ts',
      'src/api/services/history.service.ts',
    ]
    for (const file of mustInclude) {
      assert.ok(files.includes(file), `应包含 ${file}`)
    }
  })

  test('resolveDefaultCodeFiles 排除纯辅助文件', async () => {
    const files = await resolveDefaultCodeFiles()
    const mustExclude = [
      'src/api/services/ai-service-normalizers.ts',
      'src/api/services/session-service-normalizers.ts',
      'src/api/services/index.ts',
    ]
    for (const file of mustExclude) {
      assert.ok(!files.includes(file), `不应包含辅助文件 ${file}`)
    }
  })

  test('resolveDefaultCodeFiles includes request helpers that call apiClient', async () => {
    const files = await resolveDefaultCodeFiles()
    assert.ok(files.includes('src/api/services/project-service-requests.ts'))
  })

  test('resolveDefaultCodeFiles 排除测试文件', async () => {
    const files = await resolveDefaultCodeFiles()
    const testFiles = files.filter((f) => f.endsWith('.test.ts'))
    assert.equal(testFiles.length, 0, '不应包含任何 .test.ts 文件')
  })

  test('resolveDefaultSpecFiles 扫描 docs/api/*.yaml 并排除模板', async () => {
    const specs = await resolveDefaultSpecFiles()
    assert.ok(specs.length >= 10, `应扫描多份契约，实际 ${specs.length} 份`)
    assert.ok(
      !specs.some((s) => s.includes('openapi-template.yaml')),
      '不应包含 openapi-template.yaml',
    )
    assert.ok(specs.some((s) => s.includes('users-auth.yaml')), '应包含 users-auth.yaml')
  })
})
