import { useEffect, useMemo, useRef, useState } from 'react'

import { useDynamicTabs } from '@/hooks/useDynamicTabs'

import { useContentStore, useWorkspaceStore } from '../stores'
import { useApiDetailLoader } from './content-sections/use-api-detail-loader'
import { useGenerationPerformanceMetrics } from './content-sections/use-generation-performance-metrics'
import { useWorkspaceAsyncPolling } from './content-sections/use-workspace-async-polling'
import { useWorkspaceInputPages } from './content-sections/use-workspace-input-pages'
import { useWorkspaceSectionProps } from './content-sections/use-workspace-section-props'
import { useWorkflowTimeline } from './content-sections/use-workflow-timeline'
import type {
  UseWorkspaceContentSectionsParams,
  UseWorkspaceContentSectionsResult,
} from './useWorkspaceContentSections.types'
import {
  applyPollingStatusToWorkflowSteps,
  useGenerationActions,
  useHistoryActions,
} from './content-sections'

export function useWorkspaceContentSections({
  notify,
  openDownloadDialog,
  openHistoryDialog,
  openLocalHistoryDialog,
  setHistoryConfirmCallback,
  openQuickCreateProject,
  onSessionTrackingHint,
  currentTheme,
  appliedLayout,
  layoutMode,
  setLayoutMode,
  projects,
  sessions,
  selectedProjectId,
  setSelectedProjectId,
}: UseWorkspaceContentSectionsParams): UseWorkspaceContentSectionsResult {
  const {
    hydrated,
    pages,
    setPages,
    inputPage,
    setInputPage,
    inputSections,
    setInputSection,
    resetInputSections,
    saveInputHistory,
    undoInputSections,
    generated,
    setGenerated,
    addVersion,
    clearVersions,
  } = useContentStore()

  const tab = useWorkspaceStore((state) => state.tab)
  const setTab = useWorkspaceStore((state) => state.setTab)
  const tool = useWorkspaceStore((state) => state.tool)
  const setTool = useWorkspaceStore((state) => state.setTool)
  const pendingSessionRestoreToolKey = useWorkspaceStore(
    (state) => state.pendingSessionRestoreToolKey,
  )
  const pendingSessionRestoreToolOwner = useWorkspaceStore(
    (state) => state.pendingSessionRestoreToolOwner,
  )
  const clearPendingSessionRestoreTool = useWorkspaceStore(
    (state) => state.clearPendingSessionRestoreTool,
  )
  const sessionRestoreCommitRevision = useWorkspaceStore(
    (state) => state.sessionRestoreCommitRevision,
  )

  const {
    performanceMetrics,
    resetPerformanceMetrics,
    handleMetricsStart,
    handleMetricsCollected,
    handleFirstFrameMeasured,
    handleRenderMeasured,
  } = useGenerationPerformanceMetrics()
  const previousToolKeyRef = useRef<string | null>(null)
  const previousSessionRestoreCommitRevisionRef = useRef(sessionRestoreCommitRevision)
  const {
    resolveToolId,
    getWorkflowSteps,
    getInputSections,
    loadToolDetails,
    tabs: dynamicTabs,
    toolMetadataByName,
    getApiEndpointForTool,
  } = useDynamicTabs()

  const resolvedToolId = useMemo(() => resolveToolId(tool.name), [resolveToolId, tool.name])

  const { workflowTimeline, resetWorkflowTimeline } = useWorkflowTimeline({
    toolName: tool.name,
    toolVersion: tool.ver,
    getWorkflowSteps,
  })

  const {
    apiEndpoint,
    currentApiDetail,
    apiDetailLoaded,
    ensureApiDetailLoaded,
    requestApiDetailLoad,
    reloadApiDetail,
    resetApiDetailLoad,
  } = useApiDetailLoader({
    hydrated,
    toolName: tool.name,
    toolVersion: tool.ver,
    inputSections,
    getApiEndpointForTool,
  })

  const {
    startPolling,
    stopPolling,
    pollingStatus,
    emitSessionTrackingHint,
    setApplyAsyncCompletionResult,
  } = useWorkspaceAsyncPolling({
    currentApiDetail,
    notify,
    onSessionTrackingHint,
  })

  useEffect(() => {
    if (previousSessionRestoreCommitRevisionRef.current === sessionRestoreCommitRevision) {
      return
    }
    previousSessionRestoreCommitRevisionRef.current = sessionRestoreCommitRevision
    stopPolling({ resetStatus: true, reason: 'manual' })
    resetWorkflowTimeline()
  }, [resetWorkflowTimeline, sessionRestoreCommitRevision, stopPolling])

  // 当工具或版本切换时，清空 schema 与生成状态，避免残留内容串工具。
  useEffect(() => {
    const currentToolKey = `${tool.name}::${tool.ver ?? ''}`
    const previousToolKey = previousToolKeyRef.current
    const restoreToolOwner =
      pendingSessionRestoreToolKey === currentToolKey
        ? pendingSessionRestoreToolOwner
        : null
    if (restoreToolOwner) {
      clearPendingSessionRestoreTool(restoreToolOwner)
    }
    previousToolKeyRef.current = currentToolKey

    if (previousToolKey === currentToolKey) {
      return
    }

    resetApiDetailLoad()
    if (restoreToolOwner) {
      return
    }
    stopPolling({ resetStatus: true, reason: 'manual' })
    resetWorkflowTimeline()
    // 清空当前工具输入，避免同名字段在切换工具后被继承。
    resetInputSections()
    setPages([])
    setInputPage('userInstruction')
    setGenerated('')
    clearVersions()
  }, [
    clearPendingSessionRestoreTool,
    clearVersions,
    resetInputSections,
    setGenerated,
    pendingSessionRestoreToolKey,
    pendingSessionRestoreToolOwner,
    setInputPage,
    setPages,
    stopPolling,
    resetWorkflowTimeline,
    tool.name,
    tool.ver,
    resetApiDetailLoad,
  ])

  const {
    sectionDefinitions,
    activePages,
    tabsLoadError,
    retryLoadTabs,
    handleInputPageChange,
    handleInputSectionChange,
  } = useWorkspaceInputPages({
    hydrated,
    currentApiDetail,
    resolvedToolId,
    toolName: tool.name,
    toolVersion: tool.ver,
    pages,
    inputPage,
    apiEndpoint,
    apiDetailLoaded,
    getInputSections,
    loadToolDetails,
    setPages,
    setInputPage,
    setInputSection,
    requestApiDetailLoad,
    reloadApiDetail,
  })
  const [renderMode, setRenderMode] = useState<'rich' | 'source'>('rich')

  const {
    generatedFiles,
    setGeneratedFiles,
    generationStatus,
    destinations,
    canGenerate,
    generateDisabled,
    isGenerating,
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
  } = useGenerationActions({
    apiDetail: currentApiDetail,
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
    setInputPage,
    setTab,
    setTool,
    startPolling,
    stopPolling,
    onMetricsStart: handleMetricsStart,
    onMetricsCollected: handleMetricsCollected,
    onOpenDownloadSelector: () => openDownloadDialog({ exportType: 'files' }),
    onSessionTrackingHint: emitSessionTrackingHint,
  })

  setApplyAsyncCompletionResult(applyAsyncCompletionResult)

  const isAsyncWorkflow = currentApiDetail?.is_async === 1
  const startNewSessionDisabled =
    !isAsyncWorkflow &&
    (isGenerating || generationStatus === 'queued' || generationStatus === 'running')
  const startNewSessionTooltip = startNewSessionDisabled
    ? '同步工作流正在生成中，请等待结束后再开启新会话'
    : '在不切换当前工具的前提下，开始一个新会话并清空输入与输出'

  const { readHistoryToInput, loadSessionFiles } = useHistoryActions({
    notify,
    openHistoryDialog,
    openLocalHistoryDialog,
    setHistoryConfirmCallback,
    sessions,
    selectedProjectId,
    activePages,
    inputPage,
    inputSections,
    sectionDefinitions,
    setInputSection,
    setInputPage,
    setGenerated,
    saveInputHistory,
    setGeneratedFiles: (files) => setGeneratedFiles(files),
  })

  useEffect(() => {
    if (useWorkspaceStore.getState().isSessionOutputRestoring) {
      return
    }
    setGeneratedFiles([])
    resetPerformanceMetrics()
  }, [resetPerformanceMetrics, setGeneratedFiles, tool.name, tool.ver])

  const { inputSectionProps, outputSectionProps } = useWorkspaceSectionProps({
    inputPage,
    inputSections,
    layoutMode,
    appliedLayout,
    activePages,
    destinations,
    setInputPage: handleInputPageChange,
    setInputSection: handleInputSectionChange,
    setLayoutMode,
    handleInputFiles,
    readHistoryToInput,
    copyInput,
    clearAllInputs,
    startNewSession,
    startNewSessionDisabled,
    startNewSessionTooltip,
    openQuickCreateProject,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    sectionDefinitions,
    apiDetail: currentApiDetail ?? undefined,
    tabsLoadError,
    onRetryLoadTabs: retryLoadTabs,
    generated,
    isGenerating,
    generationStatus,
    renderMode,
    canGenerate,
    generateDisabled,
    isAsyncWorkflow,
    themeColor: currentTheme.primary,
    generate,
    copyGenerated,
    handleDownload,
    handleNextStep,
    setRenderMode,
    downloadableCount: generatedFiles.length,
    performanceMetrics,
    onFirstFrameMeasured: handleFirstFrameMeasured,
    onRenderMeasured: handleRenderMeasured,
  })

  const workflowSteps = useMemo(
    () => applyPollingStatusToWorkflowSteps(workflowTimeline, pollingStatus, generationStatus),
    [workflowTimeline, pollingStatus, generationStatus],
  )

  return {
    inputSectionProps,
    outputSectionProps,
    workflowSteps,
    downloadableFiles: generatedFiles,
    requestApiDetailLoad,
    shortcuts: {
      generate,
      copyInput,
      undoInputs,
      setLayoutMode,
    },
    loadSessionFiles,
    isAsync: Boolean(currentApiDetail?.is_async === 1),
  }
}
