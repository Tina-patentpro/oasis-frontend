/**
 * 通用API请求Hook
 * 提供统一的加载状态和错误处理
 */

import { useState, useCallback, useRef } from 'react'

import { ApiError } from '@/api'

interface UseAPIOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  initialData?: T
}

interface UseAPIReturn<T, P extends unknown[]> {
  data: T | null
  isLoading: boolean
  error: Error | null
  execute: (...params: P) => Promise<T | null>
  reset: () => void
}

/**
 * 通用API请求Hook
 *
 * @example
 * const { data, isLoading, error, execute } = useAPI(
 *   userService.getUser,
 *   {
 *     onSuccess: (user) => console.log('User loaded:', user),
 *     onError: (error) => console.error('Failed:', error)
 *   }
 * );
 *
 * // 执行请求
 * await execute(userId);
 */
export function useAPI<T, P extends unknown[] = []>(
  apiFunction: (...params: P) => Promise<T>,
  options: UseAPIOptions<T> = {},
): UseAPIReturn<T, P> {
  const [data, setData] = useState<T | null>(options.initialData || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Use refs for callbacks/initialData to avoid recreating execute/reset on every render.
  // Callers typically pass inline object literals as options, so without refs the
  // new reference would cause an infinite re-render loop in useAutoAPI.
  const onSuccessRef = useRef(options.onSuccess)
  const onErrorRef = useRef(options.onError)
  const initialDataRef = useRef(options.initialData)

  // Update refs on every render (no useEffect needed — ref writes are side-effect free)
  onSuccessRef.current = options.onSuccess
  onErrorRef.current = options.onError
  initialDataRef.current = options.initialData

  const execute = useCallback(
    async (...params: P): Promise<T | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await apiFunction(...params)
        setData(result)
        onSuccessRef.current?.(result)
        return result
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error(String(err))
        setError(error)
        onErrorRef.current?.(error)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [apiFunction],
  )

  const reset = useCallback(() => {
    setData(initialDataRef.current ?? null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
  }
}
