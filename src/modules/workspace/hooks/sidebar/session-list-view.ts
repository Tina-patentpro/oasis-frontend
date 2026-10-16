import type { Project, Session } from '@/types/api'

import type { IndependentSessionPageState, ProjectSessionPageState } from './session-loading'

export interface ProjectSessionPaginationView {
  initialized: boolean
  isLoading: boolean
  isInitialLoading: boolean
  isRefreshing: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadedCount: number
  total: number
}

interface NonOverlappingProjectSessionsParams {
  independentSessions: Session[]
  projectSessionsByProject: Record<number, Session[]>
}

interface MergedSessionListParams {
  independentSessions: Session[]
  projectSessionsByProject: Record<number, Session[]>
  legacyProjectLinkedSessions: Session[]
}

interface ProjectSessionPaginationParams {
  projectList: Project[]
  projectSessionPageState: Record<number, ProjectSessionPageState>
  projectSessionsByProject: Record<number, Session[]>
}

interface IndependentSessionPaginationParams {
  pageState: IndependentSessionPageState
  visibleIndependentSessionCount: number
}

interface ProjectsVisibleInSessionsParams {
  projectList: Project[]
  rootProjects: Project[]
  activeProjectCache: Project[]
  visibleProjectIdSet: Set<number>
}

interface FilteredProjectSessionsParams {
  filteredProjects: Project[]
  visibleProjectSessions: Record<number, Session[]>
}

export function buildStandaloneSessions(sessions: Session[]): Session[] {
  return sessions.filter((session) => !session.projectId)
}

export function buildNonOverlappingProjectSessions({
  independentSessions,
  projectSessionsByProject,
}: NonOverlappingProjectSessionsParams): Record<number, Session[]> {
  const independentSessionIdSet = new Set(independentSessions.map((session) => session.id))
  const next: Record<number, Session[]> = {}

  Object.entries(projectSessionsByProject).forEach(([projectId, sessions]) => {
    next[Number(projectId)] = sessions.filter((session) => !independentSessionIdSet.has(session.id))
  })
  return next
}

export function buildMergedSessionList({
  independentSessions,
  projectSessionsByProject,
  legacyProjectLinkedSessions,
}: MergedSessionListParams): Session[] {
  const merged = [
    ...independentSessions,
    ...Object.values(projectSessionsByProject).flat(),
    ...legacyProjectLinkedSessions,
  ]
  const byId = new Map<number, Session>()
  merged.forEach((session) => {
    if (!byId.has(session.id)) {
      byId.set(session.id, session)
    }
  })
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function buildProjectSessionPaginationByProject({
  projectList,
  projectSessionPageState,
  projectSessionsByProject,
}: ProjectSessionPaginationParams): Record<number, ProjectSessionPaginationView> {
  const view: Record<number, ProjectSessionPaginationView> = {}
  const ids = new Set<number>(projectList.map((project) => project.id))

  ids.forEach((projectId) => {
    const state = projectSessionPageState[projectId]
    const loadedCount = projectSessionsByProject[projectId]?.length ?? 0
    view[projectId] = {
      initialized: state?.initialized ?? false,
      isLoading: state?.isLoading ?? false,
      isInitialLoading: (state?.isLoading ?? false) && state?.loadingMode === 'initial',
      isRefreshing: (state?.isLoading ?? false) && state?.loadingMode === 'refresh',
      isLoadingMore: (state?.isLoading ?? false) && state?.loadingMode === 'more',
      hasMore: state ? state.page < state.totalPages : false,
      loadedCount,
      total: state?.total ?? loadedCount,
    }
  })

  return view
}

export function buildIndependentSessionPagination({
  pageState,
  visibleIndependentSessionCount,
}: IndependentSessionPaginationParams): ProjectSessionPaginationView {
  return {
    initialized: pageState.initialized,
    isLoading: pageState.isLoading,
    isInitialLoading: pageState.isLoading && !pageState.initialized,
    isRefreshing: pageState.isLoading && pageState.initialized && pageState.page <= 1,
    isLoadingMore: pageState.isLoading && pageState.initialized && pageState.page > 1,
    hasMore: pageState.page < pageState.totalPages,
    loadedCount: visibleIndependentSessionCount,
    total: Math.max(pageState.total, visibleIndependentSessionCount),
  }
}

export function buildProjectsVisibleInSessions({
  projectList,
  rootProjects,
  activeProjectCache,
  visibleProjectIdSet,
}: ProjectsVisibleInSessionsParams): Project[] {
  if (visibleProjectIdSet.size === 0) {
    return projectList
  }

  const orderedProjects = [...projectList]
  const knownProjects = [...rootProjects, ...activeProjectCache]
  const seenProjectIds = new Set<number>(orderedProjects.map((project) => project.id))

  knownProjects.forEach((project) => {
    if (!visibleProjectIdSet.has(project.id) || seenProjectIds.has(project.id)) {
      return
    }
    orderedProjects.push(project)
    seenProjectIds.add(project.id)
  })

  return orderedProjects
}

export function buildFilteredProjectSessions({
  filteredProjects,
  visibleProjectSessions,
}: FilteredProjectSessionsParams): Record<number, Session[]> {
  const next: Record<number, Session[]> = {}
  filteredProjects.forEach((project) => {
    next[project.id] = visibleProjectSessions[project.id] ?? []
  })
  return next
}
