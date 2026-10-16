import type { Project, Session } from '@/types/api'

interface IndependentSessionPageStateLike {
  page: number
  total: number
  totalPages: number
  isLoading: boolean
  initialized: boolean
}

interface ProjectSessionPageStateLike {
  page: number
  total: number
  totalPages: number
  isLoading: boolean
  initialized: boolean
  loadingMode: 'initial' | 'refresh' | 'more' | null
}

interface SessionAssociationState {
  independentSessions: Session[]
  independentSessionsSnapshot: Session[]
  independentSessionPageState: IndependentSessionPageStateLike
  projectSessionsByProject: Record<number, Session[]>
  projectSessionsSnapshot: Record<number, Session[]>
  projectSessionPageState: Record<number, ProjectSessionPageStateLike>
  projectSessionCountOverrides: Record<number, number>
  legacyProjectLinkedSessions: Session[]
}

interface ReconcileSessionAssociationStateParams {
  session: Session
  targetProjectId: number | null
  pageSize: number
  projects: Project[]
  state: SessionAssociationState
}

function removeSessionById(items: Session[], sessionId: number): Session[] {
  return items.filter((item) => item.id !== sessionId)
}

function prependUniqueSession(items: Session[], session: Session): Session[] {
  return [session, ...items.filter((item) => item.id !== session.id)]
}

function computeTotalPages(total: number, pageSize: number): number {
  if (total <= 0) {
    return 0
  }
  return Math.ceil(total / pageSize)
}

function normalizePage(page: number, totalPages: number, initialized: boolean): number {
  if (totalPages <= 0) {
    return initialized ? 1 : 0
  }
  return Math.min(Math.max(page, 1), totalPages)
}

function resolveProjectCount(
  projectId: number,
  state: SessionAssociationState,
  projects: Project[],
): number {
  const overrideCount = state.projectSessionCountOverrides[projectId]
  if (typeof overrideCount === 'number') {
    return overrideCount
  }

  const pageTotal = state.projectSessionPageState[projectId]?.total
  if (typeof pageTotal === 'number' && Number.isFinite(pageTotal) && pageTotal >= 0) {
    return pageTotal
  }

  const project = projects.find((item) => item.id === projectId)
  if (typeof project?.sessionCount === 'number') {
    return project.sessionCount
  }

  const snapshotCount = state.projectSessionsSnapshot[projectId]?.length
  if (typeof snapshotCount === 'number') {
    return snapshotCount
  }

  return state.projectSessionsByProject[projectId]?.length ?? 0
}

function updateProjectCount(
  nextState: SessionAssociationState,
  originalState: SessionAssociationState,
  projectId: number,
  delta: number,
  pageSize: number,
  projects: Project[],
): void {
  const baseCount = resolveProjectCount(projectId, originalState, projects)
  const nextTotal = Math.max(0, baseCount + delta)
  nextState.projectSessionCountOverrides[projectId] = nextTotal

  const currentPageState = nextState.projectSessionPageState[projectId]
  if (!currentPageState) {
    return
  }

  const nextTotalPages = computeTotalPages(nextTotal, pageSize)
  nextState.projectSessionPageState[projectId] = {
    ...currentPageState,
    total: nextTotal,
    totalPages: nextTotalPages,
    page: normalizePage(currentPageState.page, nextTotalPages, currentPageState.initialized),
  }
}

function updateIndependentCount(
  nextState: SessionAssociationState,
  originalState: SessionAssociationState,
  delta: number,
  pageSize: number,
): void {
  const currentPageState = nextState.independentSessionPageState
  const baseCount = Math.max(
    originalState.independentSessionPageState.total,
    originalState.independentSessions.length,
  )
  const nextTotal = Math.max(0, baseCount + delta)
  const nextTotalPages = computeTotalPages(nextTotal, pageSize)

  nextState.independentSessionPageState = {
    ...currentPageState,
    total: nextTotal,
    totalPages: nextTotalPages,
    page: normalizePage(currentPageState.page, nextTotalPages, currentPageState.initialized),
  }
}

function findSourceProjectId(session: Session, state: SessionAssociationState): number | null {
  if (typeof session.projectId === 'number') {
    return session.projectId
  }

  for (const [projectId, sessions] of Object.entries(state.projectSessionsByProject)) {
    if (sessions.some((item) => item.id === session.id)) {
      return Number(projectId)
    }
  }

  for (const [projectId, sessions] of Object.entries(state.projectSessionsSnapshot)) {
    if (sessions.some((item) => item.id === session.id)) {
      return Number(projectId)
    }
  }

  const legacySession = state.legacyProjectLinkedSessions.find((item) => item.id === session.id)
  return legacySession?.projectId ?? null
}

function buildAssociatedSession(session: Session, targetProjectId: number | null): Session {
  const nextSession = { ...session }
  if (targetProjectId === null) {
    delete nextSession.projectId
    return nextSession
  }

  nextSession.projectId = targetProjectId
  return nextSession
}

export function reconcileSessionAssociationState({
  session,
  targetProjectId,
  pageSize,
  projects,
  state,
}: ReconcileSessionAssociationStateParams): SessionAssociationState {
  const sourceProjectId = findSourceProjectId(session, state)
  const nextSession = buildAssociatedSession(session, targetProjectId)

  const nextState: SessionAssociationState = {
    independentSessions: removeSessionById(state.independentSessions, session.id),
    independentSessionsSnapshot: removeSessionById(state.independentSessionsSnapshot, session.id),
    independentSessionPageState: { ...state.independentSessionPageState },
    projectSessionsByProject: {},
    projectSessionsSnapshot: {},
    projectSessionPageState: { ...state.projectSessionPageState },
    projectSessionCountOverrides: { ...state.projectSessionCountOverrides },
    legacyProjectLinkedSessions: removeSessionById(state.legacyProjectLinkedSessions, session.id),
  }

  Object.entries(state.projectSessionsByProject).forEach(([projectId, sessions]) => {
    nextState.projectSessionsByProject[Number(projectId)] = removeSessionById(sessions, session.id)
  })

  Object.entries(state.projectSessionsSnapshot).forEach(([projectId, sessions]) => {
    nextState.projectSessionsSnapshot[Number(projectId)] = removeSessionById(sessions, session.id)
  })

  if (sourceProjectId !== null && sourceProjectId !== targetProjectId) {
    updateProjectCount(nextState, state, sourceProjectId, -1, pageSize, projects)
  }

  if (targetProjectId === null) {
    nextState.independentSessions = prependUniqueSession(nextState.independentSessions, nextSession)
    nextState.independentSessionsSnapshot = prependUniqueSession(
      nextState.independentSessionsSnapshot,
      nextSession,
    )

    if (sourceProjectId !== null) {
      updateIndependentCount(nextState, state, 1, pageSize)
    }

    return nextState
  }

  if (sourceProjectId === null) {
    updateIndependentCount(nextState, state, -1, pageSize)
  }

  if (sourceProjectId !== targetProjectId) {
    updateProjectCount(nextState, state, targetProjectId, 1, pageSize, projects)
  }

  const targetProjectLoaded =
    Object.prototype.hasOwnProperty.call(nextState.projectSessionsByProject, targetProjectId) ||
    Object.prototype.hasOwnProperty.call(nextState.projectSessionsSnapshot, targetProjectId) ||
    (nextState.projectSessionPageState[targetProjectId]?.initialized ?? false)

  if (targetProjectLoaded) {
    nextState.projectSessionsByProject[targetProjectId] = prependUniqueSession(
      nextState.projectSessionsByProject[targetProjectId] ?? [],
      nextSession,
    )
    nextState.projectSessionsSnapshot[targetProjectId] = prependUniqueSession(
      nextState.projectSessionsSnapshot[targetProjectId] ?? [],
      nextSession,
    )
  }

  nextState.legacyProjectLinkedSessions = prependUniqueSession(
    nextState.legacyProjectLinkedSessions,
    nextSession,
  )

  return nextState
}
