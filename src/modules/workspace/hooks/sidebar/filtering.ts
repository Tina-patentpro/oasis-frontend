import { TABS } from '@/constants'
import type { Project } from '@/types/api'

import type { Tab } from '@/hooks/dynamic-tabs'

type ToolVersion = { id?: string; name?: string }
type ToolMeta = { versions?: ToolVersion[] }

type ProjectOrderStatus = 'active' | 'archived'
const PROJECT_ORDER_ANONYMOUS_KEY = 'user-anonymous'

interface ProjectOrderState {
  active: number[]
  archived: number[]
}

const EMPTY_PROJECT_ORDER: ProjectOrderState = {
  active: [],
  archived: [],
}

function uniqueValidIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))]
}

export function getProjectOrderUserKey(userId: number | null | undefined): string {
  if (typeof userId === 'number' && Number.isFinite(userId) && userId >= 0) {
    return `user-${userId}`
  }
  return PROJECT_ORDER_ANONYMOUS_KEY
}

function hasProjectOrderData(order: ProjectOrderState | null | undefined): boolean {
  const normalized = normalizeProjectOrder(order)
  return normalized.active.length > 0 || normalized.archived.length > 0
}

export function canPromoteAnonymousProjectOrder(params: {
  userOrder: ProjectOrderState | null | undefined
  anonymousOrder: ProjectOrderState | null | undefined
}): boolean {
  const { userOrder, anonymousOrder } = params
  if (!hasProjectOrderData(anonymousOrder)) {
    return false
  }
  return !areProjectOrdersEqual(userOrder, anonymousOrder)
}

export function shouldPromoteAnonymousProjectOrder(params: {
  switchedFromAnonymousToUser: boolean
  anonymousOrderChangedInSession: boolean
  userOrder: ProjectOrderState | null | undefined
  anonymousOrder: ProjectOrderState | null | undefined
}): boolean {
  const { switchedFromAnonymousToUser, anonymousOrderChangedInSession, userOrder, anonymousOrder } =
    params
  if (!switchedFromAnonymousToUser || !anonymousOrderChangedInSession) {
    return false
  }
  return canPromoteAnonymousProjectOrder({ userOrder, anonymousOrder })
}

export function shouldPersistReconciledProjectOrder(params: {
  projectTotalPages: number
  projectTotal: number
  rawProjectCount: number
}): boolean {
  const { projectTotalPages, projectTotal, rawProjectCount } = params
  if (projectTotalPages <= 0) {
    return false
  }
  if (projectTotal > 0 && rawProjectCount <= 0) {
    return false
  }
  return true
}

export function reorderProjectIds(ids: number[], sourceId: number, targetId: number): number[] {
  if (sourceId === targetId) {
    return ids
  }
  const sourceIndex = ids.indexOf(sourceId)
  const targetIndex = ids.indexOf(targetId)
  if (sourceIndex < 0 || targetIndex < 0) {
    return ids
  }

  const next = [...ids]
  const [moved] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

function reorderProjectIdsWithPlacement(
  ids: number[],
  sourceId: number,
  targetId: number,
  placement: 'before' | 'after' = 'before',
): number[] {
  if (sourceId === targetId) {
    return ids
  }
  const sourceIndex = ids.indexOf(sourceId)
  const targetIndex = ids.indexOf(targetId)
  if (sourceIndex < 0 || targetIndex < 0) {
    return ids
  }

  const next = [...ids]
  const [moved] = next.splice(sourceIndex, 1)
  const currentTargetIndex = next.indexOf(targetId)
  if (currentTargetIndex < 0) {
    return ids
  }
  const insertIndex = placement === 'after' ? currentTargetIndex + 1 : currentTargetIndex
  next.splice(insertIndex, 0, moved)
  return next
}

function normalizeProjectOrder(order: ProjectOrderState | null | undefined): ProjectOrderState {
  if (!order) {
    return EMPTY_PROJECT_ORDER
  }
  return {
    active: uniqueValidIds(order.active ?? []),
    archived: uniqueValidIds(order.archived ?? []),
  }
}

export function reconcileProjectOrder(
  projects: Project[],
  order: ProjectOrderState | null | undefined,
): ProjectOrderState {
  const normalized = normalizeProjectOrder(order)
  const activeIds = projects
    .filter((project) => project.status === 'active')
    .map((project) => project.id)
  const archivedIds = projects
    .filter((project) => project.status === 'archived')
    .map((project) => project.id)
  const activeSet = new Set(activeIds)
  const archivedSet = new Set(archivedIds)

  const nextActive = normalized.active.filter((id) => activeSet.has(id))
  activeIds.forEach((id) => {
    if (!nextActive.includes(id)) {
      nextActive.push(id)
    }
  })

  const nextArchived = normalized.archived.filter((id) => archivedSet.has(id))
  archivedIds.forEach((id) => {
    if (!nextArchived.includes(id)) {
      nextArchived.push(id)
    }
  })

  return {
    active: nextActive,
    archived: nextArchived,
  }
}

export function areProjectOrdersEqual(
  left: ProjectOrderState | null | undefined,
  right: ProjectOrderState | null | undefined,
): boolean {
  const a = normalizeProjectOrder(left)
  const b = normalizeProjectOrder(right)
  if (a.active.length !== b.active.length || a.archived.length !== b.archived.length) {
    return false
  }
  for (let index = 0; index < a.active.length; index += 1) {
    if (a.active[index] !== b.active[index]) {
      return false
    }
  }
  for (let index = 0; index < a.archived.length; index += 1) {
    if (a.archived[index] !== b.archived[index]) {
      return false
    }
  }
  return true
}

export function applyProjectOrder(projects: Project[], order: ProjectOrderState): Project[] {
  const normalized = normalizeProjectOrder(order)
  const rank = new Map<number, number>()
  let cursor = 0

  normalized.active.forEach((id) => {
    rank.set(id, cursor)
    cursor += 1
  })
  normalized.archived.forEach((id) => {
    rank.set(id, cursor)
    cursor += 1
  })

  return [...projects].sort((left, right) => {
    const leftRank = rank.get(left.id)
    const rightRank = rank.get(right.id)
    if (leftRank == null && rightRank == null) {
      return 0
    }
    if (leftRank == null) {
      return 1
    }
    if (rightRank == null) {
      return -1
    }
    return leftRank - rightRank
  })
}

export function reorderProjectOrderByStatus(
  order: ProjectOrderState,
  status: ProjectOrderStatus,
  sourceId: number,
  targetId: number,
  placement?: 'before' | 'after',
): ProjectOrderState {
  const ids = status === 'active' ? order.active : order.archived
  const nextIds =
    placement != null
      ? reorderProjectIdsWithPlacement(ids, sourceId, targetId, placement)
      : reorderProjectIds(ids, sourceId, targetId)

  if (status === 'active') {
    return { ...order, active: nextIds }
  }
  return { ...order, archived: nextIds }
}

export function buildAvailableTabs(
  dynamicTabs: Tab[],
  groupVisibility: Record<string, boolean>,
  toolVisibility: Record<string, boolean>,
): Tab[] {
  const baseTabs = dynamicTabs.length > 0 ? dynamicTabs : TABS
  const filtered = baseTabs
    .filter((item) => groupVisibility[item.k] !== false)
    .map((item) => ({
      ...item,
      tools: item.tools.filter((toolName) => toolVisibility[toolName] !== false),
    }))
    .filter((item) => item.tools.length > 0)

  return filtered.length > 0 ? filtered : baseTabs
}

export function filterToolMetadataByModelVisibility<T extends ToolMeta>(
  toolMetadataByName: Record<string, T>,
  modelVisibility: Record<string, Record<string, boolean>>,
): Record<string, T> {
  const next = {} as Record<string, T>
  Object.entries(toolMetadataByName).forEach(([toolName, meta]) => {
    if (!meta) {
      return
    }
    const visibleModels = modelVisibility[toolName]
    const versions =
      meta.versions?.filter((version) => {
        const key = version.id ?? version.name
        if (!key) return true
        return visibleModels ? visibleModels[key] !== false : true
      }) ?? []

    next[toolName] = { ...meta, versions }
  })
  return next
}
