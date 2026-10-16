import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook: useAsyncCleanup
 * 管理异步操作的自动清理
 */
export function useAsyncCleanup() {
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const addTimeout = useCallback((fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
    const timer = setTimeout(fn, delay)
    timeoutsRef.current.push(timer)
    return timer
  }, [])

  const clearAllTimeouts = useCallback((): void => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  useEffect(() => {
    return clearAllTimeouts
  }, [clearAllTimeouts])

  return { addTimeout, clearAllTimeouts }
}
