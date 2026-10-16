import { useCallback, useEffect, useRef } from 'react'

import { useNotificationCenter } from '@/app/providers/NotificationProvider'
import { useAsyncTaskPolling } from '@/hooks/useAsyncTaskPolling'
import type { ApiDetail, ProcessStatusResponse, WorkflowExecutionFile } from '@/types/api'
import {
  createWorkflowOutputSchemaTextFields,
  type WorkflowOutputTextField,
} from '@/utils/workflow-output-text'

import { useAsyncTaskStore } from '../../stores'
import type { SessionTrackingHint } from '../sidebar/optimistic-session'
import { resolveFinalResult } from './async-result-hydrator'
import {
  buildResolvedSessionTrackingHint,
  buildSessionTrackingHint,
  clearSessionTrackingContext,
  createSessionTrackingRegistry,
  registerSessionTrackingContext,
} from './session-tracking-context'

type PollingPhase = 'idle' | 'running' | 'completed' | 'failed' | 'timeout'

type ApplyAsyncCompletionResult = (payload: {
  text: string
  files: WorkflowExecutionFile[]
}) => void
type StopPolling = ReturnType<typeof useAsyncTaskPolling>['stopPolling']

interface UseWorkspaceAsyncPollingParams {
  currentApiDetail: ApiDetail | null
  notify: (message: string) => void
  onSessionTrackingHint?: (hint: SessionTrackingHint) => void | Promise<void>
}

interface StartPollingOptions {
  outputFields?: WorkflowOutputTextField[]
}

export interface UseWorkspaceAsyncPollingResult {
  startPolling: (taskKey: string, options?: StartPollingOptions) => void
  stopPolling: StopPolling
  pollingPhase: PollingPhase
  pollingStatus: ProcessStatusResponse | null
  emitSessionTrackingHint: (hint: SessionTrackingHint) => void
  setApplyAsyncCompletionResult: (handler: ApplyAsyncCompletionResult | null) => void
}

export function useWorkspaceAsyncPolling({
  currentApiDetail,
  notify,
  onSessionTrackingHint,
}: UseWorkspaceAsyncPollingParams): UseWorkspaceAsyncPollingResult {
  const { refetch: refetchNotifications } = useNotificationCenter()
  const currentTaskKeyRef = useRef<string | null>(null)
  const sessionTrackingRegistryRef = useRef(createSessionTrackingRegistry())
  const applyAsyncCompletionResultRef = useRef<ApplyAsyncCompletionResult | null>(null)
  const currentApiDetailRef = useRef<ApiDetail | null>(currentApiDetail)
  const outputFieldsByTaskKeyRef = useRef<Record<string, WorkflowOutputTextField[]>>({})

  useEffect(() => {
    currentApiDetailRef.current = currentApiDetail
  }, [currentApiDetail])

  const setApplyAsyncCompletionResult = useCallback((handler: ApplyAsyncCompletionResult | null) => {
    applyAsyncCompletionResultRef.current = handler
  }, [])

  const emitSessionTrackingHint = useCallback(
    (hint: SessionTrackingHint) => {
      if (hint.phase === 'submitted') {
        sessionTrackingRegistryRef.current = registerSessionTrackingContext(
          sessionTrackingRegistryRef.current,
          {
            taskKey: hint.taskKey,
            folderId: hint.folderId,
            title: hint.title,
            toolType: hint.toolType,
            submittedAtMs: hint.submittedAtMs,
          },
        )
      } else if (
        hint.phase === 'completed' ||
        hint.phase === 'failed' ||
        hint.phase === 'timeout'
      ) {
        sessionTrackingRegistryRef.current = clearSessionTrackingContext(
          sessionTrackingRegistryRef.current,
          hint.taskKey,
        )
      }

      if (!onSessionTrackingHint) {
        return
      }

      Promise.resolve(onSessionTrackingHint(hint)).catch((error) => {
        console.warn('[useWorkspaceContentSections] 会话跟踪提示派发失败:', error)
      })
    },
    [onSessionTrackingHint],
  )

  const {
    startPolling: rawStartPolling,
    stopPolling,
    phase: pollingPhase,
    status: pollingStatus,
  } = useAsyncTaskPolling({
    pollInterval: 3000,
    maxAttempts: 300,
    onComplete: async (completedStatus) => {
      const taskKey = currentTaskKeyRef.current ?? completedStatus.key ?? null
      if (taskKey) {
        const resolved = buildResolvedSessionTrackingHint(sessionTrackingRegistryRef.current, {
          taskKey,
          sessionId: completedStatus.session_id,
        })
        sessionTrackingRegistryRef.current = resolved.nextRegistry
        if (resolved.hint) {
          emitSessionTrackingHint(resolved.hint)
        }
      }

      if (taskKey) {
        currentTaskKeyRef.current = null
      }

      try {
        let outputFields =
          taskKey && outputFieldsByTaskKeyRef.current[taskKey]
            ? outputFieldsByTaskKeyRef.current[taskKey]
            : []
        if (taskKey && outputFields.length === 0) {
          outputFields = useAsyncTaskStore.getState().tasks[taskKey]?.outputFields ?? []
        }
        const finalResult = await resolveFinalResult({
          process: completedStatus,
          outputFields,
        })

        if (finalResult && applyAsyncCompletionResultRef.current) {
          applyAsyncCompletionResultRef.current({
            text: finalResult.text,
            files: finalResult.files,
          })
        }
      } catch (error) {
        console.warn('[useWorkspaceContentSections] Failed to hydrate async final result:', error)
      } finally {
        if (taskKey) {
          delete outputFieldsByTaskKeyRef.current[taskKey]
        }
      }

      refetchNotifications().catch((err) => {
        console.warn('[useWorkspaceContentSections] Failed to refetch notifications:', err)
      })
    },
    onError: (error) => {
      console.error('[useWorkspaceContentSections] Polling error:', error)
      notify(`生成失败: ${error.message}`)
    },
  })

  const startPolling = useCallback(
    (taskKey: string, options?: StartPollingOptions) => {
      if (options?.outputFields) {
        outputFieldsByTaskKeyRef.current[taskKey] = options.outputFields
      } else {
        outputFieldsByTaskKeyRef.current[taskKey] = createWorkflowOutputSchemaTextFields(
          currentApiDetailRef.current?.output_schema,
        )
      }
      currentTaskKeyRef.current = taskKey
      rawStartPolling(taskKey)
    },
    [rawStartPolling],
  )

  const stopWorkspacePolling = useCallback<StopPolling>(
    (options) => {
      const taskKey = currentTaskKeyRef.current
      if (taskKey) {
        delete outputFieldsByTaskKeyRef.current[taskKey]
      }
      currentTaskKeyRef.current = null
      stopPolling(options)
    },
    [stopPolling],
  )

  useEffect(() => {
    const taskKey = currentTaskKeyRef.current
    if (!taskKey || typeof pollingStatus?.session_id !== 'number') {
      return
    }

    const resolved = buildResolvedSessionTrackingHint(sessionTrackingRegistryRef.current, {
      taskKey,
      sessionId: pollingStatus.session_id,
    })
    sessionTrackingRegistryRef.current = resolved.nextRegistry
    if (resolved.hint) {
      emitSessionTrackingHint(resolved.hint)
    }
  }, [emitSessionTrackingHint, pollingStatus?.session_id])

  useEffect(() => {
    const taskKey = currentTaskKeyRef.current
    if (!taskKey) {
      return
    }
    if (pollingPhase !== 'failed' && pollingPhase !== 'timeout') {
      return
    }

    const context = sessionTrackingRegistryRef.current.contextByTaskKey[taskKey]
    if (!context) {
      delete outputFieldsByTaskKeyRef.current[taskKey]
      currentTaskKeyRef.current = null
      return
    }

    emitSessionTrackingHint(
      buildSessionTrackingHint(
        context,
        pollingPhase === 'timeout' ? 'timeout' : 'failed',
        sessionTrackingRegistryRef.current.resolvedSessionIdByTaskKey[taskKey],
      ),
    )
    delete outputFieldsByTaskKeyRef.current[taskKey]
    currentTaskKeyRef.current = null
  }, [emitSessionTrackingHint, pollingPhase])

  return {
    startPolling,
    stopPolling: stopWorkspacePolling,
    pollingPhase,
    pollingStatus,
    emitSessionTrackingHint,
    setApplyAsyncCompletionResult,
  }
}
