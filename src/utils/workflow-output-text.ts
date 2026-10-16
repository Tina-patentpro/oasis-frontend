type WorkflowOutputRecord = Record<string, unknown>

export interface WorkflowOutputTextField {
  name: string
  value?: string
  allowStructuralPrefix?: boolean
  allowPlainPrefix?: boolean
}

export interface WorkflowOutputSchemaTextField {
  cn_name?: unknown
  en_name?: unknown
  label?: unknown
  name?: unknown
  key?: unknown
  api_name?: unknown
}

type WorkflowOutputFieldInput = string | WorkflowOutputTextField

const MAIN_TEXT_OUTPUT_FIELD_NAMES = ['生成内容', '输出内容'] as const

const RESERVED_OUTPUT_CONTAINER_KEYS = new Set([
  'answer',
  'answer_text',
  'code',
  'cost',
  'data',
  'error',
  'executionId',
  'file_output',
  'file_url',
  'files',
  'generatedContent',
  'id',
  'message',
  'metadata',
  'output',
  'outputs',
  'response',
  'session_id',
  'status',
  'tokensUsed',
  'usage',
  'workflowId',
  'workflow_id',
])

function isRecord(value: unknown): value is WorkflowOutputRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJsonRecord(value: unknown): WorkflowOutputRecord | undefined {
  if (isRecord(value)) {
    return value
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function unwrapDataRecord(value: WorkflowOutputRecord): WorkflowOutputRecord {
  if (isRecord(value['data']) && ('code' in value || 'message' in value)) {
    return value['data'] as WorkflowOutputRecord
  }

  return value
}

function pickOutputsRecord(value: unknown): WorkflowOutputRecord | undefined {
  const record = parseJsonRecord(value)
  if (!record) {
    return undefined
  }

  if (isRecord(record['outputs'])) {
    return record['outputs'] as WorkflowOutputRecord
  }

  if (isRecord(record['data']) && isRecord((record['data'] as WorkflowOutputRecord)['outputs'])) {
    return (record['data'] as WorkflowOutputRecord)['outputs'] as WorkflowOutputRecord
  }

  const dataRecord = unwrapDataRecord(record)
  if (isRecord(dataRecord['outputs'])) {
    return dataRecord['outputs'] as WorkflowOutputRecord
  }

  const keys = Object.keys(record)
  if (
    keys.length > 0 &&
    keys.every((key) => key.trim().length > 0 && !RESERVED_OUTPUT_CONTAINER_KEYS.has(key))
  ) {
    return record
  }

  return undefined
}

function normalizeOutputTextFields(
  fields: Iterable<WorkflowOutputFieldInput>,
): WorkflowOutputTextField[] {
  const fieldMap = new Map<string, WorkflowOutputTextField>()

  for (const field of fields) {
    const name = typeof field === 'string' ? field.trim() : field.name.trim()
    if (!name) {
      continue
    }

    const value = typeof field === 'string' ? undefined : field.value
    const allowStructuralPrefix =
      typeof field === 'string' ? false : field.allowStructuralPrefix === true
    const allowPlainPrefix = typeof field === 'string' ? false : field.allowPlainPrefix === true
    const existing = fieldMap.get(name)
    if (!existing || (existing.value === undefined && typeof value === 'string')) {
      fieldMap.set(name, {
        name,
        value: typeof value === 'string' ? value : undefined,
        allowStructuralPrefix,
        allowPlainPrefix,
      })
    } else if (
      (allowStructuralPrefix && existing.allowStructuralPrefix !== true) ||
      (allowPlainPrefix && existing.allowPlainPrefix !== true)
    ) {
      fieldMap.set(name, {
        ...existing,
        allowStructuralPrefix: existing.allowStructuralPrefix || allowStructuralPrefix,
        allowPlainPrefix: existing.allowPlainPrefix || allowPlainPrefix,
      })
    }
  }

  return Array.from(fieldMap.values()).sort((a, b) => b.name.length - a.name.length)
}

function buildWorkflowOutputTextFields(
  outputs: WorkflowOutputRecord | undefined,
): WorkflowOutputTextField[] {
  if (!outputs) {
    return []
  }

  return normalizeOutputTextFields(
    Object.entries(outputs).map(([name, value]) => ({
      name,
      value: typeof value === 'string' ? value : undefined,
    })),
  )
}

function createStructuralTextField(
  name: string,
  options?: { allowPlainPrefix?: boolean },
): WorkflowOutputTextField {
  return {
    name,
    allowStructuralPrefix: true,
    allowPlainPrefix: options?.allowPlainPrefix === true,
  }
}

function createMainTextOutputFields(): WorkflowOutputTextField[] {
  return MAIN_TEXT_OUTPUT_FIELD_NAMES.map((name) =>
    createStructuralTextField(name, { allowPlainPrefix: true }),
  )
}

function normalizeForTextComparison(value: string): string {
  return value.replace(/\r\n/g, '\n').trim()
}

function textMatchesOutputValue(candidate: string, outputValue: string | undefined): boolean {
  if (typeof outputValue !== 'string') {
    return false
  }

  return normalizeForTextComparison(candidate) === normalizeForTextComparison(outputValue)
}

function looksLikeStructuredOutputStart(value: string): boolean {
  const trimmed = value.trimStart()
  if (/^(?:#{1,6}\s*|\d+[.、]\s*|[一二三四五六七八九十]+[、.．]\s*|[-*+]\s+)/.test(trimmed)) {
    return true
  }

  return /^[^\r\n]{1,80}\r?\n\s*\r?\n?\s*(?:#{1,6}\s*|\d+[.、]\s*|[一二三四五六七八九十]+[、.．]\s*|[-*+]\s+)/.test(
    trimmed,
  )
}

function getPrefixStrippedCandidate(text: string, fieldName: string): string | undefined {
  const leftTrimmed = text.trimStart()
  if (!leftTrimmed.startsWith(fieldName)) {
    return undefined
  }

  const afterName = leftTrimmed.slice(fieldName.length)
  const separatorMatch = afterName.match(/^(?:\s*[:：]\s*|\s*\r?\n\s*|[ \t]+)/)
  if (!separatorMatch) {
    return undefined
  }

  return afterName.slice(separatorMatch[0].length)
}

export function extractWorkflowOutputFieldNames(value: unknown): string[] {
  return extractWorkflowOutputTextFields(value).map((field) => field.name)
}

export function extractWorkflowOutputTextFields(value: unknown): WorkflowOutputTextField[] {
  return buildWorkflowOutputTextFields(pickOutputsRecord(value))
}

export function createWorkflowOutputTextFields(
  outputs: Record<string, unknown> | undefined,
): WorkflowOutputTextField[] {
  return buildWorkflowOutputTextFields(outputs)
}

export function createWorkflowOutputSchemaTextFields(
  outputSchema: Iterable<WorkflowOutputSchemaTextField> | undefined,
): WorkflowOutputTextField[] {
  if (!outputSchema) {
    return []
  }

  const fields: WorkflowOutputTextField[] = []
  for (const field of outputSchema) {
    for (const value of [
      field.cn_name,
      field.en_name,
      field.label,
      field.name,
      field.key,
      field.api_name,
    ]) {
      if (typeof value !== 'string') {
        continue
      }
      const name = value.trim()
      if (name) {
        fields.push(createStructuralTextField(name, { allowPlainPrefix: true }))
      }
    }
  }

  return normalizeOutputTextFields(fields)
}

export function stripWorkflowOutputFieldPrefix(
  text: string | undefined,
  outputFields: Iterable<WorkflowOutputFieldInput> | undefined,
): string | undefined {
  if (typeof text !== 'string') {
    return undefined
  }

  const normalizedFields = normalizeOutputTextFields([
    ...createMainTextOutputFields(),
    ...(outputFields ?? []),
  ])
  if (normalizedFields.length === 0) {
    return text
  }

  for (const field of normalizedFields) {
    const stripped = getPrefixStrippedCandidate(text, field.name)

    if (
      stripped !== undefined &&
      (textMatchesOutputValue(stripped, field.value) ||
        (field.allowPlainPrefix === true && stripped.trim().length > 0) ||
        (field.allowStructuralPrefix === true && looksLikeStructuredOutputStart(stripped)))
    ) {
      return stripped
    }
  }

  return text
}
