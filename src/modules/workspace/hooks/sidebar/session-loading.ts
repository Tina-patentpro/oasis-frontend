import type { PaginatedResponse, Session } from '@/types/api'

export interface SessionLoadOptions {
  bypassCache?: boolean
}

export interface IndependentSessionPageState {
  page: number
  total: number
  totalPages: number
  isLoading: boolean
  initialized: boolean
}

export interface ProjectSessionPageState {
  page: number
  total: number
  totalPages: number
  isLoading: boolean
  initialized: boolean
  loadingMode: 'initial' | 'refresh' | 'more' | null
}

type WarnLogger = (message: string, detail: Record<string, unknown>) => void

export function mergeSessionsById(prev: Session[], next: Session[]): Session[] {
  const seen = new Set<number>()
  const merged: Session[] = []
  ;[...prev, ...next].forEach((item) => {
    if (seen.has(item.id)) {
      return
    }
    seen.add(item.id)
    merged.push(item)
  })
  return merged
}

export function shouldBypassSessionCache(
  page: number,
  append: boolean,
  options?: SessionLoadOptions,
): boolean {
  return !!options?.bypassCache || (!append && page === 1)
}

export function filterIndependentSessions(
  items: Session[],
  warn: WarnLogger = console.warn,
): Session[] {
  const normalizedItems = items.filter((session) => !session.projectId)
  if (normalizedItems.length !== items.length) {
    const leakedIds = items.filter((session) => !!session.projectId).map((session) => session.id)
    warn('[useWorkspaceSidebar] independent 会话出现 projectId，已过滤', {
      leakedCount: leakedIds.length,
      leakedIds: leakedIds.slice(0, 20),
    })
  }
  return normalizedItems
}

export function filterProjectSessions(
  items: Session[],
  projectId: number,
  warn: WarnLogger = console.warn,
): Session[] {
  const normalizedItems = items.filter((session) => session.projectId === projectId)
  if (normalizedItems.length !== items.length) {
    const leaked = items
      .filter((session) => session.projectId !== projectId)
      .map((session) => ({
        id: session.id,
        projectId: session.projectId ?? null,
      }))
    warn('[useWorkspaceSidebar] project 会话归属异常，已过滤', {
      expectedProjectId: projectId,
      leakedCount: leaked.length,
      leaked: leaked.slice(0, 20),
    })
  }
  return normalizedItems
}

export function buildIndependentSessionLoadingState(
  previous: IndependentSessionPageState,
): IndependentSessionPageState {
  return {
    ...previous,
    isLoading: true,
  }
}

export function buildIndependentSessionLoadedState(
  pagination: PaginatedResponse<Session>['pagination'],
): IndependentSessionPageState {
  return {
    page: pagination.page,
    total: pagination.total,
    totalPages: pagination.totalPages,
    isLoading: false,
    initialized: true,
  }
}

export function buildIndependentSessionErrorState(
  previous: IndependentSessionPageState,
): IndependentSessionPageState {
  return {
    ...previous,
    isLoading: false,
    initialized: previous.initialized,
  }
}

export function buildProjectSessionLoadingState(
  previous: ProjectSessionPageState | undefined,
  append: boolean,
): ProjectSessionPageState {
  const initialized = previous?.initialized ?? false
  return {
    page: previous?.page ?? 0,
    total: previous?.total ?? 0,
    totalPages: previous?.totalPages ?? 0,
    initialized,
    isLoading: true,
    loadingMode: initialized ? (append ? 'more' : 'refresh') : 'initial',
  }
}

export function buildProjectSessionLoadedState(
  pagination: PaginatedResponse<Session>['pagination'],
): ProjectSessionPageState {
  return {
    page: pagination.page,
    total: pagination.total,
    totalPages: pagination.totalPages,
    initialized: true,
    isLoading: false,
    loadingMode: null,
  }
}

export function buildProjectSessionErrorState(
  previous: ProjectSessionPageState | undefined,
): ProjectSessionPageState {
  return {
    page: previous?.page ?? 0,
    total: previous?.total ?? 0,
    totalPages: previous?.totalPages ?? 0,
    initialized: previous?.initialized ?? false,
    isLoading: false,
    loadingMode: null,
  }
}
