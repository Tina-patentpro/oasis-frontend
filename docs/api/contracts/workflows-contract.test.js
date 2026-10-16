import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const specPath = resolve(__dirname, '..', 'workflows.yaml')
const workflowInputSchemaPath = resolve(__dirname, '..', 'schemas', 'workflow-input.schema.json')

const spec = parse(readFileSync(specPath, 'utf8'))
const workflowInputSchema = JSON.parse(readFileSync(workflowInputSchemaPath, 'utf8'))

const getPath = (path) => {
  const node = spec.paths?.[path]
  assert.ok(node, `路径 ${path} 必须存在`)
  return node
}

test('workflows spec 基础信息', () => {
  assert.equal(spec.openapi, '3.1.0')
  assert.equal(spec.info?.title, 'Workflow API')
  assert.ok(
    Array.isArray(spec.tags) && spec.tags.some((tag) => tag.name === 'Workflows'),
    '需要定义 Workflows 标签',
  )
})

test('GET /api/workflows 响应结构符合约定', () => {
  const path = getPath('/api/workflows').get
  assert.equal(path.summary, '分页查询工作流目录')
  const okResponse = path.responses?.['200']?.content?.['application/json']?.schema?.allOf ?? []
  assert.ok(okResponse.length >= 2, '列表响应需使用 allOf 拼接通用响应')
  assert.equal(okResponse[0].$ref, '#/components/schemas/ApiResponse')
  const dataSchema = okResponse[1].properties?.data?.properties
  assert.ok(dataSchema?.items?.items?.$ref, '列表需要返回 WorkflowSummary 列表')
  assert.equal(
    dataSchema.items.items.$ref,
    '#/components/schemas/WorkflowSummary',
    '列表项必须引用 WorkflowSummary',
  )
  assert.equal(
    dataSchema.pagination.$ref,
    '#/components/schemas/Pagination',
    '分页定义必须引用 Pagination',
  )
})

test('POST /api/workflows/{workflowId}/execute 请求 schema 覆盖输入与附件', () => {
  const path = getPath('/api/workflows/{workflowId}/execute').post
  const requestSchema = path.requestBody?.content?.['application/json']?.schema ?? {}
  assert.equal(requestSchema.$ref, '#/components/schemas/WorkflowExecutionRequest')

  const executionRequest = spec.components?.schemas?.WorkflowExecutionRequest ?? {}
  assert.ok(executionRequest.required?.includes('inputs'), '执行请求必须要求 inputs 字段')
  const attachments = executionRequest.properties?.attachments
  assert.equal(attachments?.type, 'array')
  assert.equal(attachments?.items?.properties?.fileId?.type, 'string', '附件需要包含 fileId')
})

test('工作流执行结果定义包含输出、文件与错误信息', () => {
  const detail = spec.components?.schemas?.WorkflowExecutionDetail
  assert.ok(detail, '需存在 WorkflowExecutionDetail schema')
  const properties = detail?.properties ?? {}
  assert.equal(properties.status?.enum?.includes('completed'), true)
  assert.equal(properties.files?.items?.$ref, '#/components/schemas/WorkflowExecutionFile')
  assert.equal(properties.error?.$ref, '#/components/schemas/ErrorInfo')
})

test('进度接口包含 steps 定义并支持所有状态', () => {
  const progress = spec.components?.schemas?.WorkflowExecutionProgress?.properties ?? {}
  assert.equal(progress.status?.enum?.includes('running'), true)
  const steps = progress.steps?.items?.properties ?? {}
  assert.deepEqual(steps.status?.enum, ['pending', 'running', 'completed', 'failed', 'skipped'])
})

test('workflow 输入 schema 定义 caseTitle 与 problemStatement', () => {
  const required = workflowInputSchema.required ?? []
  assert.ok(required.includes('caseTitle'), '输入 schema 需要 caseTitle')
  assert.ok(required.includes('problemStatement'), '输入 schema 需要 problemStatement')
  assert.equal(
    workflowInputSchema.properties?.attachments?.type,
    'array',
    '输入 schema 需支持附件数组',
  )
})
