import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useLayoutManagement } from '@/hooks'
import type { Project } from '@/types/api'
import { DEFAULT_LEFT_SIDEBAR_WIDTH } from '@/utils/chatPanelWidth'

import { useWorkspaceUIStore } from '../stores'

import { useWorkspaceChatPanel } from './useWorkspaceChatPanel'
import { useWorkspaceChatWidthSync } from './useWorkspaceChatWidthSync'
import { useWorkspaceContentSections } from './useWorkspaceContentSections'
import type { UseWorkspaceLayoutParams, WorkspaceLayoutResult } from './workspace-layout-types'
import { isWorkspaceFastBootEnabled } from './workspace-env'
import {
  buildHistoryDataConfirmHandler,
  wrapLocalHistoryDialogController,
} from './workspace-history-confirm'
import { useWorkspaceNavigation } from './useWorkspaceNavigation'
import { useWorkspaceSidebar, type ChatSessionSelectPayload } from './useWorkspaceSidebar'
import type { ChatSessionRestoreResult } from './sidebar/session-surface'
import { useWorkspaceWorkflowList } from './useWorkspaceWorkflowList'

export function useWorkspaceLayout({
  notify,
  showConfirm,
  hideConfirm,
  historyDialog,
  downloadDialog,
  settingsDialog,
  releaseNotesDialog,
  helpDialog,
  rewardSuggestionDialog,
  customerServiceDialog,
  quickCreateProjectDialog,
  localHistoryDialog,
}: UseWorkspaceLayoutParams): WorkspaceLayoutResult {
  const fastBootEnabled = isWorkspaceFastBootEnabled()
  const {
    chatWidth,
    preferredChatWidth,
    setChatWidth,
    setAutoAdjustedChatWidth,
    layoutMode,
    setLayoutMode,
    activateSessionSurface,
  } = useWorkspaceUIStore()
  const { workflows } = useWorkspaceWorkflowList({
    fastBootEnabled,
    downloadDialogOpen: downloadDialog.isOpen,
  })
  const [historyConfirmCallback, setHistoryConfirmCallback] = useState<
    ((data: string[], rawItems?: Record<string, unknown>[]) => void) | null
  >(null)
  const clearPendingHistoryConfirm = useCallback(() => setHistoryConfirmCallback(null), [])

  // 使用 ref 来存储 loadSessionFiles，避免循环依赖
  const loadSessionFilesRef = useRef<
    (params: {
      fileUrl?: string | string[]
      fileOutput?: Array<Record<string, unknown>>
      sessionId: number
    }) => void
  >(() => {
    console.warn('[loadSessionFilesRef] Function not initialized yet')
  })
  const authReadyMarkedRef = useRef(false)

  useEffect(() => {
    if (authReadyMarkedRef.current) {
      return
    }
    authReadyMarkedRef.current = true
    if (typeof window !== 'undefined') {
      window.performance?.mark?.('auth_ready')
    }
  }, [])

  const navigation = useWorkspaceNavigation({
    onSuggestionClick: rewardSuggestionDialog.open,
    onOpenSettingsPage: settingsDialog.openPage,
    onReleaseNotesClick: releaseNotesDialog.open,
    onHelpClick: helpDialog.open,
    onCustomerServiceClick: customerServiceDialog.open,
  })
  const { navigationBarProps, currentTheme, showSidebar, chatOpen, chatMode, isCompact } =
    navigation
  const chatSessionSelectHandlerRef = useRef<
    ((payload: ChatSessionSelectPayload) => ChatSessionRestoreResult) | null
  >(null)
  const requestApiDetailLoadRef = useRef<(() => void) | null>(null)

  useWorkspaceChatWidthSync({
    chatWidth,
    preferredChatWidth,
    setChatWidth,
    setAutoAdjustedChatWidth,
    chatMode,
    showSidebar,
    leftSidebarWidth: DEFAULT_LEFT_SIDEBAR_WIDTH,
  })

  const handleChatSessionSelect = useCallback(
    (payload: ChatSessionSelectPayload): ChatSessionRestoreResult => {
      const handler = chatSessionSelectHandlerRef.current
      if (!handler) {
        return { status: 'blocked', reason: 'handler-unavailable' }
      }
      return handler(payload)
    },
    [],
  )
  const handleSessionActivated = useCallback(
    (surface: 'chat' | 'workflow') => {
      activateSessionSurface(surface, {
        compact: isCompact,
      })

      if (!isCompact || typeof window === 'undefined') return

      window.requestAnimationFrame(() => {
        const targetId =
          surface === 'chat' ? 'workspace-chat-surface' : 'workspace-workflow-surface'
        document.getElementById(targetId)?.focus({ preventScroll: true })
      })
    },
    [activateSessionSurface, isCompact],
  )
  const { appliedLayout, middleRef, layoutRef, startChatDrag, resizeChatBy } = useLayoutManagement(
    layoutMode,
    showSidebar,
    chatWidth,
    setChatWidth,
    DEFAULT_LEFT_SIDEBAR_WIDTH,
    chatMode,
  )

  const openQuickCreateProject = useCallback(
    () => quickCreateProjectDialog.open(),
    [quickCreateProjectDialog],
  )

  const sidebar = useWorkspaceSidebar({
    notify,
    showConfirm,
    hideConfirm,
    quickCreateProjectDialog,
    sidebarWidth: DEFAULT_LEFT_SIDEBAR_WIDTH,
    onChatSessionSelect: handleChatSessionSelect,
    onSessionActivated: handleSessionActivated,
    loadSessionFiles: (params) => {
      loadSessionFilesRef.current(params)
    },
    requestApiDetailLoad: () => {
      requestApiDetailLoadRef.current?.()
    },
  })

  const {
    createProject: createProjectFromSidebar,
    quickCreateProject: quickCreateProjectFromSidebar,
    refreshProjects: refreshSidebarProjects,
    setSelectedProjectId: setSidebarSelectedProjectId,
  } = sidebar

  const wrappedLocalHistoryDialog = useMemo(
    () => wrapLocalHistoryDialogController(localHistoryDialog, clearPendingHistoryConfirm),
    [clearPendingHistoryConfirm, localHistoryDialog],
  )

  const content = useWorkspaceContentSections({
    notify,
    openDownloadDialog: downloadDialog.open,
    openHistoryDialog: historyDialog.open,
    openLocalHistoryDialog: wrappedLocalHistoryDialog.open,
    setHistoryConfirmCallback,
    openQuickCreateProject,
    onSessionTrackingHint: (hint) => {
      void sidebar.trackSessionHint(hint)
    },
    currentTheme,
    appliedLayout,
    layoutMode,
    setLayoutMode,
    projects: sidebar.projects,
    sessions: sidebar.sessions,
    selectedProjectId: sidebar.selectedProjectId,
    setSelectedProjectId: setSidebarSelectedProjectId,
  })
  requestApiDetailLoadRef.current = content.requestApiDetailLoad

  // 更新 loadSessionFilesRef，使其指向 content 中的 loadSessionFiles
  loadSessionFilesRef.current = content.loadSessionFiles

  const {
    chatPanelProps,
    handleHistoryDataConfirm: chatPanelHandleHistoryDataConfirm,
    setAssociatedProject: setChatAssociatedProject,
    loadSessionFromSidebar,
  } = useWorkspaceChatPanel({
    notify,
    showConfirm,
    hideConfirm,
    historyDialog,
    chatWidth,
    currentTheme,
    projects: sidebar.projects,
    openQuickCreateProject,
    refreshSessions: sidebar.refreshSessions,
    onWorkspaceProjectSelect: setSidebarSelectedProjectId,
  })

  const handleHistoryDataConfirm = useCallback(
    (data: string[], rawItems?: unknown[]) => {
      buildHistoryDataConfirmHandler({
        getPendingHistoryConfirm: () => historyConfirmCallback,
        clearPendingHistoryConfirm,
        onChatHistoryConfirm: chatPanelHandleHistoryDataConfirm,
      })(data, rawItems as Record<string, unknown>[] | undefined)
    },
    [chatPanelHandleHistoryDataConfirm, clearPendingHistoryConfirm, historyConfirmCallback],
  )

  useEffect(() => {
    const handler = (payload: ChatSessionSelectPayload): ChatSessionRestoreResult => {
      return loadSessionFromSidebar(
        payload.detail,
        payload.tab,
        payload.project,
        payload.restoredProjectId ?? null,
      )
    }
    chatSessionSelectHandlerRef.current = handler
    return () => {
      if (chatSessionSelectHandlerRef.current === handler) {
        chatSessionSelectHandlerRef.current = null
      }
    }
  }, [loadSessionFromSidebar])

  useEffect(() => {
    const chatSessionHasLoadedHistory = typeof chatPanelProps.session?.sessionId === 'number'
    if (chatSessionHasLoadedHistory) {
      return
    }

    let project = null
    if (sidebar.selectedProjectId !== null) {
      project =
        sidebar.projects.find((item) => item.id === sidebar.selectedProjectId) ??
        ({
          id: sidebar.selectedProjectId,
          name: '未命名项目',
        } as Project)
    }
    setChatAssociatedProject(project)
  }, [
    chatPanelProps.session?.sessionId,
    setChatAssociatedProject,
    sidebar.projects,
    sidebar.selectedProjectId,
  ])

  const handleQuickCreateProjectConfirm = useCallback(
    async (projectName: string, customerName: string) => {
      const name = projectName.trim()
      const customer = customerName.trim()
      if (!name) {
        return
      }
      if (!customer) {
        return
      }

      try {
        const payload = { name, customerName: customer }
        const creator = quickCreateProjectFromSidebar ?? createProjectFromSidebar
        if (!creator) {
          notify('当前环境暂不支持创建项目')
          throw new Error('当前环境暂不支持创建项目')
        }

        const created = await creator(payload)

        if (created) {
          await refreshSidebarProjects()
          setSidebarSelectedProjectId(created.id)
          notify(`项目"${created.name}"创建成功`)
        } else {
          notify('项目创建失败，请稍后重试')
          throw new Error('项目创建失败，请稍后重试')
        }
      } catch (error) {
        console.error('创建项目失败:', error)
        if (error instanceof Error && error.message !== '项目创建失败，请稍后重试') {
          notify('项目创建失败，请稍后重试')
        }
        throw error
      }
    },
    [
      createProjectFromSidebar,
      quickCreateProjectFromSidebar,
      notify,
      refreshSidebarProjects,
      setSidebarSelectedProjectId,
    ],
  )

  return {
    navigationBarProps,
    leftSidebarProps: sidebar.leftSidebarProps,
    inputSectionProps: content.inputSectionProps,
    outputSectionProps: content.outputSectionProps,
    workflowSteps: content.workflowSteps,
    downloadableFiles: content.downloadableFiles,
    layoutRef,
    middleRef,
    appliedLayout,
    isCompact,
    showSidebar,
    currentTheme,
    chat: {
      isOpen: chatOpen,
      mode: chatMode,
      width: chatWidth,
      startResize: startChatDrag,
      keyboardResize: resizeChatBy,
      panelProps: chatPanelProps,
    },
    projects: sidebar.projects,
    sessions: sidebar.sessions, // 传递workflow sessions
    workflows, // 传递workflow列表
    selectedProject: sidebar.selectedProject,
    selectedProjectIndex: sidebar.selectedProjectIndex,
    handleQuickCreateProjectConfirm,
    downloadDialog,
    associateProjectDialog: sidebar.associateProjectDialog,
    historyDialog,
    localHistoryDialog: wrappedLocalHistoryDialog,
    shortcuts: content.shortcuts,
    handleHistoryDataConfirm,
    isAsync: content.isAsync,
  }
}
