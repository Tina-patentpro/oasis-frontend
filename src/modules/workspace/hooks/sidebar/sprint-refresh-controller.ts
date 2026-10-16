import type { Session } from '@/types/api'

import type { SessionTrackingHint } from './optimistic-session'
import {
  buildSessionRefreshDigest,
  detectSessionRefreshSignal,
  type SessionRefreshDigest,
} from './session-refresh-signature'

export interface SprintRefreshController {
  startSprintRefresh: (folderId: number) => void
  stopSprintRefresh: (folderId: number) => void
  handleSessionHint: (hint: SessionTrackingHint) => Promise<void>
  cleanup: () => void
}

export function createSprintRefreshController(params: {
  intervalMs: number
  maxDurationMs: number
  weakSignalHitsToStop: number
  getFolderSessionsSnapshot: (folderId: number) => Session[]
  refreshFolderSessionsOnce: (folderId: number) => Promise<void>
  refreshSessions: () => Promise<void>
}): SprintRefreshController {
  const {
    intervalMs,
    maxDurationMs,
    weakSignalHitsToStop,
    getFolderSessionsSnapshot,
    refreshFolderSessionsOnce,
    refreshSessions,
  } = params

  let stopped = false
  const intervalByFolder: Record<number, number> = {}
  const startedAtByFolder: Record<number, number> = {}
  const weakHitsByFolder: Record<number, number> = {}
  const inFlightByFolder: Record<number, boolean> = {}
  const baselineByFolder: Record<number, SessionRefreshDigest> = {}
  const generationByFolder: Record<number, number> = {}

  const stopSprintRefresh = (folderId: number) => {
    const intervalId = intervalByFolder[folderId]
    if (intervalId) {
      window.clearInterval(intervalId)
    }
    delete intervalByFolder[folderId]
    delete startedAtByFolder[folderId]
    delete weakHitsByFolder[folderId]
    delete inFlightByFolder[folderId]
    delete baselineByFolder[folderId]
    delete generationByFolder[folderId]
  }

  const executeSprintRefreshTick = async (folderId: number, generation: number) => {
    if (generationByFolder[folderId] !== generation) {
      return
    }
    const startedAt = startedAtByFolder[folderId]
    if (!startedAt) {
      return
    }
    if (Date.now() - startedAt >= maxDurationMs) {
      stopSprintRefresh(folderId)
      return
    }
    if (inFlightByFolder[folderId]) {
      return
    }

    inFlightByFolder[folderId] = true
    try {
      await refreshFolderSessionsOnce(folderId)
      if (stopped || !startedAtByFolder[folderId] || generationByFolder[folderId] !== generation) {
        return
      }
      const baseline = baselineByFolder[folderId]
      if (!baseline) {
        return
      }
      const latestDigest = buildSessionRefreshDigest(getFolderSessionsSnapshot(folderId))
      const signal = detectSessionRefreshSignal(baseline, latestDigest)
      if (signal === 'strong') {
        stopSprintRefresh(folderId)
        return
      }
      if (signal === 'weak') {
        const nextWeakHits = (weakHitsByFolder[folderId] ?? 0) + 1
        weakHitsByFolder[folderId] = nextWeakHits
        if (nextWeakHits >= weakSignalHitsToStop) {
          stopSprintRefresh(folderId)
          return
        }
      } else {
        weakHitsByFolder[folderId] = 0
      }
    } catch (error) {
      console.warn('[useWorkspaceSidebar] sprint refresh failed:', error)
    } finally {
      if (generationByFolder[folderId] === generation) {
        inFlightByFolder[folderId] = false
      }
    }

    if (generationByFolder[folderId] !== generation) {
      return
    }
    if (Date.now() - startedAt >= maxDurationMs) {
      stopSprintRefresh(folderId)
    }
  }

  const startSprintRefresh = (folderId: number) => {
    if (stopped) {
      return
    }
    if (!Number.isFinite(folderId) || folderId < 0) {
      return
    }
    const generation = (generationByFolder[folderId] ?? 0) + 1
    stopSprintRefresh(folderId)
    generationByFolder[folderId] = generation
    baselineByFolder[folderId] = buildSessionRefreshDigest(getFolderSessionsSnapshot(folderId))
    startedAtByFolder[folderId] = Date.now()
    weakHitsByFolder[folderId] = 0
    inFlightByFolder[folderId] = false
    intervalByFolder[folderId] = window.setInterval(() => {
      void executeSprintRefreshTick(folderId, generation)
    }, intervalMs)
    void executeSprintRefreshTick(folderId, generation)
  }

  const handleSessionHint = async (hint: SessionTrackingHint) => {
    if (hint.phase === 'submitted' || hint.phase === 'resolved') {
      startSprintRefresh(hint.folderId)
      return
    }

    stopSprintRefresh(hint.folderId)
    if (hint.phase === 'completed') {
      await refreshSessions()
    }
  }

  return {
    startSprintRefresh,
    stopSprintRefresh,
    handleSessionHint,
    cleanup: () => {
      stopped = true
      Object.keys(intervalByFolder).forEach((folderKey) => {
        stopSprintRefresh(Number(folderKey))
      })
    },
  }
}
