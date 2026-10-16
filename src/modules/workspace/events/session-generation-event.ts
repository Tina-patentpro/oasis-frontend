export const SESSION_GENERATION_FINISHED_EVENT = 'session-generation-finished'

export type SessionGenerationSource = 'sync' | 'async'

export interface SessionGenerationFinishedDetail {
  folderId: number
  source: SessionGenerationSource
  taskKey?: string
  finishedAt?: number
}

export function dispatchSessionGenerationFinished(detail: SessionGenerationFinishedDetail): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<SessionGenerationFinishedDetail>(SESSION_GENERATION_FINISHED_EVENT, {
      detail,
    }),
  )
}
