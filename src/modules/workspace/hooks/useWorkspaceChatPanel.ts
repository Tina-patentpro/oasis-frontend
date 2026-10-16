import { useCallback, useEffect, useMemo } from 'react'
import type { ComponentProps } from 'react'

import { ChatPanel } from '@/components/ChatPanel'
import { useChatManagement } from '@/hooks'
import { CHAT_TABS } from '@/constants'
import type { Theme } from '@/types'
import type { Project, SessionDetail } from '@/types/api'
import type { ChatTabKey } from '@/types'

import { useContentStore, useWorkspaceStore } from '../stores'
import { useModelPreferenceStore } from '@/stores/useModelPreferenceStore'

import type { HistoryDialogController } from './useWorkspaceDialogs'
import type { ChatSessionRestoreResult } from './sidebar/session-surface'

interface UseWorkspaceChatPanelParams {
  notify: (message: string) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
  hideConfirm: () => void
  historyDialog: HistoryDialogController
  chatWidth: number
  currentTheme: Theme
  projects: Project[]
  openQuickCreateProject: () => void
  refreshSessions: () => Promise<void>
  onWorkspaceProjectSelect: (projectId: number | null) => void
}

interface UseWorkspaceChatPanelResult {
  chatPanelProps: ComponentProps<typeof ChatPanel>
  handleHistoryDataConfirm: ReturnType<typeof useChatManagement>['handleHistoryDataConfirm']
  setAssociatedProject: (project: Project | null) => void
  setChatTab: (tab: ChatTabKey) => void
  loadSessionFromSidebar: (
    detail: SessionDetail,
    tab: ChatTabKey,
    project: Project | null,
    restoredProjectId: number | null,
  ) => ChatSessionRestoreResult
}

export function useWorkspaceChatPanel({
  notify,
  showConfirm: _showConfirm,
  hideConfirm: _hideConfirm,
  historyDialog,
  chatWidth,
  currentTheme,
  projects,
  openQuickCreateProject,
  refreshSessions,
  onWorkspaceProjectSelect,
}: UseWorkspaceChatPanelParams): UseWorkspaceChatPanelResult {
  const generated = useContentStore((state) => state.generated)

  const {
    chatTab,
    setChatTab,
    chatSession,
    chatLoading,
    chatError,
    readMenuOpen,
    setReadMenuOpen,
    readMenuBtnRef,
    readMenuRef,
    changeChatInput,
    addChatAttachments,
    removeChatAttachment,
    sendChat,
    regenerateChat,
    cancelChatRequest,
    clearChat,
    setChatAssociatedProject,
    setChatAssociatedProjectLocal,
    readFromGenerated: readFromGeneratedHook,
    readFromHistory,
    handleHistoryDataConfirm,
    hydrateChatSessionFromDetail,
    startNewConversation,
  } = useChatManagement(
    notify,
    historyDialog.setOpen,
    () => {
      void refreshSessions()
    },
    onWorkspaceProjectSelect,
    historyDialog.open,
  )

  const isSessionOutputRestoring = useWorkspaceStore((state) => state.isSessionOutputRestoring)
  const effectiveChatLoading = chatLoading || isSessionOutputRestoring

  const { chatTabVisibility } = useModelPreferenceStore()

  const availableChatTabs = useMemo(() => {
    const filtered = CHAT_TABS.filter((item) => chatTabVisibility[item.key] !== false)
    return filtered.length > 0 ? filtered : CHAT_TABS
  }, [chatTabVisibility])

  useEffect(() => {
    if (!availableChatTabs.some((item) => item.key === chatTab) && availableChatTabs.length > 0) {
      setChatTab(availableChatTabs[0]?.key as ChatTabKey)
    }
  }, [availableChatTabs, chatTab, setChatTab])

  const readFromGenerated = useCallback(
    () => readFromGeneratedHook(generated),
    [generated, readFromGeneratedHook],
  )

  const chatPanelProps = useMemo<ComponentProps<typeof ChatPanel>>(
    () => ({
      width: chatWidth,
      chatTab,
      setChatTab,
      session: chatSession,
      onInputChange: changeChatInput,
      onAddAttachment: addChatAttachments,
      onRemoveAttachment: removeChatAttachment,
      loading: effectiveChatLoading,
      sendChat,
      clearChat,
      readMenuOpen,
      readMenuBtnRef,
      readMenuRef,
      setReadMenuOpen,
      readFromGenerated,
      readFromHistory,
      currentTheme,
      projects,
      onProjectChange: (projectId: number | null) => {
        const project =
          projectId !== null ? (projects.find((item) => item.id === projectId) ?? null) : null
        setChatAssociatedProject(project)
      },
      onQuickCreateProject: openQuickCreateProject,
      onStartNewConversation: () => {
        startNewConversation()
      },
      chatTabs: availableChatTabs,
      notify,
      onRegenerateChat: regenerateChat,
      onCancelChatRequest: cancelChatRequest,
      chatError,
    }),
    [
      addChatAttachments,
      changeChatInput,
      chatError,
      effectiveChatLoading,
      chatSession,
      chatTab,
      chatWidth,
      clearChat,
      cancelChatRequest,
      currentTheme,
      openQuickCreateProject,
      projects,
      availableChatTabs,
      readFromGenerated,
      readFromHistory,
      readMenuBtnRef,
      readMenuOpen,
      readMenuRef,
      sendChat,
      removeChatAttachment,
      setChatAssociatedProject,
      notify,
      regenerateChat,
      setChatTab,
      setReadMenuOpen,
      startNewConversation,
    ],
  )

  const loadSessionFromSidebar = useCallback(
    (
      detail: SessionDetail,
      tab: ChatTabKey,
      project: Project | null,
      restoredProjectId: number | null,
    ): ChatSessionRestoreResult => {
      const targetTab = availableChatTabs.find((item) => item.key === tab)?.key
      if (!targetTab) {
        notify('该历史会话所属的对话模式当前已隐藏，请先在模型设置中启用后再打开')
        return { status: 'blocked', reason: 'hidden-mode' }
      }
      hydrateChatSessionFromDetail(
        detail,
        targetTab as ChatTabKey,
        project,
        restoredProjectId,
      )
      return { status: 'restored' }
    },
    [availableChatTabs, hydrateChatSessionFromDetail, notify],
  )

  return {
    chatPanelProps,
    handleHistoryDataConfirm,
    setAssociatedProject: setChatAssociatedProjectLocal,
    setChatTab,
    loadSessionFromSidebar,
  }
}
