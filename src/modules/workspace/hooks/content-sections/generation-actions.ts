import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DESTS } from '@/constants'
import { aiService } from '@/api/services'
import { ApiError } from '@/api/errors'
import { useAsyncState } from '@/hooks/useAsyncState'
import { dispatchAsyncTaskCenterReminder } from '@/modules/workspace/events/async-task-center-event'
import { dispatchSessionGenerationFinished } from '@/modules/workspace/events/session-generation-event'
import type { ApiDetail, WorkflowExecutionFile } from '@/types/api'
import { timestamp, uid } from '@/utils/helpers'

import { useAsyncTaskStore, useWorkspaceStore } from '../../stores'
import {
  buildAsyncGuidanceMarkdown,
  isLikelyAsyncPlaceholderText,
  resolveAsyncGuidanceStatus,
} from './async-guidance'
import { buildFinalResult } from './async-result-hydrator'
import { resolveAsyncTerminalDecision } from './async-terminal-decision'
import { resolveSubmitErrorPolicy } from './async-submit-policy'
import { reduceGenerationState, type GenerationStatus } from './generation-state'
import type { UseGenerationActionsParams, UseGenerationActionsResult } from './generation-actions.types'
import { buildWorkflowOutputTextFieldsForPreview } from './generation-output-preview'
import { useGenerationAsyncCompletion } from './use-generation-async-completion'
import { useGenerationAvailability } from './use-generation-availability'
import { useGenerationBasicActions } from './use-generation-basic-actions'
import { useGenerationDownloadAction } from './use-generation-download-action'
import { useGenerationInputFiles } from './use-generation-input-files'
import { useGenerationNavigationActions } from './use-generation-navigation-actions'
import { useGenerationRestoredStatus } from './use-generation-restored-status'
import { useGenerationSubmitAction } from './use-generation-submit-action'
import {
  buildGenerationRequestFields,
  resolveApiProcess,
} from './generation-request'
import type { SessionTrackingHint } from '../sidebar/optimistic-session'
import type { SessionTrackingContext } from './session-tracking-context'

export function useGenerationActions({
  apiDetail,
  ensureApiDetailLoaded,
  inputSections,
  generated,
  selectedProjectId,
  activePages,
  dynamicTabs,
  tab,
  tool,
  toolMetadataByName,
  notify,
  setGenerated,
  addVersion,
  saveInputHistory,
  resetInputSections,
  undoInputSections,
  setInputSection,
  setTab,
  setTool,
  startPolling,
  stopPolling,
  onMetricsStart,
  onMetricsCollected,
  onOpenDownloadSelector,
  onSessionTrackingHint,
}: UseGenerationActionsParams): UseGenerationActionsResult {
  const setSelectedSessionId = useWorkspaceStore((state) => state.setSelectedSessionId)
  const selectedSessionId = useWorkspaceStore((state) => state.selectedSessionId)
  const [generatedFiles, setGeneratedFiles] = useState<WorkflowExecutionFile[]>([])
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
  const [isPreflightingGenerate, setIsPreflightingGenerate] = useState(false)
  const generatedFilesRef = useRef<WorkflowExecutionFile[]>([])
  const latestTaskKeyRef = useRef<string | null>(null)
  const latestSubmitFolderIdRef = useRef<number>(selectedProjectId ?? 0)
  // 追踪当前工具的 is_async 标志，供 onError 闭包读取（onError 访问不到 async 函数体内部的局部变量）
  const latestIsAsyncRef = useRef<number>(apiDetail?.is_async ?? 0)
  const createTimingRef = useRef<{
    token: string
    requestStartedAt: number
    createResponseAt: number
  } | null>(null)
  const latestSessionTrackingContextRef = useRef<SessionTrackingContext | null>(null)

  useEffect(() => {
    generatedFilesRef.current = generatedFiles
  }, [generatedFiles])

  useEffect(() => {
    latestIsAsyncRef.current = apiDetail?.is_async ?? 0
  }, [apiDetail?.is_async])

  useEffect(() => {
    queueMicrotask(() => {
      setGenerationStatus(
        (current) => reduceGenerationState({ status: current }, { type: 'RESET' }).status,
      )
    })
  }, [tool.name, tool.ver])

  const emitSessionTrackingHint = useCallback(
    (hint: SessionTrackingHint) => {
      if (!onSessionTrackingHint) {
        return
      }
      Promise.resolve(onSessionTrackingHint(hint)).catch((error) => {
        console.warn('[useGenerationActions] 会话跟踪提示派发失败:', error)
      })
    },
    [onSessionTrackingHint],
  )

  useGenerationRestoredStatus({ selectedSessionId, setGenerationStatus })

  const handleInputFiles = useGenerationInputFiles({
    apiDetail,
    ensureApiDetailLoaded,
    inputSections,
    notify,
    setInputSection,
  })

  const destinations = useMemo(() => DESTS.map((dest) => ({ ...dest })), [])

  const {
    canGenerate,
    combinedInput,
    hasAnyInput,
    missingRequiredFieldLabels,
    sessionTrackingTitle,
  } = useGenerationAvailability({
    activePages,
    apiDetail,
    inputSections,
    toolName: tool.name,
  })

  const { clearAllInputs, copyGenerated, copyInput, startNewSession, undoInputs } =
    useGenerationBasicActions({
      combinedInput,
      createTimingRef,
      generated,
      latestSessionTrackingContextRef,
      latestTaskKeyRef,
      notify,
      resetInputSections,
      saveInputHistory,
      setGenerated,
      setGeneratedFiles,
      setGenerationStatus,
      setSelectedSessionId,
      stopPolling,
      undoInputSections,
    })

  const generationRequestState = useAsyncState(
    async (preloadedApiDetail?: unknown, ..._args: unknown[]) => {
      let resolvedApiDetail =
        preloadedApiDetail && typeof preloadedApiDetail === 'object'
          ? (preloadedApiDetail as ApiDetail)
          : apiDetail
      if (!resolvedApiDetail && ensureApiDetailLoaded) {
        resolvedApiDetail = await ensureApiDetailLoaded()
      }

      if (!resolvedApiDetail) {
        throw new Error('API详情未加载，无法生成内容')
      }
      latestIsAsyncRef.current = resolvedApiDetail.is_async ?? 0

      const { inputs, fileFields, multiFileFields } = buildGenerationRequestFields(
        resolvedApiDetail.input_schema,
        inputSections,
      )
      const apiProcess = resolveApiProcess(toolMetadataByName, tool.name, tool.ver)

      const taskKey = `task_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      const folderId = selectedProjectId ?? 0
      const submittedAtMs = Date.now()
      const shouldTrackSessionInSidebar = resolvedApiDetail.is_async !== 1
      const trackingContext: SessionTrackingContext = {
        taskKey,
        folderId,
        title: sessionTrackingTitle,
        toolType: tool.name,
        submittedAtMs,
      }
      latestTaskKeyRef.current = taskKey
      latestSubmitFolderIdRef.current = folderId
      latestSessionTrackingContextRef.current = shouldTrackSessionInSidebar ? trackingContext : null
      onMetricsStart?.(taskKey)
      const requestStartedAt = performance.now()
      const createPromise = aiService.createWithApi(resolvedApiDetail.id, inputs, {
        folderId,
        fileFields,
        multiFileFields,
        apiProcess,
        taskKey,
      })
      const submittedOutputFields = buildWorkflowOutputTextFieldsForPreview(
        undefined,
        resolvedApiDetail,
      )

      // 异步工具：交由全局后台任务管理器接管
      if (resolvedApiDetail.is_async === 1) {
        useAsyncTaskStore.getState().addAsyncTask({
          taskKey,
          apiDetailId: resolvedApiDetail.id,
          apiName: resolvedApiDetail.name || tool.name,
          folderId,
          progressPercent: 0,
          currentStepName: '请求排队中...',
          status: 'queued',
          toolName: tool.name,
          outputFields: submittedOutputFields,
        })
      } else {
        // 同步工具：保持本地轮询
        startPolling(taskKey, {
          outputFields: submittedOutputFields,
        })
      }

      if (shouldTrackSessionInSidebar) {
        emitSessionTrackingHint({
          ...trackingContext,
          phase: 'submitted',
        })
      }

      let response
      try {
        response = await createPromise
      } catch (error) {
        if (resolvedApiDetail.is_async === 1) {
          const submitErrorPolicy = resolveSubmitErrorPolicy({
            statusCode: error instanceof ApiError ? error.statusCode : undefined,
          })
          if (submitErrorPolicy.keepPolling) {
            dispatchAsyncTaskCenterReminder({
              taskKey,
              submittedAtMs,
              toolName: tool.name,
              folderId,
            })
          } else {
            useAsyncTaskStore.getState().removeAsyncTask(taskKey)
          }
        }

        throw error
      }

      const createResponseAt = performance.now()
      createTimingRef.current = {
        token: taskKey,
        requestStartedAt,
        createResponseAt,
      }

      const finalResult = buildFinalResult({
        answerText: response.generatedContent,
        fileOutput: response.file_output,
        fileUrl: response.file_url,
        outputFields: buildWorkflowOutputTextFieldsForPreview(response.outputs, resolvedApiDetail),
      })
      const normalizedFiles = finalResult?.files ?? []

      // 文字内容严格来自 answer_text（由 coerceGenerateResponse 映射为 generatedContent）
      const resolvedOutput =
        typeof response.generatedContent === 'string' && response.generatedContent.trim()
          ? response.generatedContent
          : undefined

      const resolvedOutputText = resolvedOutput ?? ''
      const looksLikeAsyncPlaceholder =
        isLikelyAsyncPlaceholderText(resolvedOutputText) ||
        (resolvedOutputText.length < 100 && /异步/.test(resolvedOutputText))
      // create 接口本身就可能直接返回最终正文/文件：
      // - 异步工具：后端已提前返回结果时，应直接完成
      // - 同步工具：后端长请求结束后即已拿到结果时，也应直接完成
      // 仅保留对“异步处理中提示文案”的拦截，避免把占位文案误判为最终结果。
      const allowResultOnlyCompletion = !looksLikeAsyncPlaceholder
      const terminalDecision = resolveAsyncTerminalDecision({
        status: response.status,
        generatedContent: resolvedOutput,
        file_url: response.file_url,
        allowResultOnlyCompletion,
      })
      const asyncGuidanceStatus = resolveAsyncGuidanceStatus({
        workflowStatus: response.status,
        backendText: resolvedOutputText,
      })
      const shouldUseAsyncGuidance =
        resolvedApiDetail.is_async === 1 &&
        terminalDecision.kind === 'running' &&
        (asyncGuidanceStatus !== null || looksLikeAsyncPlaceholder || !terminalDecision.hasResult)
      const visibleFiles = shouldUseAsyncGuidance ? [] : normalizedFiles
      setGeneratedFiles(visibleFiles)

      // 异步任务提交成功后无条件弹出任务中心提醒（覆盖 running、瞬间完成等所有场景）
      if (resolvedApiDetail.is_async === 1) {
        dispatchAsyncTaskCenterReminder({
          taskKey,
          submittedAtMs,
          toolName: tool.name,
          folderId,
        })
      }

      let resultText = ''

      if (shouldUseAsyncGuidance) {
        const guidanceStatus = asyncGuidanceStatus ?? 'running'
        resultText = buildAsyncGuidanceMarkdown({
          taskKey,
          toolName: tool.name,
          status: guidanceStatus,
          backendMessage: resolvedOutputText,
        })
      } else if (terminalDecision.kind === 'failed') {
        resultText = '⚠️ 生成失败，请稍后重试。'
      } else if (!finalResult) {
        // answer_text 为空且无文件 —— 异常情况
        console.warn(
          '[useWorkspaceContentSections] answer_text、file_output 和 file_url 均为空',
          response,
        )
        resultText = '⚠️ 生成结果为空，请联系研发排查。'
      } else {
        resultText = finalResult.text
      }

      return {
        text: resultText,
        terminalKind: terminalDecision.kind,
        isAsyncGuidance: shouldUseAsyncGuidance,
        hasDownloadableFiles: visibleFiles.length > 0,
        sessionId:
          typeof (response.rawResponse as Record<string, unknown> | undefined)?.['session_id'] ===
          'number'
            ? ((response.rawResponse as Record<string, unknown>)['session_id'] as number)
            : undefined,
        taskKey,
      }
    },
    {
      onSuccess: (result) => {
        const setGeneratedAtMs = performance.now()
        const timing = createTimingRef.current
        if (timing) {
          onMetricsCollected?.({
            token: timing.token,
            responseMs: Math.max(0, setGeneratedAtMs - timing.createResponseAt),
            interfaceMs: Math.max(0, timing.createResponseAt - timing.requestStartedAt),
            setGeneratedAtMs,
          })
          createTimingRef.current = null
        }

        const resultText = typeof result === 'string' ? result : result.text
        // Result object might not have isAsyncGuidance if coming from cache/old version, default to false
        // But for useAsyncState execute, it returns what the async function returns.
        const isAsyncGuidance = typeof result === 'object' ? result.isAsyncGuidance : false
        const terminalKind = typeof result === 'object' ? result.terminalKind : 'completed'
        const hasDownloadableFiles =
          typeof result === 'object' && 'hasDownloadableFiles' in result
            ? Boolean(result.hasDownloadableFiles)
            : false
        const completedSessionId =
          typeof result === 'object' &&
          'sessionId' in result &&
          typeof result.sessionId === 'number'
            ? result.sessionId
            : undefined

        setGenerated(resultText)

        // 判定是否继续轮询逻辑修复：
        // 1. 如果匹配到了异步指引文本 (isAsyncGuidance)，继续轮询
        // 2. 如果统一终态判定仍是 running，继续轮询
        const shouldContinuePolling = isAsyncGuidance || terminalKind === 'running'

        if (shouldContinuePolling) {
          setGenerationStatus(
            (current) => reduceGenerationState({ status: current }, { type: 'START' }).status,
          )
        } else if (terminalKind === 'failed') {
          setGenerationStatus(
            (current) => reduceGenerationState({ status: current }, { type: 'ERROR' }).status,
          )
          stopPolling()
        } else if (resultText.includes('暂无可下载文件') && !hasDownloadableFiles) {
          setGenerationStatus(
            (current) => reduceGenerationState({ status: current }, { type: 'PARTIAL' }).status,
          )
          // 同步工具完成后停止轮询，避免进度条持续停在"运行中"
          stopPolling()
        } else {
          setGenerationStatus(
            (current) => reduceGenerationState({ status: current }, { type: 'SUCCESS' }).status,
          )
          // 同步工具完成后停止轮询，避免进度条持续停在"运行中"
          stopPolling()
        }
        addVersion({ id: uid(), time: timestamp(), text: resultText })
        notify(
          shouldContinuePolling
            ? '任务已提交，后台处理中'
            : terminalKind === 'failed'
              ? '生成失败'
              : '生成完成',
        )

        if (!shouldContinuePolling && terminalKind !== 'failed' && latestIsAsyncRef.current !== 1) {
          dispatchSessionGenerationFinished({
            folderId: latestSubmitFolderIdRef.current,
            source: 'sync',
            taskKey: latestTaskKeyRef.current ?? undefined,
            finishedAt: Date.now(),
          })
        }

        if (!shouldContinuePolling && latestSessionTrackingContextRef.current) {
          emitSessionTrackingHint({
            ...latestSessionTrackingContextRef.current,
            phase: 'completed',
            sessionId: completedSessionId,
          })
        }
      },

      onError: (error) => {
        createTimingRef.current = null
        const isGatewayTimeout = error instanceof ApiError && error.statusCode === 504
        const submitErrorPolicy = resolveSubmitErrorPolicy({
          statusCode: error instanceof ApiError ? error.statusCode : undefined,
        })
        // 仅对异步工具（is_async===1）在504超时后继续轮询并显示异步指引；
        // 同步工具超时应提示用户重试，而不是显示误导性的"异步任务执行指引"
        const shouldContinuePollingAfterTimeout =
          isGatewayTimeout && submitErrorPolicy.keepPolling && latestIsAsyncRef.current === 1

        if (submitErrorPolicy.markFailed) {
          setGenerationStatus(
            (current) => reduceGenerationState({ status: current }, { type: 'ERROR' }).status,
          )
        }

        if (submitErrorPolicy.markFailed) {
          console.error('[useWorkspaceContentSections] 生成失败', error)
        } else {
          console.warn('[useWorkspaceContentSections] 生成通道超时，继续轮询任务进度', error)
        }
        if (!submitErrorPolicy.keepPolling) {
          stopPolling()
        }

        if (submitErrorPolicy.markFailed && latestSessionTrackingContextRef.current) {
          emitSessionTrackingHint({
            ...latestSessionTrackingContextRef.current,
            phase: 'failed',
          })
        }

        const errorMsg = shouldContinuePollingAfterTimeout
          ? '任务已提交，后台处理中，正在继续查询进度。'
          : isGatewayTimeout
            ? '⏳ 生成请求超时，请稍后重试。'
            : `⚠️ 生成失败: ${error.message}`

        const timeoutGuidance = shouldContinuePollingAfterTimeout
          ? buildAsyncGuidanceMarkdown({
              taskKey: latestTaskKeyRef.current ?? 'unknown',
              toolName: tool.name,
              status: 'running',
              backendMessage: errorMsg,
            })
          : errorMsg

        if (generated && generated.trim().length > 0) {
          setGenerated(`${generated}\n\n${timeoutGuidance}`)
        } else {
          setGenerated(timeoutGuidance)
        }
        addVersion({ id: uid(), time: timestamp(), text: timeoutGuidance })
        notify(errorMsg)
        setGeneratedFiles([])
      },
    },
  )

  const applyAsyncCompletionResult = useGenerationAsyncCompletion({
    addVersion,
    emitSessionTrackingHint,
    latestSessionTrackingContextRef,
    notify,
    setGenerated,
    setGeneratedFiles,
    setGenerationStatus,
  })

  const generateDisabled =
    !canGenerate ||
    isPreflightingGenerate ||
    generationRequestState.isLoading ||
    generationStatus === 'queued' ||
    generationStatus === 'running'

  const generate = useGenerationSubmitAction({
    apiDetail,
    ensureApiDetailLoaded,
    generationRequestState,
    generationStatus,
    hasAnyInput,
    inputSections,
    isPreflightingGenerate,
    missingRequiredFieldLabels,
    notify,
    setGenerated,
    setGeneratedFiles,
    setGenerationStatus,
    setIsPreflightingGenerate,
  })

  const handleNextStep = useGenerationNavigationActions({
    dynamicTabs,
    generated,
    notify,
    setTab,
    setTool,
    tab,
    tool,
  })

  const handleDownload = useGenerationDownloadAction({
    generatedFilesRef,
    notify,
    onOpenDownloadSelector,
  })

  return {
    generatedFiles,
    setGeneratedFiles,
    generationStatus,
    destinations,
    canGenerate,
    generateDisabled,
    isGenerating: generationRequestState.isLoading,
    handleInputFiles,
    copyInput,
    clearAllInputs,
    startNewSession,
    undoInputs,
    copyGenerated,
    applyAsyncCompletionResult,
    generate,
    handleNextStep,
    handleDownload,
  }
}
