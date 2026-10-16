import type { FileUrl } from '@/types/api'
import { extractDifyImageFileObjects } from './dify-file-object'
import { normalizeFileUrlValue } from './file-url'
import {
  createWorkflowOutputTextFields,
  stripWorkflowOutputFieldPrefix,
  type WorkflowOutputTextField,
} from './workflow-output-text'

type WorkflowRecord = Record<string, unknown>

interface NormalizedWorkflowResultPayload {
  text?: string
  file_output?: Array<Record<string, unknown>>
  file_url?: FileUrl
  outputs?: Record<string, unknown>
}

const DIFY_FILE_OBJECT_MARKERS = ['dify_model_identity', '__dify__file__', '/files/tools/'] as const

const DIFY_TOOL_FILE_TRANSFER_METHOD_REGEX = /['"]?transfer_method['"]?\s*:\s*['"]tool_file['"]/i

const DIFY_TOOL_FILE_TYPE_REGEX = /['"]?type['"]?\s*:\s*['"](?:document|image|audio|video)['"]/i

const LEAKED_DIFY_FILE_OBJECT_BLOCK_REGEX =
  /(?:^|[\r\n])[ \t]*(?:[-*]\s*)?[^:：\r\n]{1,100}\s*[:：]\s*(?:\[[\s\S]*?\]|\{[\s\S]*?\})[ \t]*/g

const DIFY_FILE_OBJECT_ONLY_REGEX = /^\s*(?:\[[\s\S]*\]|\{[\s\S]*\})\s*$/

function isRecord(value: unknown): value is WorkflowRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasDifyFileObjectMarker(value: string): boolean {
  if (DIFY_FILE_OBJECT_MARKERS.some((marker) => value.includes(marker))) {
    return true
  }

  return DIFY_TOOL_FILE_TRANSFER_METHOD_REGEX.test(value) && DIFY_TOOL_FILE_TYPE_REGEX.test(value)
}

function sanitizeWorkflowText(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const withoutLeakedFileObjects = value.replace(LEAKED_DIFY_FILE_OBJECT_BLOCK_REGEX, (match) =>
    hasDifyFileObjectMarker(match) ? '' : match,
  )
  const cleaned = withoutLeakedFileObjects
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleaned || (hasDifyFileObjectMarker(cleaned) && DIFY_FILE_OBJECT_ONLY_REGEX.test(cleaned))) {
    return undefined
  }

  return cleaned
}

function unwrapDataRecord(value: unknown): WorkflowRecord {
  if (!isRecord(value)) {
    return {}
  }

  if (isRecord(value['data']) && ('code' in value || 'message' in value)) {
    return value['data'] as WorkflowRecord
  }

  return value
}

function parseJsonRecord(value: unknown): WorkflowRecord | undefined {
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

function pickStringValue(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return undefined
}

function parseNumberLike(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function addTitleCandidate(candidates: Set<string>, value: unknown): void {
  if (typeof value !== 'string') {
    return
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return
  }

  const baseName = trimmed.split(/[－—–-]/)[0]?.trim() ?? ''
  const coreName = baseName.replace(/(?:生成|撰写|起草)$/u, '').trim()
  const expandedCandidates = [trimmed, baseName, coreName]
  if (coreName && coreName !== baseName) {
    expandedCandidates.push(`${coreName}和生成报告`, `${coreName}生成报告`)
  }

  for (const candidate of expandedCandidates) {
    const normalized = candidate.trim()
    if (normalized.length >= 2) {
      candidates.add(normalized)
    }
  }
}

function shouldAllowPlainTitlePrefix(name: string): boolean {
  return name.length >= 3
}

function buildWorkflowTitleOutputFields(
  sourceRecord: WorkflowRecord,
  dataRecord: WorkflowRecord,
): WorkflowOutputTextField[] {
  const type = parseNumberLike(dataRecord['type'] ?? sourceRecord['type'])
  if (type === 2) {
    return []
  }

  const candidates = new Set<string>()
  for (const value of [
    dataRecord['api_name'],
    sourceRecord['api_name'],
    dataRecord['name'],
    sourceRecord['name'],
    dataRecord['title'],
    sourceRecord['title'],
  ]) {
    addTitleCandidate(candidates, value)
  }

  return Array.from(candidates).map((name) => ({
    name,
    allowStructuralPrefix: true,
    allowPlainPrefix: shouldAllowPlainTitlePrefix(name),
  }))
}

function extractOutputsRecord(payload: unknown): Record<string, unknown> | undefined {
  const sourceRecord = unwrapDataRecord(payload)
  if (isRecord(sourceRecord['outputs'])) {
    return sourceRecord['outputs'] as Record<string, unknown>
  }

  for (const recordSource of [sourceRecord['response'], sourceRecord['output']]) {
    const record = parseJsonRecord(recordSource)
    if (!record) {
      continue
    }

    const recordData = unwrapDataRecord(record)
    if (isRecord(record['data']) && isRecord((record['data'] as WorkflowRecord)['outputs'])) {
      return (record['data'] as WorkflowRecord)['outputs'] as Record<string, unknown>
    }
    if (isRecord(recordData['outputs'])) {
      return recordData['outputs'] as Record<string, unknown>
    }

    if (isRecord(record['outputs'])) {
      return record['outputs'] as Record<string, unknown>
    }
  }

  return undefined
}

function buildFallbackText(outputs: Record<string, unknown> | undefined): string | undefined {
  if (!outputs) {
    return undefined
  }

  const textEntries = Object.entries(outputs)
    .map(([key, value]): [string, string | undefined] => [
      key,
      typeof value === 'string' ? sanitizeWorkflowText(value) : undefined,
    ])
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')

  if (textEntries.length === 0) {
    return undefined
  }

  if (textEntries.length === 1) {
    return textEntries[0]?.[1]
  }

  return textEntries.map(([, value]) => value.trim()).join('\n\n')
}

function coerceFileOutputRecords(value: unknown): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const records = value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  )

  return records.length > 0 ? records : undefined
}

function mergeFileOutputRecords(
  primary: Array<Record<string, unknown>> | undefined,
  extracted: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> | undefined {
  const merged = [...(primary ?? []), ...extracted]
  if (merged.length === 0) {
    return undefined
  }

  const seen = new Set<string>()
  const unique: Array<Record<string, unknown>> = []
  merged.forEach((item) => {
    const url = pickStringValue([
      item['download_url'],
      item['downloadUrl'],
      item['url'],
      item['file_url'],
      item['fileUrl'],
      item['remote_url'],
      item['remoteUrl'],
    ])
    const identity = url ?? JSON.stringify(item)
    if (seen.has(identity)) {
      return
    }

    seen.add(identity)
    unique.push(item)
  })

  return unique
}

export function normalizeWorkflowResultPayload(payload: unknown): NormalizedWorkflowResultPayload {
  const sourceRecord = isRecord(payload) ? payload : {}
  const dataRecord = unwrapDataRecord(sourceRecord)
  const outputs = extractOutputsRecord(payload)

  const text = pickStringValue([
    dataRecord['answer'],
    sourceRecord['answer'],
    dataRecord['answer_text'],
    sourceRecord['answer_text'],
    dataRecord['generatedContent'],
    sourceRecord['generatedContent'],
  ])

  const topLevelFileUrl = normalizeFileUrlValue(
    dataRecord['file_url'] ??
      dataRecord['fileUrl'] ??
      sourceRecord['file_url'] ??
      sourceRecord['fileUrl'],
  )
  const topLevelFileOutput = coerceFileOutputRecords(
    dataRecord['file_output'] ??
      dataRecord['fileOutput'] ??
      sourceRecord['file_output'] ??
      sourceRecord['fileOutput'],
  )
  const extractedImageFileOutput = extractDifyImageFileObjects([
    outputs,
    dataRecord['answer'],
    sourceRecord['answer'],
    dataRecord['answer_text'],
    sourceRecord['answer_text'],
    dataRecord['generatedContent'],
    sourceRecord['generatedContent'],
  ])
  const fallbackText = buildFallbackText(outputs)
  const outputFields = [
    ...createWorkflowOutputTextFields(outputs),
    ...buildWorkflowTitleOutputFields(sourceRecord, dataRecord),
  ]
  const normalizedText = stripWorkflowOutputFieldPrefix(text, outputFields)

  return {
    text: sanitizeWorkflowText(normalizedText) ?? sanitizeWorkflowText(fallbackText),
    file_output: mergeFileOutputRecords(topLevelFileOutput, extractedImageFileOutput),
    file_url: topLevelFileUrl,
    outputs,
  }
}
