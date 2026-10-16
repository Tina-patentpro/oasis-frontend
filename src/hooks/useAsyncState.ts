import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * 异步状态管理Hook
 * 统一处理loading、error、data状态，支持重试和超时控制
 */

interface UseAsyncStateOptions<T> {
  /** 初始数据 */
  initialData?: T
  /** 是否立即执行（默认false） */
  immediate?: boolean
  /** 超时时间（毫秒），0表示不超时 */
  timeout?: number
  /** 重试次数（默认0） */
  retryCount?: number
  /** 重试延迟（毫秒） */
  retryDelay?: number
  /** 成功回调 */
  onSuccess?: (data: T) => void
  /** 错误回调 */
  onError?: (error: Error) => void
  /** 完成回调（成功或失败都会调用） */
  onFinally?: () => void
}

interface AsyncState<T> {
  /** 数据 */
  data: T | undefined
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: Error | null
  /** 是否已执行过 */
  hasExecuted: boolean
  /** 执行次数 */
  executeCount: number
}

interface UseAsyncStateReturn<T> extends AsyncState<T> {
  /** 执行异步操作 */
  execute: (...args: unknown[]) => Promise<T | undefined>
  /** 重置状态 */
  reset: () => void
  /** 手动设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 手动设置错误 */
  setError: (error: Error | null) => void
  /** 手动设置数据 */
  setData: (data: T | undefined) => void
}

export function useAsyncState<T>(
  asyncFn: (...args: unknown[]) => Promise<T>,
  options: UseAsyncStateOptions<T> = {},
): UseAsyncStateReturn<T> {
  const {
    initialData,
    immediate = false,
    timeout = 0,
    retryCount = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
    onFinally,
  } = options

  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
    hasExecuted: false,
    executeCount: 0,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use refs for callbacks to avoid re-creating execute on every render
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onFinallyRef = useRef(onFinally)
  onFinallyRef.current = onFinally

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setState({
      data: initialData,
      isLoading: false,
      error: null,
      hasExecuted: false,
      executeCount: 0,
    })
  }, [initialData])

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }))
  }, [])

  const setError = useCallback((error: Error | null) => {
    setState((prev) => ({ ...prev, error }))
  }, [])

  const setData = useCallback((data: T | undefined) => {
    setState((prev) => ({ ...prev, data }))
  }, [])

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | undefined> => {
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        executeCount: prev.executeCount + 1,
      }))

      let currentRetryCount = 0
      const maxRetries = retryCount

      const tryExecute = async (): Promise<T> => {
        // 创建新的AbortController
        abortControllerRef.current = new AbortController()

        try {
          // 超时控制
          let timeoutPromise: Promise<never> | null = null
          if (timeout > 0) {
            timeoutPromise = new Promise((_, reject) => {
              timeoutRef.current = setTimeout(() => {
                reject(new Error(`操作超时 (${timeout}ms)`))
              }, timeout)
            })
          }

          // 执行异步操作
          const promise = asyncFn(...args)
          const result = await (timeoutPromise ? Promise.race([promise, timeoutPromise]) : promise)

          // Clear timeout since promise settled
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }

          // 检查是否被取消
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('操作已取消')
          }

          setState((prev) => ({
            ...prev,
            data: result,
            isLoading: false,
            error: null,
            hasExecuted: true,
          }))

          onSuccessRef.current?.(result)
          onFinallyRef.current?.()

          return result
        } catch (error) {
          // 检查是否被取消
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('操作已取消')
          }

          const err = error instanceof Error ? error : new Error(String(error))

          // 重试逻辑
          if (currentRetryCount < maxRetries) {
            currentRetryCount++

            setState((prev) => ({
              ...prev,
              isLoading: true,
              error: null,
            }))

            // 等待重试延迟
            await new Promise((resolve) => {
              retryTimeoutRef.current = setTimeout(resolve, retryDelay)
            })

            return tryExecute()
          }

          // 重试次数用完，设置错误状态
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err,
            hasExecuted: true,
          }))

          onErrorRef.current?.(err)
          onFinallyRef.current?.()

          throw err
        }
      }

      try {
        return await tryExecute()
      } catch (error) {
        // 如果是取消操作，不设置错误状态
        if (error instanceof Error && error.message === '操作已取消') {
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }))
          return undefined
        }
        throw error
      }
    },
    [asyncFn, timeout, retryCount, retryDelay],
  )

  // 立即执行
  useEffect(() => {
    if (immediate && !state.hasExecuted) {
      execute()
    }
  }, [immediate, state.hasExecuted, execute])

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    execute,
    reset,
    setLoading,
    setError,
    setData,
  }
}
