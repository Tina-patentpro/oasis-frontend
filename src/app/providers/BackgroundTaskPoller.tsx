import { useEffect, useRef, useCallback } from 'react'

import { aiService } from '@/api/services'
import { useUIStore } from '@/stores/useUIStore'
import { useAsyncTaskStore } from '@/modules/workspace/stores'
import { resolveAsyncTerminalDecision } from '@/modules/workspace/hooks/content-sections/async-terminal-decision'
import { hasRecentSavedSessionForTask } from '@/modules/workspace/async-task-archive-reconciliation'
import {
  MAX_AGE_FOR_404_FAIL_MS,
  hasFreshDaemonHeartbeat,
  hasPersistedProgressEvidence,
  isPendingStatusError,
  isTransientPollingError,
} from '@/modules/workspace/async-task-polling-policy'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL_MS = 15_000
const ASYNC_TOAST_DURATION_MS = 5_000

/**
 * 应用级后台任务轮询器
 *
 * 说明：
 * 这里是页面外的兜底轮询，不是异步工作流的主状态来源。
 * 它只在任务中心守护轮询心跳失效时，接管同一个 async-task store 里的运行中任务。
 *
 * 挂载于 AppProviders 中，独立于工具视图。
 * 每 15s 检查一次；只有 daemon 心跳过期时，才轮询 async-task store 中 status === 'queued' 或 'running' 的任务。
 * 任务完成时通过 showToast 通知用户，并触发会话列表刷新事件。
 */
export function BackgroundTaskPoller(): null {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const abortRef = useRef<AbortController | undefined>(undefined)
  const inFlightRef = useRef(false)

  const pollOnce = useCallback(async (signal?: AbortSignal) => {
    if (inFlightRef.current || signal?.aborted) return
    inFlightRef.current = true

    const store = useAsyncTaskStore.getState()
    const showToast = useUIStore.getState().showToast
    if (hasFreshDaemonHeartbeat(store.daemonHeartbeatAt)) {
      inFlightRef.current = false
      return
    }

    const runningTasks = Object.values(store.tasks).filter(
      (task) => task.status === 'queued' || task.status === 'running',
    )
    if (runningTasks.length === 0) {
      inFlightRef.current = false
      return
    }

    try {
      for (const task of runningTasks) {
        if (signal?.aborted) break
        try {
          const response = await aiService.queryProcessStatus(task.taskKey, { signal })
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
            store.updateTaskProgress(task.taskKey, {
              status: 'completed',
              progressPercent: 100,
              currentStepName: '已完成',
              error_message: undefined,
            })
            showToast(`「${task.toolName}」生成完成`, ASYNC_TOAST_DURATION_MS)
            dispatchCompletionEvent(task.folderId)
            continue
          }

          if (terminalDecision.kind === 'failed') {
            store.updateTaskProgress(task.taskKey, {
              status: 'failed',
              currentStepName: response.current_step_name || '执行失败',
              error_message: response.error_message || '任务执行失败',
            })
            showToast(`「${task.toolName}」生成失败`, ASYNC_TOAST_DURATION_MS)
            dispatchCompletionEvent(task.folderId)
            continue
          }

          const percent = response.progress_percent ?? 0
          const currentTask = useAsyncTaskStore.getState().tasks[task.taskKey]
          store.updateTaskProgress(task.taskKey, {
            status: 'running',
            progressPercent:
              percent > 0
                ? percent
                : currentTask && currentTask.progressPercent > 0
                  ? currentTask.progressPercent
                  : 0,
            currentStepName: response.current_step_name || '等待状态确认',
            error_message: undefined,
          })
        } catch (error) {
          if (
            (error && (error as { statusCode?: number; status?: number }).statusCode === 404) ||
            (error && (error as { statusCode?: number; status?: number }).status === 404)
          ) {
            const taskAge = Date.now() - task.createdAt
            if (hasPersistedProgressEvidence(task)) {
              store.updateTaskProgress(task.taskKey, {
                status: 'completed',
                progressPercent: 100,
                currentStepName: '已归档',
                error_message: undefined,
              })
              showToast(`「${task.toolName}」生成完成`, ASYNC_TOAST_DURATION_MS)
              dispatchCompletionEvent(task.folderId)
              continue
            }

            if (await hasRecentSavedSessionForTask(task)) {
              store.updateTaskProgress(task.taskKey, {
                status: 'completed',
                progressPercent: 100,
                currentStepName: '已归档',
                error_message: undefined,
              })
              showToast(`「${task.toolName}」生成完成`, ASYNC_TOAST_DURATION_MS)
              dispatchCompletionEvent(task.folderId)
              continue
            }

            if (taskAge > MAX_AGE_FOR_404_FAIL_MS) {
              store.updateTaskProgress(task.taskKey, {
                status: 'failed',
                currentStepName: '执行失败',
                error_message: '延迟（超过正常时间）',
              })
              showToast(`「${task.toolName}」生成失败`, ASYNC_TOAST_DURATION_MS)
              dispatchCompletionEvent(task.folderId)
              continue
            }

            store.updateTaskProgress(task.taskKey, {
              status: 'running',
              currentStepName: '等待状态确认',
              error_message: undefined,
            })
            continue
          }

          if (isPendingStatusError(error) || isTransientPollingError(error)) {
            store.updateTaskProgress(task.taskKey, {
              status: 'running',
              currentStepName: '等待状态确认',
              error_message: undefined,
            })
            continue
          }
          const errorMessage =
            error instanceof Error && error.message.trim().length > 0
              ? error.message
              : '任务执行失败'
          console.error(`[BackgroundTaskPoller] Task ${task.taskKey} failed:`, error)
          store.updateTaskProgress(task.taskKey, {
            status: 'failed',
            currentStepName: '执行失败',
            error_message: errorMessage,
          })
          showToast(`「${task.toolName}」生成失败`, ASYNC_TOAST_DURATION_MS)
          dispatchCompletionEvent(task.folderId)
          console.warn(`[BackgroundTaskPoller] failure detail for ${task.taskKey}: ${errorMessage}`)
        }
      }
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    const tick = () => {
      if (controller.signal.aborted) return
      void pollOnce(controller.signal).finally(() => {
        if (controller.signal.aborted) return
        timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)
      })
    }

    // 启动时延迟一个间隔后再开始第一次轮询
    timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)

    return () => {
      controller.abort()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = undefined
      }
    }
  }, [pollOnce])

  // 不渲染任何 UI
  return null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function dispatchCompletionEvent(folderId: number) {
  window.dispatchEvent(
    new CustomEvent('background-task-completed', {
      detail: { folderId },
    }),
  )
}
