import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import {
  getNextOptimisticSessionExpiryAt,
  pruneExpiredOptimisticSessionsByFolder,
  OPTIMISTIC_SESSION_TTL_MS,
  type OptimisticSessionsByFolder,
} from './optimistic-session'

export function useOptimisticSessionExpiry(params: {
  optimisticSessionsByFolder: OptimisticSessionsByFolder
  setOptimisticSessionsByFolder: Dispatch<SetStateAction<OptimisticSessionsByFolder>>
  ttlMs?: number
}): void {
  const {
    optimisticSessionsByFolder,
    setOptimisticSessionsByFolder,
    ttlMs = OPTIMISTIC_SESSION_TTL_MS,
  } = params

  useEffect(() => {
    const prunedState = pruneExpiredOptimisticSessionsByFolder({
      optimisticSessionsByFolder,
      nowMs: Date.now(),
      ttlMs,
    })
    if (prunedState !== optimisticSessionsByFolder) {
      setOptimisticSessionsByFolder(prunedState)
      return
    }

    const nextExpiryAt = getNextOptimisticSessionExpiryAt({
      optimisticSessionsByFolder,
      ttlMs,
    })
    if (nextExpiryAt == null) {
      return
    }

    const timerId = window.setTimeout(
      () => {
        setOptimisticSessionsByFolder((prev) =>
          pruneExpiredOptimisticSessionsByFolder({
            optimisticSessionsByFolder: prev,
            nowMs: Date.now(),
            ttlMs,
          }),
        )
      },
      Math.max(0, nextExpiryAt - Date.now()),
    )

    return () => {
      window.clearTimeout(timerId)
    }
  }, [optimisticSessionsByFolder, setOptimisticSessionsByFolder, ttlMs])
}
