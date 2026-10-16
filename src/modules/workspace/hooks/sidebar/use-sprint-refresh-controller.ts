import { useEffect, useMemo, useRef } from 'react'

import type { Session } from '@/types/api'

import {
  createSprintRefreshController,
  type SprintRefreshController,
} from './sprint-refresh-controller'

export function useSprintRefreshController(params: {
  intervalMs: number
  maxDurationMs: number
  weakSignalHitsToStop: number
  getFolderSessionsSnapshot: (folderId: number) => Session[]
  refreshFolderSessionsOnce: (folderId: number) => Promise<void>
  refreshSessions: () => Promise<void>
}): SprintRefreshController {
  const latestParamsRef = useRef(params)
  const internalControllerRef = useRef<SprintRefreshController | null>(null)

  useEffect(() => {
    latestParamsRef.current = params
  }, [params])

  useEffect(() => {
    internalControllerRef.current = createSprintRefreshController({
      intervalMs: params.intervalMs,
      maxDurationMs: params.maxDurationMs,
      weakSignalHitsToStop: params.weakSignalHitsToStop,
      getFolderSessionsSnapshot: (folderId) =>
        latestParamsRef.current.getFolderSessionsSnapshot(folderId),
      refreshFolderSessionsOnce: (folderId) =>
        latestParamsRef.current.refreshFolderSessionsOnce(folderId),
      refreshSessions: () => latestParamsRef.current.refreshSessions(),
    })

    return () => {
      internalControllerRef.current?.cleanup()
      internalControllerRef.current = null
    }
  }, [params.intervalMs, params.maxDurationMs, params.weakSignalHitsToStop])

  return useMemo<SprintRefreshController>(
    () => ({
      startSprintRefresh: (folderId) => {
        internalControllerRef.current?.startSprintRefresh(folderId)
      },
      stopSprintRefresh: (folderId) => {
        internalControllerRef.current?.stopSprintRefresh(folderId)
      },
      handleSessionHint: async (hint) => {
        await internalControllerRef.current?.handleSessionHint(hint)
      },
      cleanup: () => {
        internalControllerRef.current?.cleanup()
      },
    }),
    [],
  )
}
