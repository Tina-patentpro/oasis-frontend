import type { Project } from '@/types/api'

import { isRecord } from '../validation'

export function parseProjectId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return undefined
}

export function parseNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }

  return undefined
}

function parseBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 1) {
      return true
    }
    if (value === 0) {
      return false
    }
  }

  if (typeof value === 'string' && value.trim()) {
    const lowered = value.trim().toLowerCase()
    if (lowered === '1' || lowered === 'true') {
      return true
    }
    if (lowered === '0' || lowered === 'false') {
      return false
    }
  }

  return undefined
}

function parseStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function extractItems(container: unknown): unknown[] {
  if (!isRecord(container)) {
    return []
  }
  if (Array.isArray(container['items'])) {
    return container['items']
  }
  if (Array.isArray(container['item'])) {
    return container['item']
  }
  return []
}

export interface FolderListPayload {
  items: unknown[]
  total?: number
  serverPaginated: boolean
}

export function extractFolderListPayload(payload: unknown): FolderListPayload {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
      serverPaginated: false,
    }
  }

  if (!isRecord(payload)) {
    return {
      items: [],
      total: 0,
      serverPaginated: false,
    }
  }

  const directItems = extractItems(payload)
  if (directItems.length > 0 || Object.prototype.hasOwnProperty.call(payload, 'items')) {
    return {
      items: directItems,
      total: parseNonNegativeNumber(payload['total']) ?? directItems.length,
      serverPaginated: true,
    }
  }

  const nestedData = payload['data']
  if (Array.isArray(nestedData)) {
    return {
      items: nestedData,
      total: nestedData.length,
      serverPaginated: false,
    }
  }

  const nestedItems = extractItems(nestedData)
  if (
    nestedItems.length > 0 ||
    (isRecord(nestedData) && Object.prototype.hasOwnProperty.call(nestedData, 'items'))
  ) {
    const nestedTotal = isRecord(nestedData)
      ? parseNonNegativeNumber(nestedData['total'])
      : undefined
    return {
      items: nestedItems,
      total: nestedTotal ?? nestedItems.length,
      serverPaginated: true,
    }
  }

  return {
    items: [],
    total: 0,
    serverPaginated: false,
  }
}

export function resolveProjectIdFromCreateResponse(payload: unknown): number | undefined {
  if (!isRecord(payload)) {
    return undefined
  }

  const direct =
    parseProjectId(payload['id']) ??
    parseProjectId(payload['folder_id']) ??
    parseProjectId(payload['project_id'])
  if (typeof direct === 'number') {
    return direct
  }

  const nested = payload['data']
  if (!isRecord(nested)) {
    return undefined
  }

  return (
    parseProjectId(nested['id']) ??
    parseProjectId(nested['folder_id']) ??
    parseProjectId(nested['project_id'])
  )
}

function normalizeCount(value: unknown): number | undefined {
  return parseNonNegativeNumber(value)
}

export function resolveSessionCount(payload: {
  session_count?: unknown
  project_count?: unknown
}): number | undefined {
  return normalizeCount(payload.project_count) ?? normalizeCount(payload.session_count)
}

export function mapFolderToProject(item: unknown, fallbackId?: number): Project | null {
  if (!isRecord(item)) {
    return null
  }

  const id = parseProjectId(item['id']) ?? fallbackId
  if (typeof id !== 'number' || !Number.isFinite(id) || id <= 0) {
    return null
  }

  const now = new Date().toISOString()
  const customerName =
    parseStringValue(item['coustomer_name']) ?? parseStringValue(item['customer_name']) ?? ''
  const createdAt = parseStringValue(item['created_at']) ?? now
  const updatedAt = parseStringValue(item['updated_at']) ?? createdAt
  const ownerId = parseNonNegativeNumber(item['owner_id']) ?? 0
  const archiveValue = parseNonNegativeNumber(item['archive']) ?? 0
  const parentId = parseNonNegativeNumber(item['parent_id']) ?? 0
  const childCount = normalizeCount(item['child_count'])
  const hasChildren =
    parseBooleanLike(item['has_children']) ?? (childCount ? childCount > 0 : false)
  const name = parseStringValue(item['name']) ?? `项目-${id}`

  return {
    id,
    userId: 0,
    ownerId,
    name,
    parentId,
    childCount,
    hasChildren,
    customerName,
    description: '',
    status: archiveValue === 1 ? 'archived' : 'active',
    sessionCount: resolveSessionCount({
      project_count: item['project_count'],
      session_count: item['session_count'],
    }),
    createdAt,
    updatedAt,
  }
}

export function toProjectSortTime(project: Pick<Project, 'updatedAt' | 'createdAt'>): number {
  const updated = Date.parse(project.updatedAt)
  if (Number.isFinite(updated)) {
    return updated
  }
  const created = Date.parse(project.createdAt)
  return Number.isFinite(created) ? created : 0
}
