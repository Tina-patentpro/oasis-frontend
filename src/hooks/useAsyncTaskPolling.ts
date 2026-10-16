import { useState, useCallback, useEffect, useRef } from 'react'
import { aiService } from '@/api/services'
import { ApiError } from '@/api/errors'
import { resolveAsyncTerminalDecision } from '@/modules/workspace/hooks/content-sections/async-terminal-decision'
import type { ProcessStatusResponse } from '@/types/api'

const DEFAULT_MAX_DURATION_MS = 10 * 60 * 1000

type AsyncTaskPollingPhase = 'idle' | 'running' | 'completed' | 'failed' | 'timeout'

type StopReason = 'manual' | 'completed' | 'failed' | 'timeout' | 'restarted' | 'unmount'

interface StopPollingOptions {
  resetStatus?: boolean
  reason?: StopReason
}

/**
 * 轮询选项
 */
interface UseAsyncTaskPollingOptions {
  /** 轮询间隔（毫秒），默认2000ms */
  pollInterval?: number
  /** 最大轮询次数（可选）。未传时将使用 maxDurationMs 与 pollInterval 推导。 */
  maxAttempts?: number
  /** 最大轮询持续时间（毫秒），默认10分钟 */
  maxDurationMs?: number
  /** 停止回调 */
  onStop?: () => void
  /** 完成回调 */
  onComplete?: (status: ProcessStatusResponse) => void | Promise<void>
  /** 错误回调 */
  onError?: (error: Error) => void
}

/**
 * 轮询结果
 */
interface UseAsyncTaskPollingResult {
  /** 开始轮询 */
  startPolling: (key: string) => void
  /** 停止轮询 */
  stopPolling: (options?: StopPollingOptions) => void
  /** 是否正在轮询 */
  isPolling: boolean
  /** 轮询阶段 */
  phase: AsyncTaskPollingPhase
  /** 当前轮询状态 */
  status: ProcessStatusResponse | null
}

/**
 * 异步任务轮询Hook
 * 用于轮询查询异步任务的进度状态
 */
export function useAsyncTaskPolling(
  options: UseAsyncTaskPollingOptions = {},
): UseAsyncTaskPollingResult {
  const {
    pollInterval = 2000,
    maxAttempts,
    maxDurationMs = DEFAULT_MAX_DURATION_MS,
    onStop,
    onComplete,
    onError,
  } = options

  const [isPolling, setIsPolling] = useState(false)
  const [phase, setPhase] = useState<AsyncTaskPollingPhase>('idle')
  const [status, setStatus] = useState<ProcessStatusResponse | null>(null)

  const pollingRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const attemptsRef = useRef(0)
  const maxAttemptsRef = useRef(1)
  const runTokenRef = useRef(0)
  const inFlightRef = useRef(false)
  const keyRef = useRef<string | undefined>(undefined)
  const abortRef = useRef<AbortController | undefined>(undefined)

  const resolveMaxAttempts = useCallback((): number => {
    if (typeof maxAttempts === 'number' && Number.isFinite(maxAttempts) && maxAttempts > 0) {
      return Math.floor(maxAttempts)
    }
    const attemptsFromDuration = Math.ceil(maxDurationMs / pollInterval)
    return Math.max(1, attemptsFromDuration)
  }, [maxAttempts, maxDurationMs, pollInterval])

  const isPendingStatusError = useCallback((error: unknown): boolean => {
    if (!(error instanceof ApiError) || error.statusCode !== 404) {
      return false
    }
    const message = error.message || ''
    return /生成中|请等待|processing|pending/i.test(message)
  }, [])

  const isTransientPollingError = useCallback((error: unknown): boolean => {
    if (!(error instanceof ApiError)) {
      return false
    }
    return (
      error.isNetworkError() ||
      error.statusCode === 502 ||
      error.statusCode === 503 ||
      error.statusCode === 504
    )
  }, [])

  const clearPollingInternals = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = undefined
    }
    abortRef.current?.abort()
    abortRef.current = undefined
    runTokenRef.current += 1
    keyRef.current = undefined
    inFlightRef.current = false
  }, [])

  const stopPolling = useCallback(
    (stopOptions: StopPollingOptions = {}) => {
      const { resetStatus = false } = stopOptions

      clearPollingInternals()
      setIsPolling(false)

      if (resetStatus) {
        setStatus(null)
        setPhase('idle')
      }

      onStop?.()
    },
    [clearPollingInternals, onStop],
  )

  const startPolling = useCallback(
    (taskKey: string) => {
      stopPolling({ resetStatus: true, reason: 'restarted' })

      const controller = new AbortController()
      abortRef.current = controller
      keyRef.current = taskKey
      attemptsRef.current = 0
      maxAttemptsRef.current = resolveMaxAttempts()
      setIsPolling(true)
      setPhase('running')
      const runToken = runTokenRef.current + 1
      runTokenRef.current = runToken

      const scheduleNext = () => {
        if (runTokenRef.current !== runToken || controller.signal.aborted) {
          return
        }
        pollingRef.current = setTimeout(() => {
          void executePoll()
        }, pollInterval)
      }

      const executePoll = async () => {
        if (
          runTokenRef.current !== runToken ||
          keyRef.current !== taskKey ||
          controller.signal.aborted
        ) {
          return
        }
        if (inFlightRef.current) {
          scheduleNext()
          return
        }

        inFlightRef.current = true
        try {
          attemptsRef.current++

          // 查询任务状态
          const response = await aiService.queryProcessStatus(taskKey, {
            signal: controller.signal,
          })
          if (runTokenRef.current !== runToken || keyRef.current !== taskKey) {
            return
          }
          setStatus(response)

          const terminalDecision = resolveAsyncTerminalDecision({
            status: response.status,
            is_completed: response.is_completed,
            progress_percent: response.progress_percent,
            answer_text: response.answer_text,
            output: response.output,
            file_url: response.file_url,
            file_output: response.file_output,
            error_message: response.error_message,
          })

          if (terminalDecision.kind === 'completed') {
            setPhase('completed')
            stopPolling({ reason: 'completed' })
            void onComplete?.(response)
            return
          }

          // 检查是否失败
          if (terminalDecision.kind === 'failed') {
            setPhase('failed')
            stopPolling({ reason: 'failed' })
            const errorMsg = response.error_message || `任务执行失败 (状态: ${response.status})`
            onError?.(new Error(errorMsg))
            return
          }

          // 检查是否超过最大尝试次数
          if (attemptsRef.current >= maxAttemptsRef.current) {
            setPhase('timeout')
            stopPolling({ reason: 'timeout' })
            onError?.(new Error('任务超时'))
            return
          }
        } catch (error) {
          if (runTokenRef.current !== runToken || keyRef.current !== taskKey) {
            return
          }
          if (isPendingStatusError(error) || isTransientPollingError(error)) {
            if (attemptsRef.current >= maxAttemptsRef.current) {
              setPhase('timeout')
              stopPolling({ reason: 'timeout' })
              onError?.(new Error('任务超时'))
              return
            }
            scheduleNext()
            return
          }

          console.error('[useAsyncTaskPolling] Polling error:', error)
          setPhase('failed')
          stopPolling({ reason: 'failed' })
          onError?.(error as Error)
          return
        } finally {
          inFlightRef.current = false
        }

        scheduleNext()
      }

      void executePoll()
    },
    [
      pollInterval,
      resolveMaxAttempts,
      stopPolling,
      onComplete,
      onError,
      isPendingStatusError,
      isTransientPollingError,
    ],
  )

  useEffect(
    () => () => {
      clearPollingInternals()
    },
    [clearPollingInternals],
  )

  return {
    startPolling,
    stopPolling,
    isPolling,
    phase,
    status,
  }
}
