import type { Session } from '@/types/api'

export type SessionTrackingPhase = 'submitted' | 'resolved' | 'completed' | 'failed' | 'timeout'

export interface SessionTrackingHint {
  taskKey: string
  folderId: number
  title: string
  toolType: string
  submittedAtMs: number
  phase: SessionTrackingPhase
  sessionId?: number
}

export type OptimisticSession = Session & {
  __optimistic?: {
    taskKey: string
    phase: 'submitted' | 'resolved'
    submittedAtMs: number
    sessionId?: number
    interactionLocked: true
  }
}

export type OptimisticSessionsByFolder = Record<number, OptimisticSession[]>
export const OPTIMISTIC_SESSION_TTL_MS = 2 * 60 * 1000

function buildOptimisticSessionId(taskKey: string, folderId: number): number {
  const source = `${folderId}:${taskKey}`
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0
  }
  return -Math.max(1, Math.abs(hash))
}

function normalizeOptimisticPhase(phase: SessionTrackingPhase): 'submitted' | 'resolved' {
  return phase === 'resolved' ? 'resolved' : 'submitted'
}

function sortSessionsByUpdatedAtDesc<T extends Session>(sessions: T[]): T[] {
  return [...sessions].sort(
    (left, right) =>
      new Date(right.updatedAt ?? right.createdAt).getTime() -
      new Date(left.updatedAt ?? left.createdAt).getTime(),
  )
}

function stripEmptyFolders(state: OptimisticSessionsByFolder): OptimisticSessionsByFolder {
  const next: OptimisticSessionsByFolder = {}
  Object.entries(state).forEach(([folderId, sessions]) => {
    if (sessions.length > 0) {
      next[Number(folderId)] = sessions
    }
  })
  return next
}

function isOptimisticSessionExpired(
  session: OptimisticSession,
  nowMs: number,
  ttlMs: number,
): boolean {
  const submittedAtMs = session.__optimistic?.submittedAtMs
  return typeof submittedAtMs === 'number' && nowMs - submittedAtMs >= ttlMs
}

function findOptimisticSessionLocation(
  state: OptimisticSessionsByFolder,
  taskKey: string,
): { folderId: number; session: OptimisticSession } | null {
  for (const [folderId, sessions] of Object.entries(state)) {
    const match = sessions.find((session) => session.__optimistic?.taskKey === taskKey)
    if (match) {
      return {
        folderId: Number(folderId),
        session: match,
      }
    }
  }
  return null
}

export function buildOptimisticSession(hint: SessionTrackingHint): OptimisticSession {
  const timestamp = new Date(hint.submittedAtMs).toISOString()

  return {
    id: buildOptimisticSessionId(hint.taskKey, hint.folderId),
    userId: 0,
    projectId: hint.folderId > 0 ? hint.folderId : undefined,
    title: hint.title,
    toolType: hint.toolType,
    modelVersion: 'optimistic',
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    __optimistic: {
      taskKey: hint.taskKey,
      phase: normalizeOptimisticPhase(hint.phase),
      submittedAtMs: hint.submittedAtMs,
      sessionId: hint.sessionId,
      interactionLocked: true,
    },
  }
}

export function reduceOptimisticSessionsByFolder(
  currentState: OptimisticSessionsByFolder,
  hint: SessionTrackingHint,
): OptimisticSessionsByFolder {
  const located = findOptimisticSessionLocation(currentState, hint.taskKey)

  if (hint.phase === 'failed' || hint.phase === 'timeout') {
    if (!located) {
      return currentState
    }

    const nextState: OptimisticSessionsByFolder = { ...currentState }
    nextState[located.folderId] = (nextState[located.folderId] ?? []).filter(
      (session) => session.__optimistic?.taskKey !== hint.taskKey,
    )
    return stripEmptyFolders(nextState)
  }

  const baseSession = located?.session ?? buildOptimisticSession(hint)
  const nextSession: OptimisticSession = {
    ...baseSession,
    projectId: hint.folderId > 0 ? hint.folderId : undefined,
    title: hint.title || baseSession.title,
    toolType: hint.toolType || baseSession.toolType,
    updatedAt: new Date(hint.submittedAtMs).toISOString(),
    __optimistic: {
      taskKey: hint.taskKey,
      phase:
        hint.phase === 'resolved' || hint.phase === 'completed'
          ? 'resolved'
          : (baseSession.__optimistic?.phase ?? 'submitted'),
      submittedAtMs: hint.submittedAtMs,
      sessionId: hint.sessionId ?? baseSession.__optimistic?.sessionId,
      interactionLocked: true,
    },
  }

  const sourceFolderId = located?.folderId
  const targetFolderId = hint.folderId
  const nextState: OptimisticSessionsByFolder = { ...currentState }

  if (sourceFolderId !== undefined) {
    nextState[sourceFolderId] = (nextState[sourceFolderId] ?? []).filter(
      (session) => session.__optimistic?.taskKey !== hint.taskKey,
    )
  }

  const nextFolderSessions = (nextState[targetFolderId] ?? []).filter(
    (session) => session.__optimistic?.taskKey !== hint.taskKey,
  )
  nextState[targetFolderId] = sortSessionsByUpdatedAtDesc([nextSession, ...nextFolderSessions])

  return stripEmptyFolders(nextState)
}

export function mergeOptimisticSessionsWithServerSessions(
  serverSessions: Session[],
  optimisticSessions: OptimisticSession[],
): Session[] {
  const serverSessionIds = new Set(serverSessions.map((session) => session.id))
  const survivingOptimisticSessions = optimisticSessions.filter((session) => {
    const resolvedSessionId = session.__optimistic?.sessionId
    return resolvedSessionId == null || !serverSessionIds.has(resolvedSessionId)
  })

  return sortSessionsByUpdatedAtDesc([...survivingOptimisticSessions, ...serverSessions])
}

export function pruneExpiredOptimisticSessionsByFolder(params: {
  optimisticSessionsByFolder: OptimisticSessionsByFolder
  nowMs: number
  ttlMs?: number
}): OptimisticSessionsByFolder {
  const { optimisticSessionsByFolder, nowMs, ttlMs = OPTIMISTIC_SESSION_TTL_MS } = params
  let changed = false
  const next: OptimisticSessionsByFolder = {}

  Object.entries(optimisticSessionsByFolder).forEach(([folderKey, sessions]) => {
    const folderId = Number(folderKey)
    const survivingSessions = sessions.filter(
      (session) => !isOptimisticSessionExpired(session, nowMs, ttlMs),
    )

    if (survivingSessions.length !== sessions.length) {
      changed = true
    }

    if (survivingSessions.length > 0) {
      next[folderId] = survivingSessions
    }
  })

  return changed ? next : optimisticSessionsByFolder
}

export function getNextOptimisticSessionExpiryAt(params: {
  optimisticSessionsByFolder: OptimisticSessionsByFolder
  ttlMs?: number
}): number | null {
  const { optimisticSessionsByFolder, ttlMs = OPTIMISTIC_SESSION_TTL_MS } = params
  let nextExpiryAt: number | null = null

  Object.values(optimisticSessionsByFolder).forEach((sessions) => {
    sessions.forEach((session) => {
      const submittedAtMs = session.__optimistic?.submittedAtMs
      if (typeof submittedAtMs !== 'number') {
        return
      }
      const expiryAt = submittedAtMs + ttlMs
      if (nextExpiryAt === null || expiryAt < nextExpiryAt) {
        nextExpiryAt = expiryAt
      }
    })
  })

  return nextExpiryAt
}

export function pruneOptimisticSessionsByFolder(params: {
  optimisticSessionsByFolder: OptimisticSessionsByFolder
  independentSessions: Session[]
  projectSessionsByProject: Record<number, Session[]>
}): OptimisticSessionsByFolder {
  const { optimisticSessionsByFolder, independentSessions, projectSessionsByProject } = params
  const next: OptimisticSessionsByFolder = {}

  Object.entries(optimisticSessionsByFolder).forEach(([folderKey, sessions]) => {
    const folderId = Number(folderKey)
    const serverSessions =
      folderId === 0 ? independentSessions : (projectSessionsByProject[folderId] ?? [])
    const serverSessionIds = new Set(serverSessions.map((session) => session.id))
    const survivingSessions = sessions.filter((session) => {
      const resolvedSessionId = session.__optimistic?.sessionId
      return resolvedSessionId == null || !serverSessionIds.has(resolvedSessionId)
    })

    if (survivingSessions.length > 0) {
      next[folderId] = survivingSessions
    }
  })

  return next
}
