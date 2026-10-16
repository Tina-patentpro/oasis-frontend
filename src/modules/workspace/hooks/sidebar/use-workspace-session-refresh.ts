import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'

import type { Session } from '@/types/api'

import {
  reduceOptimisticSessionsByFolder,
  type OptimisticSessionsByFolder,
  type SessionTrackingHint,
} from './optimistic-session'
import { getInitializedProjectSessionIds } from './session-refresh-targets'
import { useSessionRefreshBindings } from './use-session-refresh-bindings'
import { useSprintRefreshController } from './use-sprint-refresh-controller'

type LoadIndependentSessionsPage = (
  page: number,
  append?: boolean,
  options?: { bypassCache?: boolean },
) => Promise<unknown>

type LoadProjectSessionsPage = (
  projectId: number,
  page: number,
  append?: boolean,
  options?: { bypassCache?: boolean },
) => Promise<unknown>

type ProjectSessionPageState = Parameters<typeof getInitializedProjectSessionIds>[0]

export function useWorkspaceSessionRefresh(params: {
  dispatchOptimisticSessionsByFolder: Dispatch<SetStateAction<OptimisticSessionsByFolder>>
  getFolderSessionsSnapshotRefs: {
    independentSessionsSnapshotRef: MutableRefObject<Session[]>
    projectSessionsSnapshotRef: MutableRefObject<Record<number, Session[]>>
  }
  intervals: {
    regularRefreshIntervalMs: number
    sprintRefreshIntervalMs: number
    sprintRefreshMaxDurationMs: number
    sprintWeakSignalHitsToStop: number
  }
  loadIndependentSessionsPage: LoadIndependentSessionsPage
  loadProjectSessionsPage: LoadProjectSessionsPage
  projectSessionPageState: ProjectSessionPageState
}) {
  const {
    dispatchOptimisticSessionsByFolder,
    getFolderSessionsSnapshotRefs,
    intervals,
    loadIndependentSessionsPage,
    loadProjectSessionsPage,
    projectSessionPageState,
  } = params
  const { independentSessionsSnapshotRef, projectSessionsSnapshotRef } = getFolderSessionsSnapshotRefs

  const refreshSessions = useCallback(async () => {
    await loadIndependentSessionsPage(1, false, { bypassCache: true })
    const initializedProjectIds = getInitializedProjectSessionIds(projectSessionPageState)

    if (initializedProjectIds.length === 0) {
      return
    }

    await Promise.all(
      initializedProjectIds.map((projectId) =>
        loadProjectSessionsPage(projectId, 1, false, { bypassCache: true }),
      ),
    )
  }, [loadIndependentSessionsPage, loadProjectSessionsPage, projectSessionPageState])

  const refreshFolderSessionsOnce = useCallback(
    async (folderId: number) => {
      if (folderId === 0) {
        await loadIndependentSessionsPage(1, false, { bypassCache: true })
        return
      }
      await loadProjectSessionsPage(folderId, 1, false, { bypassCache: true })
    },
    [loadIndependentSessionsPage, loadProjectSessionsPage],
  )

  const getFolderSessionsSnapshot = useCallback(
    (folderId: number): Session[] => {
      if (folderId === 0) {
        return independentSessionsSnapshotRef.current
      }
      return projectSessionsSnapshotRef.current[folderId] ?? []
    },
    [independentSessionsSnapshotRef, projectSessionsSnapshotRef],
  )

  const sprintRefreshController = useSprintRefreshController({
    intervalMs: intervals.sprintRefreshIntervalMs,
    maxDurationMs: intervals.sprintRefreshMaxDurationMs,
    weakSignalHitsToStop: intervals.sprintWeakSignalHitsToStop,
    getFolderSessionsSnapshot,
    refreshFolderSessionsOnce,
    refreshSessions,
  })

  const trackSessionHint = useCallback(
    async (hint: SessionTrackingHint) => {
      dispatchOptimisticSessionsByFolder((prev) => reduceOptimisticSessionsByFolder(prev, hint))
      await sprintRefreshController.handleSessionHint(hint)
    },
    [dispatchOptimisticSessionsByFolder, sprintRefreshController],
  )

  useSessionRefreshBindings({
    refreshSessions,
    regularRefreshIntervalMs: intervals.regularRefreshIntervalMs,
    sprintRefreshController,
  })

  return {
    refreshSessions,
    sprintRefreshController,
    trackSessionHint,
  }
}
