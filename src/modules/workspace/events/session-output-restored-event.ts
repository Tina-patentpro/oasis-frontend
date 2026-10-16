export const SESSION_OUTPUT_RESTORED_EVENT = 'workspace-session-output-restored'

export type RestoredGenerationStatus = 'idle' | 'running' | 'success'

export interface SessionOutputRestoredDetail {
  sessionId: number
  hasText: boolean
  hasFiles: boolean
  restoredStatus: RestoredGenerationStatus
  source: 'session-click' | 'history-load'
}

export function dispatchSessionOutputRestored(detail: SessionOutputRestoredDetail): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<SessionOutputRestoredDetail>(SESSION_OUTPUT_RESTORED_EVENT, {
      detail,
    }),
  )
}
