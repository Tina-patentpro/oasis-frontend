import type {
  FileUrl,
  GenerateResponse,
  ProcessStatusResponse,
  WorkflowExecutionStatus,
  WorkflowExecutionUsage,
} from '@/types/api'
import { normalizeFileUrlList, normalizeFileUrlValue } from '@/utils/file-url'
import { normalizeWorkflowResultPayload } from '@/utils/workflow-result'

import { isRecord } from '../validation'

export interface ChatflowRequest {
  query: string
  conversation_id: string | null
  type: number
  folder_id: number
  files?: Array<{
    type: 'document' | 'image' | 'audio' | 'video'
    transfer_method: 'remote_url'
    url: string
  }>
}

export interface ChatflowResponse {
  conversation_id?: string
  answer?: string
  answer_text?: string
  content?: string
  text?: string
  output?: string
  result?: string
  status?: string
  error?: string
}

export interface CreateWithApiOptions {
  folderId?: number
  fileFields?: string[]
  multiFileFields?: string[]
  apiProcess: string
  taskKey: string
}

const buildFallbackExecutionId = () =>
  `temp-exec-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`

const coerceWorkflowStatus = (status: unknown): WorkflowExecutionStatus | undefined => {
  if (typeof status !== 'string') {
    return undefined
  }

  const s = status.toLowerCase()
  if (s === 'success' || s === 'done' || s === 'finished' || s === 'succeeded') {
    return 'completed'
  }
  if (
    s === 'queued' ||
    s === 'running' ||
    s === 'completed' ||
    s === 'failed' ||
    s === 'cancelled'
  ) {
    return s as WorkflowExecutionStatus
  }

  return undefined
}

const unwrapBackendDataRecord = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) {
    return {}
  }

  const hasEnvelopeFields =
    Object.prototype.hasOwnProperty.call(value, 'data') &&
    (Object.prototype.hasOwnProperty.call(value, 'code') ||
      Object.prototype.hasOwnProperty.call(value, 'message'))

  return hasEnvelopeFields && isRecord(value['data'])
    ? (value['data'] as Record<string, unknown>)
    : value
}

const pickTrimmedString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue
    }
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return ''
}

const pickIdentifierString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }

    if (typeof value !== 'string') {
      continue
    }

    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  return ''
}

const pickFileUrlValue = (...values: unknown[]): FileUrl | undefined => {
  for (const value of values) {
    const normalized = normalizeFileUrlValue(value)
    if (normalized !== undefined) {
      return normalized
    }
  }
  return undefined
}

type PartialGenerateResponse = Partial<GenerateResponse> & { content?: string }

export const coerceGenerateResponse = (payload: PartialGenerateResponse): GenerateResponse => {
  const payloadRecord = payload as Record<string, unknown>
  const dataRecord = unwrapBackendDataRecord(payloadRecord)
  const normalizedWorkflowResult = normalizeWorkflowResultPayload(payloadRecord)
  const outputs = normalizedWorkflowResult.outputs
  const inferredGeneratedContent = normalizedWorkflowResult.text

  const executionIdCandidate = pickIdentifierString(
    payload.executionId,
    dataRecord['executionId'],
    dataRecord['id'],
  )
  const executionId =
    executionIdCandidate.length > 0 ? executionIdCandidate : buildFallbackExecutionId()

  const usage: WorkflowExecutionUsage | undefined =
    payload.usage ??
    (payload.tokensUsed || payload.cost
      ? {
          tokensUsed: payload.tokensUsed,
          creditsConsumed: payload.cost,
        }
      : undefined)

  const normalizedFileUrls = normalizeFileUrlList(
    pickFileUrlValue(normalizedWorkflowResult.file_url, payload.file_url),
  )
  const fileUrl =
    pickFileUrlValue(normalizedWorkflowResult.file_url, payload.file_url) ??
    pickFileUrlValue(normalizedFileUrls.length > 0 ? normalizedFileUrls : undefined)

  const status = coerceWorkflowStatus(payload.status ?? dataRecord['status'])
  const rawFileOutputRecords = coerceFileOutputRecords(normalizedWorkflowResult.file_output)

  return {
    executionId,
    workflowId:
      pickTrimmedString(payload.workflowId, dataRecord['workflow_id'], dataRecord['workflowId']) ||
      undefined,
    status,
    outputs,
    files: undefined,
    file_output: rawFileOutputRecords.length > 0 ? rawFileOutputRecords : undefined,
    metadata: payload.metadata,
    documentSections: payload.documentSections,
    usage,
    error: payload.error ?? null,
    generatedContent: inferredGeneratedContent,
    tokensUsed: payload.tokensUsed,
    cost: payload.cost,
    rawResponse: payload.rawResponse ?? payload,
    file_url: fileUrl,
  }
}

export const extractChatflowAnswer = (response: ChatflowResponse | null | undefined): string => {
  if (!response || typeof response !== 'object') {
    return ''
  }

  const responseRecord = response as Record<string, unknown>
  const answerCandidates: Array<unknown> = [
    response.answer,
    responseRecord['answer_text'],
    responseRecord['content'],
    responseRecord['text'],
    responseRecord['output'],
    responseRecord['result'],
  ]

  const content = answerCandidates.find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  )

  return typeof content === 'string' ? content : ''
}

const parseNumberLike = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

const extractFileUrlFromItem = (item: unknown): string => {
  if (typeof item === 'string') {
    return item.trim()
  }
  if (!isRecord(item)) {
    return ''
  }
  return pickTrimmedString(
    item.url,
    item.file,
    item.saved_path,
    item.savedPath,
    item.remote_url,
    item.remoteUrl,
  )
}

type WorkflowInputFileType = 'document' | 'image' | 'audio' | 'video'
type WorkflowInputFileObject = {
  type: WorkflowInputFileType
  transfer_method: 'remote_url'
  url: string
}

const detectFileTypeFromMime = (mimeType: string): WorkflowInputFileType => {
  const mime = mimeType.trim().toLowerCase()
  if (mime.startsWith('image/')) {
    return 'image'
  }
  if (mime.startsWith('audio/')) {
    return 'audio'
  }
  if (mime.startsWith('video/')) {
    return 'video'
  }
  return 'document'
}

const detectFileTypeFromUrl = (url: string): WorkflowInputFileType => {
  const lower = url.toLowerCase()
  if (/\.(png|jpg|jpeg|gif|bmp|webp|svg)$/.test(lower)) {
    return 'image'
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower)) {
    return 'audio'
  }
  if (/\.(mp4|mov|avi|wmv|mkv|webm)$/.test(lower)) {
    return 'video'
  }
  return 'document'
}

const resolveInputFileType = (item: unknown, url: string): WorkflowInputFileType => {
  if (isRecord(item)) {
    const explicitType = pickTrimmedString(item.type, item.file_type, item.fileType).toLowerCase()
    if (
      explicitType === 'document' ||
      explicitType === 'image' ||
      explicitType === 'audio' ||
      explicitType === 'video'
    ) {
      return explicitType
    }

    const mimeType = pickTrimmedString(
      item.mimeType,
      item.mime_type,
      item.content_type,
      item.contentType,
    )
    if (mimeType) {
      return detectFileTypeFromMime(mimeType)
    }
  }

  return detectFileTypeFromUrl(url)
}

const normalizeFileInputItem = (item: unknown): WorkflowInputFileObject | null => {
  const url = extractFileUrlFromItem(item)
  if (!url) {
    return null
  }
  return {
    type: resolveInputFileType(item, url),
    transfer_method: 'remote_url',
    url,
  }
}

export const parseFileInputValue = (rawValue: string): WorkflowInputFileObject[] => {
  if (!rawValue.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue)
    const items = Array.isArray(parsed) ? parsed : [parsed]
    return items
      .map((item) => normalizeFileInputItem(item))
      .filter((item): item is WorkflowInputFileObject => item !== null)
  } catch {
    const fallback = rawValue.trim()
    if (!fallback) {
      return []
    }
    const normalized = normalizeFileInputItem(fallback)
    return normalized ? [normalized] : []
  }
}

export const requireTaskKey = (taskKey: string): string => {
  if (typeof taskKey !== 'string' || taskKey.trim().length === 0) {
    throw new Error('[AIService] createWithApi requires non-empty taskKey')
  }
  return taskKey.trim()
}

const pickStringLike = (
  values: unknown[],
  options: { allowEmpty?: boolean } = {},
): string | undefined => {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue
    }
    if (options.allowEmpty) {
      return value
    }
    if (value.trim().length > 0) {
      return value
    }
  }
  return undefined
}

const coerceFileOutputRecords = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  )
}

const toPlainRecord = (payload: unknown): Record<string, unknown> =>
  payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}

const pickStatusKey = (record: Record<string, unknown>, taskKey: string): string => {
  const keyCandidate = [record['key'], record['task_key'], record['taskKey']].find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  )
  return typeof keyCandidate === 'string' ? keyCandidate : taskKey
}

const normalizeProcessSteps = (record: Record<string, unknown>): string[] => {
  const stepsRaw = Array.isArray(record['steps'])
    ? record['steps']
    : Array.isArray(record['progress_steps'])
      ? record['progress_steps']
      : []

  return stepsRaw
    .map((value) => (typeof value === 'string' ? value : String(value)))
    .filter((value) => value.trim().length > 0)
}

const resolveCurrentStepName = (
  record: Record<string, unknown>,
  currentStep: number,
  steps: string[],
): string => {
  const candidate = [
    record['current_step_name'],
    record['currentStepName'],
    record['step_name'],
    record['stepName'],
  ].find((value) => typeof value === 'string' && value.trim().length > 0)

  if (typeof candidate === 'string') {
    return candidate
  }
  if (currentStep > 0 && currentStep - 1 < steps.length) {
    return steps[currentStep - 1] || ''
  }
  return ''
}

const resolveProgressPercent = (
  record: Record<string, unknown>,
  currentStep: number,
  totalSteps: number,
): number => {
  const progressPercentRaw =
    parseNumberLike(record['progress_percent']) ??
    parseNumberLike(record['progressPercent']) ??
    parseNumberLike(record['progress']) ??
    parseNumberLike(record['percent'])

  if (progressPercentRaw !== undefined) {
    return Math.max(0, Math.min(100, progressPercentRaw))
  }
  if (totalSteps > 0) {
    return Math.max(0, Math.min(100, (currentStep / totalSteps) * 100))
  }
  return 0
}

const resolveProcessCompletion = (
  record: Record<string, unknown>,
  status: WorkflowExecutionStatus | undefined,
  progressPercent: number,
  currentStep: number,
  totalSteps: number,
): boolean =>
  record['is_completed'] === true ||
  record['isCompleted'] === true ||
  record['completed'] === true ||
  status === 'completed' ||
  progressPercent >= 100 ||
  (totalSteps > 0 && currentStep >= totalSteps)

const resolveProcessSessionId = (record: Record<string, unknown>): number | undefined =>
  parseNumberLike(record['session_id']) ??
  parseNumberLike(record['sessionId']) ??
  parseNumberLike(record['workflow_id']) ??
  parseNumberLike(record['workflowId'])

export const coerceProcessStatusResponse = (
  payload: unknown,
  taskKey: string,
): ProcessStatusResponse => {
  const rawRecord = toPlainRecord(payload)
  const record = unwrapBackendDataRecord(rawRecord)
  const normalizedWorkflowResult = normalizeWorkflowResultPayload(rawRecord)
  const executionId = pickIdentifierString(record['executionId'], record['id']) || undefined
  const key = pickStatusKey(record, taskKey)
  const steps = normalizeProcessSteps(record)

  const totalSteps =
    parseNumberLike(record['total_steps']) ??
    parseNumberLike(record['totalSteps']) ??
    (steps.length > 0 ? steps.length : 0)
  const currentStep =
    parseNumberLike(record['current_step']) ??
    parseNumberLike(record['currentStep']) ??
    parseNumberLike(record['step']) ??
    0

  const currentStepName = resolveCurrentStepName(record, currentStep, steps)
  const progressPercent = resolveProgressPercent(record, currentStep, totalSteps)
  const statusCandidateRaw = pickStringLike([record['status']], { allowEmpty: true })
  const statusCandidate = coerceWorkflowStatus(statusCandidateRaw)
  const isCompleted = resolveProcessCompletion(
    record,
    statusCandidate,
    progressPercent,
    currentStep,
    totalSteps,
  )
  const sessionId = resolveProcessSessionId(record)

  const outputText = pickStringLike([record['output'], record['outputText']], { allowEmpty: true })

  const rawFileOutputRecords = coerceFileOutputRecords(normalizedWorkflowResult.file_output)

  const answerText = pickStringLike([normalizedWorkflowResult.text], {
    allowEmpty: true,
  })
  const fileUrl = pickFileUrlValue(normalizedWorkflowResult.file_url)
  const errorMessage = pickStringLike([record['error_message'], record['errorMessage']], {
    allowEmpty: true,
  })

  return {
    executionId,
    key,
    current_step: currentStep,
    current_step_name: currentStepName,
    total_steps: totalSteps,
    steps,
    progress_percent: progressPercent,
    is_completed: isCompleted,
    session_id: sessionId,
    answer_text: answerText,
    output: outputText,
    file_output: rawFileOutputRecords.length > 0 ? rawFileOutputRecords : undefined,
    file_url: fileUrl,
    error_message: errorMessage,
    status: statusCandidate,
  }
}
