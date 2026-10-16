import { useEffect, useRef } from 'react'

import {
  SESSION_GENERATION_FINISHED_EVENT,
  type SessionGenerationFinishedDetail,
} from '../../events/session-generation-event'
import { normalizeRefreshFolderId } from './session-refresh-targets'

interface SprintRefreshController {
  cleanup: () => void
  startSprintRefresh: (folderId: number) => void
}

interface SessionRefreshBindingsParams {
  refreshSessions: () => Promise<void>
  regularRefreshIntervalMs: number
  sprintRefreshController: SprintRefreshController
}

export function useSessionRefreshBindings({
  refreshSessions,
  regularRefreshIntervalMs,
  sprintRefreshController,
}: SessionRefreshBindingsParams): void {
  const refreshSessionsRef = useRef(refreshSessions)

  useEffect(() => {
    refreshSessionsRef.current = refreshSessions
  }, [refreshSessions])

  useEffect(() => {
    const generationFinishedHandler = (event: Event) => {
      const detail = (event as CustomEvent<SessionGenerationFinishedDetail>).detail
      const folderId = normalizeRefreshFolderId(detail?.folderId)
      if (folderId === null) {
        return
      }
      sprintRefreshController.startSprintRefresh(folderId)
    }

    const legacyHandler = (event: Event) => {
      const folderId = normalizeRefreshFolderId(
        (event as CustomEvent<{ folderId: number }>).detail?.folderId,
      )
      if (folderId === null) {
        return
      }
      sprintRefreshController.startSprintRefresh(folderId)
    }

    window.addEventListener(SESSION_GENERATION_FINISHED_EVENT, generationFinishedHandler)
    window.addEventListener('background-task-completed', legacyHandler)

    const regularTimerId = window.setInterval(() => {
      void refreshSessionsRef.current()
    }, regularRefreshIntervalMs)

    return () => {
      window.removeEventListener(SESSION_GENERATION_FINISHED_EVENT, generationFinishedHandler)
      window.removeEventListener('background-task-completed', legacyHandler)
      window.clearInterval(regularTimerId)
      sprintRefreshController.cleanup()
    }
  }, [regularRefreshIntervalMs, sprintRefreshController])
}
