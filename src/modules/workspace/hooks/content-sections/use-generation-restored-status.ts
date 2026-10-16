import { useEffect, type Dispatch, type SetStateAction } from 'react'

import {
  SESSION_OUTPUT_RESTORED_EVENT,
  type SessionOutputRestoredDetail,
} from '@/modules/workspace/events/session-output-restored-event'

import { reduceGenerationState, type GenerationStatus } from './generation-state'

export function useGenerationRestoredStatus({
  selectedSessionId,
  setGenerationStatus,
}: {
  selectedSessionId: number | null
  setGenerationStatus: Dispatch<SetStateAction<GenerationStatus>>
}) {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleSessionOutputRestored = (event: Event) => {
      const detail = (event as CustomEvent<SessionOutputRestoredDetail>).detail
      if (!detail) {
        return
      }
      if (selectedSessionId === null || detail.sessionId !== selectedSessionId) {
        return
      }

      const restoredEventType =
        detail.restoredStatus === 'success'
          ? 'SUCCESS'
          : detail.restoredStatus === 'running'
            ? 'START'
            : detail.hasText || detail.hasFiles
              ? 'SUCCESS'
              : 'RESET'

      setGenerationStatus(
        (current) => reduceGenerationState({ status: current }, { type: restoredEventType }).status,
      )
    }

    window.addEventListener(SESSION_OUTPUT_RESTORED_EVENT, handleSessionOutputRestored)
    return () => {
      window.removeEventListener(SESSION_OUTPUT_RESTORED_EVENT, handleSessionOutputRestored)
    }
  }, [selectedSessionId, setGenerationStatus])
}
