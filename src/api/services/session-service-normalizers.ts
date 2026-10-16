import type { FileUrl, ListSessionsParams, Session, SessionDetail } from '@/types/api'
import { normalizeFileUrlValue } from '@/utils/file-url'
import { normalizeWorkflowResultPayload } from '@/utils/workflow-result'
import {
  extractConversationId,
  parseChatflowInputType,
  resolveChatflowToolType,
} from '@/constants/tabs'

export interface ProjectListRawItem {
  id: number
  name?: string
  api_name?: string
  user_id?: number
  folder_id?: unknown
  created_at: string
  type?: number
  answer?: string
  answer_text?: string
  response?: unknown
  file_output?: Array<Record<string, unknown>>
  file_url?: FileUrl | null
  inputs?: Record<string, unknown> | string
}

interface SessionDetailRaw {
  id?: number
  user_id?: number
  folder_id?: unknown
  api_name?: string
  name?: string
  type?: number
  created_at?: string
  updated_at?: string
  answer_text?: string
  file_output?: Array<Record<string, unknown>>
  file_url?: FileUrl | null
  inputs?: Record<string, unknown> | string
  response?: unknown
  data?: { inputs?: Record<string, unknown> | string; response?: unknown }
}

export function normalizeFolderId(folderId: unknown): number | null {
  if (folderId === null || folderId === undefined || folderId === '') {
    return null
  }

  const parsed = typeof folderId === 'number' ? folderId : Number(folderId)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

function normalizeProjectIdField(raw: { folder_id?: unknown }): number | null | undefined {
  return Object.prototype.hasOwnProperty.call(raw, 'folder_id')
    ? normalizeFolderId(raw.folder_id)
    : undefined
}

function normalizeFileUrlField(value: unknown): FileUrl | undefined {
  return normalizeFileUrlValue(value)
}

function pickFileUrlFromCandidates(values: unknown[]): FileUrl | undefined {
  for (const value of values) {
    const normalized = normalizeFileUrlField(value)
    if (normalized !== undefined) {
      return normalized
    }
  }
  return undefined
}

function parseInputs(rawInputs: unknown, errorPrefix: string): Record<string, unknown> | undefined {
  if (typeof rawInputs === 'object' && rawInputs !== null && !Array.isArray(rawInputs)) {
    return rawInputs as Record<string, unknown>
  }

  if (typeof rawInputs === 'string') {
    try {
      return JSON.parse(rawInputs) as Record<string, unknown>
    } catch {
      console.error(errorPrefix)
    }
  }

  return undefined
}

function extractConversationIdFromResponse(value: unknown): string | null {
  let parsed = value
  if (typeof value === 'string' && value.trim()) {
    try {
      parsed = JSON.parse(value) as Record<string, unknown>
    } catch {
      return null
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const conversationId = (parsed as Record<string, unknown>).conversation_id
  return typeof conversationId === 'string' && conversationId.trim()
    ? conversationId.trim()
    : null
}

function normalizeConversationId(value: string | null): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function resolveSessionConversationId(
  inputs: Record<string, unknown> | undefined,
  response: unknown,
): string | null {
  return (
    normalizeConversationId(extractConversationId(inputs ?? null)) ||
    extractConversationIdFromResponse(response)
  )
}

function resolveSessionToolType(
  type: number | undefined,
  inputs: Record<string, unknown> | undefined,
  conversationId: string | null,
): string {
  if (typeof type === 'number') {
    return type === 2
      ? resolveChatflowToolType(
          inputs !== null && inputs !== undefined ? parseChatflowInputType(inputs.type) : undefined,
        )
      : 'workflow'
  }

  if (!conversationId) {
    return 'workflow'
  }

  return resolveChatflowToolType(
    inputs !== null && inputs !== undefined ? parseChatflowInputType(inputs.type) : undefined,
  )
}

export function extractProjectListItems(payload: {
  items?: ProjectListRawItem[]
  item?: ProjectListRawItem[]
}): ProjectListRawItem[] {
  if (Array.isArray(payload?.items)) {
    return payload.items
  }
  if (Array.isArray(payload?.item)) {
    return payload.item
  }
  return []
}

export function dedupeProjectListItems(items: ProjectListRawItem[]): ProjectListRawItem[] {
  if (items.length <= 1) {
    return items
  }

  const seen = new Set<number>()
  const deduped: ProjectListRawItem[] = []

  items.forEach((item) => {
    if (seen.has(item.id)) {
      return
    }
    seen.add(item.id)
    deduped.push(item)
  })

  return deduped
}

export function mapProjectListItemToSession(item: ProjectListRawItem): Session {
  const normalizedWorkflowResult = normalizeWorkflowResultPayload(item)
  const parsedInputs = parseInputs(
    item.inputs,
    '[SessionService] Failed to parse inputs as JSON:',
  )
  const conversationId = resolveSessionConversationId(parsedInputs, item.response)
  const title = item.name || item.api_name || '未命名项目'

  return {
    id: item.id,
    userId: item.user_id ?? 0,
    projectId: normalizeProjectIdField(item),
    title,
    toolType: resolveSessionToolType(item.type, parsedInputs, conversationId),
    modelVersion: 'fast',
    status: 'completed' as const,
    createdAt: item.created_at,
    updatedAt: item.created_at,
    type: item.type,
    answer_text: normalizedWorkflowResult.text,
    file_url: normalizeFileUrlField(normalizedWorkflowResult.file_url),
    file_output: normalizedWorkflowResult.file_output,
    api_name: item.api_name || title,
    inputs: parsedInputs,
    conversationId,
  }
}

export function applySessionFilters(sessions: Session[], params?: ListSessionsParams): Session[] {
  let filteredSessions = sessions

  if (params?.type === 'independent') {
    filteredSessions = filteredSessions.filter((session) => !session.projectId)
  } else if (params?.type === 'projectLinked') {
    filteredSessions = filteredSessions.filter((session) => !!session.projectId)
  }

  if (params?.projectId !== undefined) {
    filteredSessions = filteredSessions.filter((session) => session.projectId === params.projectId)
  }

  if (params?.status) {
    filteredSessions = filteredSessions.filter((session) => session.status === params.status)
  }

  return filteredSessions
}

export function sortSessions(sessions: Session[], params?: ListSessionsParams): Session[] {
  const sorted = [...sessions]
  if (params?.sortBy) {
    sorted.sort((a, b) => {
      const aVal = a[params.sortBy as keyof Session]
      const bVal = b[params.sortBy as keyof Session]
      const order = params.sortOrder === 'desc' ? -1 : 1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order * aVal.localeCompare(bVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order * (aVal - bVal)
      }
      return 0
    })
  } else {
    sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  return sorted
}

export function extractSessionDetailRaw(response: unknown): SessionDetailRaw {
  const wrapper = response as { data?: SessionDetailRaw } | SessionDetailRaw | null | undefined
  return wrapper && typeof wrapper === 'object' && 'data' in wrapper && wrapper.data
    ? wrapper.data
    : ((wrapper as SessionDetailRaw) ?? {})
}

export function mapSessionDetailRawToDetail(data: SessionDetailRaw, fallbackId: number): SessionDetail {
  const normalizedWorkflowResult = normalizeWorkflowResultPayload(data)
  const parsedInputs =
    parseInputs(data.inputs, '[SessionService] getSession failed to parse inputs:') ||
    parseInputs(data.data?.inputs, '[SessionService] getSession failed to parse inputs:')

  const conversationId = resolveSessionConversationId(
    parsedInputs,
    data.response ?? data.data?.response,
  )

  return {
    id: data.id || fallbackId,
    userId: data.user_id || 0,
    projectId: normalizeProjectIdField(data),
    title: data.api_name || data.name || '',
    toolType: resolveSessionToolType(data.type, parsedInputs, conversationId),
    modelVersion: 'fast',
    status: 'completed',
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.created_at || new Date().toISOString(),
    type: data.type,
    answer_text: normalizedWorkflowResult.text || '',
    file_url: pickFileUrlFromCandidates([normalizedWorkflowResult.file_url]),
    file_output: normalizedWorkflowResult.file_output,
    api_name: data.api_name,
    inputs: parsedInputs,
    conversationId,
  }
}
