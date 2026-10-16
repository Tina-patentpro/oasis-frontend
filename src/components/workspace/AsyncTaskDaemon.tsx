import { useEffect, useRef, useState } from 'react'

import { aiService } from '@/api/services'
import { useUIStore } from '@/stores/useUIStore'
import { useAsyncTaskStore } from '@/modules/workspace/stores'
import { isAbortLikeError } from '@/api/core/error-utils'
import { resolveAsyncTerminalDecision } from '@/modules/workspace/hooks/content-sections/async-terminal-decision'
import { hasRecentSavedSessionForTask } from '@/modules/workspace/async-task-archive-reconciliation'
import {
  DAEMON_HEARTBEAT_INTERVAL_MS,
  MAX_AGE_FOR_404_FAIL_MS,
  hasPersistedProgressEvidence,
  isPendingStatusError,
  isTransientPollingError,
} from '@/modules/workspace/async-task-polling-policy'

const POLLING_INTERVAL_MS = 5000 // 5 seconds polling per task

function countActiveTasks(tasks: ReturnType<typeof useAsyncTaskStore.getState>['tasks']): number {
  return Object.values(tasks).filter(
    (task) => task.status === 'queued' || task.status === 'running',
  ).length
}

type AsyncTaskStoreState = ReturnType<typeof useAsyncTaskStore.getState>
type AsyncTaskRecord = AsyncTaskStoreState['tasks'][string]
type QueryStatusResponse = Awaited<ReturnType<typeof aiService.queryProcessStatus>>
type ToastFn = (message: string) => void

function getPollingErrorStatus(err: unknown): unknown {
  if (!(err instanceof Error)) return undefined
  if ('statusCode' in err) return (err as { statusCode?: unknown }).statusCode
  if ('status' in err) return (err as { status?: unknown }).status
  return undefined
}

function getCurrentProgressPercent(taskKey: string): number {
  const currentTask = useAsyncTaskStore.getState().tasks[taskKey]
  return currentTask ? currentTask.progressPercent : 0
}

function updateRunningTask(
  storeState: AsyncTaskStoreState,
  taskKey: string,
  response: QueryStatusResponse,
): void {
  const percent = response.progress_percent ?? 0
  storeState.updateTaskProgress(taskKey, {
    status: 'running',
    progressPercent: percent > 0 ? percent : getCurrentProgressPercent(taskKey),
    currentStepName: response.current_step_name || '等待状态确认',
    error_message: undefined,
  })
}

function markTaskFailed(
  storeState: AsyncTaskStoreState,
  taskKey: string,
  apiName: string,
  showToast: ToastFn,
  message: string,
  currentStepName = '执行失败',
): void {
  storeState.updateTaskProgress(taskKey, {
    status: 'failed',
    currentStepName,
    error_message: message,
  })
  showToast(`❌ [${apiName}] 失败: ${message}`)
}

function markTaskCompletedFromArchive(
  storeState: AsyncTaskStoreState,
  taskKey: string,
  apiName: string,
  seenProgress: Set<string>,
  showToast: ToastFn,
): void {
  seenProgress.delete(taskKey)
  storeState.updateTaskProgress(taskKey, {
    status: 'completed',
    progressPercent: 100,
    currentStepName: '已归档',
  })
  showToast(`✅ [${apiName}] 处理完成`)
}

async function handleMissingStatusError({
  task,
  taskKey,
  apiName,
  storeState,
  seenProgress,
  showToast,
}: {
  task: AsyncTaskRecord
  taskKey: string
  apiName: string
  storeState: AsyncTaskStoreState
  seenProgress: Set<string>
  showToast: ToastFn
}): Promise<void> {
  const taskAge = Date.now() - task.createdAt
  const hasProgress = seenProgress.has(taskKey) || hasPersistedProgressEvidence(task)
  const hasSavedSession = hasProgress ? false : await hasRecentSavedSessionForTask(task)

  if (hasProgress || hasSavedSession) {
    // 曾见过进度，或历史列表已出现同任务结果：后端任务已归档。
    markTaskCompletedFromArchive(storeState, taskKey, apiName, seenProgress, showToast)
    return
  }

  if (taskAge > MAX_AGE_FOR_404_FAIL_MS) {
    // 长时间无进度且持续 404：判定超过正常时间
    storeState.updateTaskProgress(taskKey, {
      status: 'failed',
      error_message: '延迟（超过正常时间）',
    })
    showToast(`⏳ [${apiName}] 延迟（超过正常时间）`)
    return
  }

  // 未达到失败阈值（含超过10分钟）：持续等待生成结果
  console.warn(
    `[AsyncTaskDaemon] Task ${taskKey} returned 404 but was created ${Math.round(taskAge / 1000)}s ago with no progress yet. Continuing to poll...`,
  )
  storeState.updateTaskProgress(taskKey, {
    currentStepName: '等待状态确认',
    error_message: undefined,
  })
}

async function handlePollingError({
  err,
  task,
  taskKey,
  apiName,
  storeState,
  seenProgress,
  showToast,
}: {
  err: unknown
  task: AsyncTaskRecord
  taskKey: string
  apiName: string
  storeState: AsyncTaskStoreState
  seenProgress: Set<string>
  showToast: ToastFn
}): Promise<void> {
  if (isAbortLikeError(err)) return

  if (getPollingErrorStatus(err) === 404) {
    await handleMissingStatusError({ task, taskKey, apiName, storeState, seenProgress, showToast })
    return
  }

  if (err instanceof Error && (isPendingStatusError(err) || isTransientPollingError(err))) {
    storeState.updateTaskProgress(taskKey, {
      status: 'running',
      currentStepName: '等待状态确认',
      error_message: undefined,
    })
    return
  }

  console.error(`Error polling task ${taskKey}:`, err)
  markTaskFailed(
    storeState,
    taskKey,
    apiName,
    showToast,
    err instanceof Error ? err.message || '任务执行失败' : '任务执行失败',
  )
}

export const AsyncTaskDaemon: React.FC = () => {
  const showToast = useUIStore((state) => state.showToast)
  const touchDaemonHeartbeat = useAsyncTaskStore((state) => state.touchDaemonHeartbeat)
  const clearDaemonHeartbeat = useAsyncTaskStore((state) => state.clearDaemonHeartbeat)

  // Ref to track which tasks are currently being polled to prevent overlapping requests
  const pollingLocks = useRef<Set<string>>(new Set())

  // 记录哪些任务曾经成功拉到过进度（状态进入 running 或回传了实际 progress_percent > 0）
  const hasSeenProgressRef = useRef<Set<string>>(new Set())

  const [activeCount, setActiveCount] = useState(() =>
    countActiveTasks(useAsyncTaskStore.getState().tasks),
  )

  // Only subscribe to the count of active tasks to trigger the effect
  useEffect(() => {
    setActiveCount(countActiveTasks(useAsyncTaskStore.getState().tasks))
    return useAsyncTaskStore.subscribe((state) => {
      setActiveCount(countActiveTasks(state.tasks))
    })
  }, [])

  useEffect(() => {
    touchDaemonHeartbeat()
    const timerId = setInterval(() => {
      touchDaemonHeartbeat()
    }, DAEMON_HEARTBEAT_INTERVAL_MS)

    return () => {
      clearInterval(timerId)
      clearDaemonHeartbeat()
    }
  }, [clearDaemonHeartbeat, touchDaemonHeartbeat])

  useEffect(() => {
    if (activeCount === 0) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const pollActiveTasks = async () => {
      if (cancelled) return

      // Get freshest state inside the loop
      const storeState = useAsyncTaskStore.getState()
      const activeTasks = Object.values(storeState.tasks).filter(
        (task) => task.status === 'queued' || task.status === 'running',
      )

      if (activeTasks.length === 0) {
        return // Will naturally stop the loop
      }

      // Fire all active polls concurrently
      await Promise.allSettled(
        activeTasks.map(async (task) => {
          const taskKey = task.taskKey
          const apiName = task.apiName

          if (hasPersistedProgressEvidence(task)) {
            hasSeenProgressRef.current.add(taskKey)
          }

          if (pollingLocks.current.has(taskKey)) return
          pollingLocks.current.add(taskKey)

          try {
            const response = await aiService.queryProcessStatus(taskKey)
            if (cancelled) return

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

            if (terminalDecision.kind === 'failed') {
              const errMsg = response.error_message || '任务执行失败'
              markTaskFailed(
                storeState,
                taskKey,
                apiName,
                showToast,
                errMsg,
                response.current_step_name || '执行失败',
              )
              return
            }

            if (terminalDecision.kind === 'completed') {
              hasSeenProgressRef.current.delete(taskKey)
              storeState.updateTaskProgress(taskKey, {
                status: 'completed',
                progressPercent: 100,
                currentStepName: '已完成',
                error_message: undefined,
              })
              showToast(`✅ [${apiName}] 处理完成`)
              return
            }

            // 有实质进度数据 → 标记该任务曾经成功启动过
            const percent = response.progress_percent ?? 0
            if (percent > 0 || response.status === 'running' || response.current_step_name) {
              hasSeenProgressRef.current.add(taskKey)
            }

            updateRunningTask(storeState, taskKey, response)
          } catch (err: unknown) {
            if (cancelled) return
            await handlePollingError({
              err,
              task,
              taskKey,
              apiName,
              storeState,
              seenProgress: hasSeenProgressRef.current,
              showToast,
            })
          } finally {
            pollingLocks.current.delete(taskKey)
          }
        }),
      )

      // Queue next poll
      if (cancelled) return
      timeoutId = setTimeout(pollActiveTasks, POLLING_INTERVAL_MS)
    }

    // kick off
    void pollActiveTasks()

    return () => {
      cancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [activeCount, showToast])

  return null // Render nothing, this is a headless daemon
}
