import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'

import type { Project } from '@/types/api'

import type { VirtuosoHandle } from 'react-virtuoso'

import { CHAT_TABS } from '../constants'
import type { ChatTabKey, ChatSession, Theme } from '../types'

import { useClickOutside } from '../hooks/useClickOutside'

import { useInstructionLibrary } from './chat/hooks/useInstructionLibrary'
import type { InstructionFormState } from './chat/hooks/instruction-library-types'
import { useReadMenu } from './chat/hooks/useReadMenu'
import { useChatSearch } from './chat/hooks/useChatSearch'
import { useChatFileUpload } from './chat/hooks/useChatFileUpload'
import { useChatExport } from './chat/hooks/useChatExport'
import { ChatConversationPane } from './chat/ChatConversationPane'
import { ReadMenu } from './chat/ReadMenu'
import { ComponentErrorBoundary } from './error-boundaries'
import {
  TEXTAREA_AUTO_MAX_HEIGHT,
  TEXTAREA_HEIGHT_PRESETS,
  type ChatTabOption,
} from './chat-panel/ChatPanel.constants'
import { ChatPanelFooter, getChatSecondaryActions } from './chat-panel/ChatPanel.footer'
import { ChatTabHeader } from './chat-panel/ChatPanel.header'
import { ChatPanelOverlays } from './chat-panel/ChatPanel.overlays'
import {
  useChatPanelComposerState,
  useTextareaHeightPreset,
} from './chat-panel/useChatPanelComposerState'

interface ChatPanelProps {
  width: number
  chatTab: ChatTabKey
  setChatTab: (tab: ChatTabKey) => void
  session: ChatSession
  onInputChange: (value: string) => void
  onAddAttachment: (files: FileList | null, type: 'image' | 'file') => void
  onRemoveAttachment: (id: string) => void
  loading: boolean
  sendChat: (inputOverride?: string) => void
  clearChat: () => void
  readMenuOpen: boolean
  readMenuBtnRef: RefObject<HTMLButtonElement | null>
  readMenuRef: RefObject<HTMLDivElement | null>
  setReadMenuOpen: (open: boolean) => void
  readFromGenerated: () => void
  readFromHistory: () => void
  currentTheme: Theme
  projects: Project[]
  onProjectChange: (projectId: number | null) => void
  onQuickCreateProject: () => void
  onStartNewConversation: () => void
  notify: (message: string) => void
  onRegenerateChat: () => void
  onCancelChatRequest?: () => void
  chatTabs?: ChatTabOption[]
  chatError?: string | null
}

const ChatPanelContent = memo<ChatPanelProps>(
  ({
    width,
    chatTab,
    setChatTab,
    session,
    onInputChange,
    onAddAttachment,
    onRemoveAttachment,
    loading,
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
    onProjectChange,
    onQuickCreateProject,
    onStartNewConversation,
    notify,
    onRegenerateChat,
    onCancelChatRequest,
    chatTabs,
    chatError,
  }) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null)
    const isAtBottomRef = useRef(true)
    const prevSessionIdRef = useRef<number | undefined>(session.sessionId)
    const notifyRef = useRef(notify)
    useEffect(() => {
      notifyRef.current = notify
    }, [notify])
    const [showScrollButton, setShowScrollButton] = useState(false)
    const [associateProjectDialogOpen, setAssociateProjectDialogOpen] = useState(false)
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
    const [newConversationConfirmOpen, setNewConversationConfirmOpen] = useState(false)
    const associateProjectButtonRef = useRef<HTMLButtonElement>(null)
    const clearChatButtonRef = useRef<HTMLButtonElement>(null)
    const newConversationButtonRef = useRef<HTMLButtonElement>(null)
    const searchButtonRef = useRef<HTMLButtonElement>(null)
    const { currentTextareaHeightPreset, handleTextareaHeightPresetChange } =
      useTextareaHeightPreset(chatTab)
    const {
      localInput,
      textareaRef,
      handleTextareaReady,
      handleInputChange,
      handleOasisActionFill,
      handleSuggestionPrepend,
      handleInstructionPrepend,
      commitLocalInput,
      handleSendChat,
      handleClearChatConfirm,
      handleStartNewConversation,
      handleNewConversationConfirm,
    } = useChatPanelComposerState({
      chatTab,
      sessionInput: session.input,
      sessionId: session.sessionId,
      currentTextareaHeightPreset,
      onInputChange,
      sendChat,
      clearChat,
      onStartNewConversation,
      notifyRef,
      clearChatButtonRef,
      newConversationButtonRef,
      setClearConfirmOpen,
      setNewConversationConfirmOpen,
    })

    const handleSearchCloseOverlays = useCallback(() => {
      setReadMenuOpen(false)
    }, [setReadMenuOpen])

    const {
      searchOpen,
      searchQuery,
      searchCurrentIndex,
      searchMatchCount,
      openSearch,
      clearSearch,
      handleSearchNext,
      handleSearchPrev,
      handleSearchQueryChange,
      isMatch,
    } = useChatSearch({
      messages: session.messages,
      virtuosoRef,
      onCloseOverlays: handleSearchCloseOverlays,
    })

    const fileUpload = useChatFileUpload({ onAddAttachment, notify })

    const { handleExportChat } = useChatExport({ messages: session.messages, notify })

    // Pre-compute lastAssistantId once instead of inside itemContent (O(N) per message)
    const lastAssistantId = useMemo(
      () => [...session.messages].reverse().find((m) => m.role === 'assistant')?.id,
      [session.messages],
    )

    // Memoize theme-dependent inline style objects to avoid re-creating on every render
    const scrollButtonStyle = useMemo<CSSProperties>(
      () => ({
        backgroundColor: currentTheme.primary,
        color: currentTheme.primaryForeground ?? '#fff',
      }),
      [currentTheme.primary, currentTheme.primaryForeground],
    )
    const dragOverlayStyle = useMemo<CSSProperties>(
      () => ({ borderColor: currentTheme.primary, backgroundColor: `${currentTheme.primary}0a` }),
      [currentTheme.primary],
    )
    const textareaStyle = useMemo<CSSProperties>(
      () => ({
        minHeight: `${TEXTAREA_HEIGHT_PRESETS[currentTextareaHeightPreset].baseHeight}px`,
        maxHeight: `${TEXTAREA_AUTO_MAX_HEIGHT}px`,
      }),
      [currentTextareaHeightPreset],
    )
    const textareaPreviewStyle = useMemo<CSSProperties>(
      () => ({
        minHeight: `${TEXTAREA_HEIGHT_PRESETS[currentTextareaHeightPreset].baseHeight}px`,
        maxHeight: `${TEXTAREA_AUTO_MAX_HEIGHT}px`,
        height: `${TEXTAREA_HEIGHT_PRESETS[currentTextareaHeightPreset].baseHeight}px`,
      }),
      [currentTextareaHeightPreset],
    )
    useEffect(() => {
      clearSearch()
    }, [chatTab, clearSearch])

    const handleSearchClose = useCallback(() => {
      clearSearch()
      searchButtonRef.current?.focus()
    }, [clearSearch])

    const handleScrollToBottom = useCallback(() => {
      virtuosoRef.current?.scrollToIndex({ index: session.messages.length - 1, behavior: 'smooth' })
      setShowScrollButton(false)
    }, [session.messages.length])

    // Scroll to bottom when loading a different session (history restore)
    useEffect(() => {
      if (prevSessionIdRef.current !== session.sessionId && session.messages.length > 1) {
        prevSessionIdRef.current = session.sessionId
        const rafId = requestAnimationFrame(() => {
          virtuosoRef.current?.scrollToIndex({
            index: session.messages.length - 1,
            behavior: 'auto',
          })
        })
        return () => cancelAnimationFrame(rafId)
      }
    }, [session.sessionId, session.messages.length])

    useClickOutside([readMenuBtnRef, readMenuRef], () => setReadMenuOpen(false), readMenuOpen)

    const { attachments: chatAttachments } = session
    const associatedProjectId = session.associatedProjectId ?? null

    const handleClearChatRequest = useCallback(() => {
      setClearConfirmOpen(true)
    }, [])

    const handleClearChatCancel = useCallback(() => {
      setClearConfirmOpen(false)
      clearChatButtonRef.current?.focus()
    }, [])

    const handleNewConversationCancel = useCallback(() => {
      setNewConversationConfirmOpen(false)
      newConversationButtonRef.current?.focus()
    }, [])

    const handleCopyMessage = useCallback(async (content: string) => {
      try {
        await navigator.clipboard.writeText(content)
        notifyRef.current('已复制到剪贴板')
      } catch {
        notifyRef.current('复制失败，请手动复制')
      }
    }, [])

    const handleRegenerate = useCallback(() => {
      onRegenerateChat()
    }, [onRegenerateChat])

    const instructionHook = useInstructionLibrary({
      enabled: chatTab === 'general' || chatTab === 'focus' || chatTab === 'image',
      namespace: chatTab,
      onSelectInstruction: handleInstructionPrepend,
    })

    const { isReadDisabled, readDisabledReason, toggleReadMenu, closeReadMenu } = useReadMenu({
      chatTab,
      readMenuOpen,
      setReadMenuOpen,
    })

    const handleInstructionChange = useCallback(
      (field: keyof InstructionFormState, value: string) => {
        instructionHook.setNewInstruction((prev: InstructionFormState) => ({
          ...prev,
          [field]: value,
        }))
      },
      [instructionHook],
    )

    const handleReadFromGenerated = useCallback(() => {
      commitLocalInput()
      readFromGenerated()
    }, [commitLocalInput, readFromGenerated])

    const handleReadFromHistory = useCallback(() => {
      commitLocalInput()
      readFromHistory()
    }, [commitLocalInput, readFromHistory])

    const readMenuDisabledReason = loading
      ? '正在生成内容，完成后才能读取资料。'
      : readDisabledReason

    const readMenu = useMemo(
      () => (
        <ReadMenu
          isOpen={readMenuOpen}
          isDisabled={isReadDisabled || loading}
          disabledReason={readMenuDisabledReason}
          onToggle={toggleReadMenu}
          onClose={closeReadMenu}
          buttonRef={readMenuBtnRef}
          menuRef={readMenuRef}
          onReadFromGenerated={handleReadFromGenerated}
          onReadFromHistory={handleReadFromHistory}
          historyDisabled={!associatedProjectId}
          historyDisabledReason="请先关联项目后读取项目历史资料。"
          theme={currentTheme}
        />
      ),
      [
        readMenuOpen,
        isReadDisabled,
        readMenuDisabledReason,
        loading,
        toggleReadMenu,
        closeReadMenu,
        readMenuBtnRef,
        readMenuRef,
        handleReadFromGenerated,
        handleReadFromHistory,
        associatedProjectId,
        currentTheme,
      ],
    )

    const restoreAssociateProjectFocus = useCallback(() => {
      requestAnimationFrame(() => {
        associateProjectButtonRef.current?.focus()
      })
    }, [])

    const handleOpenAssociateDialog = useCallback(() => {
      setAssociateProjectDialogOpen(true)
    }, [])

    const handleCloseAssociateDialog = useCallback(() => {
      setAssociateProjectDialogOpen(false)
      restoreAssociateProjectFocus()
    }, [restoreAssociateProjectFocus])

    const handleSelectProject = useCallback(
      (project: Project) => {
        setAssociateProjectDialogOpen(false)
        onProjectChange(project.id)
        restoreAssociateProjectFocus()
      },
      [onProjectChange, restoreAssociateProjectFocus],
    )

    const handleCreateNewProject = useCallback(() => {
      setAssociateProjectDialogOpen(false)
      onQuickCreateProject()
    }, [onQuickCreateProject])

    const associatedProjectName = associatedProjectId
      ? projects.find((p) => p.id === associatedProjectId)?.name || '项目'
      : '无'

    const showProjectStatusLine = chatTab !== 'general'

    const availableTabs = chatTabs && chatTabs.length > 0 ? chatTabs : CHAT_TABS
    const currentTabHint = availableTabs.find((tab) => tab.key === chatTab)?.hint

    const handleAtBottomStateChange = useCallback(
      (atBottom: boolean) => {
        isAtBottomRef.current = atBottom
        if (atBottom) {
          setShowScrollButton(false)
        } else if (session.messages.length > 5) {
          setShowScrollButton(true)
        }
      },
      [session.messages.length],
    )

    return (
      <aside
        aria-label="对话面板"
        className="relative h-full bg-white border-l flex flex-col"
        style={{ width }}
      >
        <ChatTabHeader
          availableTabs={availableTabs}
          chatTab={chatTab}
          onTabChange={setChatTab}
          currentHint={currentTabHint}
          showSearchButton={session.messages.length > 1}
          onOpenSearch={openSearch}
          searchButtonRef={searchButtonRef}
        />

        <ChatConversationPane
          chatTab={chatTab}
          loading={loading}
          currentTheme={currentTheme}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          onSearchPrev={handleSearchPrev}
          onSearchNext={handleSearchNext}
          onSearchClose={handleSearchClose}
          searchMatchCount={searchMatchCount}
          searchCurrentIndex={searchCurrentIndex}
          session={session}
          virtuosoRef={virtuosoRef}
          onBottomStateChange={handleAtBottomStateChange}
          isMatch={isMatch}
          onCopyMessage={handleCopyMessage}
          onRegenerate={handleRegenerate}
          onCancelChatRequest={onCancelChatRequest}
          lastAssistantId={lastAssistantId}
          chatError={chatError}
          onSuggestionClick={handleSuggestionPrepend}
          onOasisActionFill={handleOasisActionFill}
          showScrollButton={showScrollButton}
          scrollButtonStyle={scrollButtonStyle}
          onScrollToBottom={handleScrollToBottom}
        />

        <ChatPanelFooter
          panelWidth={width}
          loading={loading}
          currentTheme={currentTheme}
          currentTextareaHeightPreset={currentTextareaHeightPreset}
          handleTextareaHeightPresetChange={handleTextareaHeightPresetChange}
          textareaRef={textareaRef}
          localInput={localInput}
          handleInputChange={handleInputChange}
          chatTab={chatTab}
          textareaStyle={textareaStyle}
          textareaPreviewStyle={textareaPreviewStyle}
          handleSendChat={handleSendChat}
          fileUpload={fileUpload}
          dragOverlayStyle={dragOverlayStyle}
          handleTextareaReady={handleTextareaReady}
          onExportChat={handleExportChat}
          showProjectStatusLine={showProjectStatusLine}
          associatedProjectName={associatedProjectName}
          attachments={chatAttachments}
          onRemoveAttachment={onRemoveAttachment}
          readMenu={readMenu}
          secondaryAction={getChatSecondaryActions({
            chatTab,
            currentTheme,
            instructionHook,
            onInstructionChange: handleInstructionChange,
            onAssociateProjectClick: handleOpenAssociateDialog,
            disabled: loading,
            associateProjectButtonRef,
          })}
          onClearChat={handleClearChatRequest}
          onStartNewConversation={handleStartNewConversation}
          clearChatButtonRef={clearChatButtonRef}
          newConversationButtonRef={newConversationButtonRef}
        />
        <ChatPanelOverlays
          associateProjectDialogOpen={associateProjectDialogOpen}
          onCloseAssociateProjectDialog={handleCloseAssociateDialog}
          onCreateNewProject={handleCreateNewProject}
          onSelectProject={handleSelectProject}
          sessionName={localInput || '当前会话'}
          projects={projects}
          themeColor={currentTheme.primary}
          clearConfirmOpen={clearConfirmOpen}
          onCancelClear={handleClearChatCancel}
          onConfirmClear={handleClearChatConfirm}
          newConversationConfirmOpen={newConversationConfirmOpen}
          onCancelNewConversation={handleNewConversationCancel}
          onConfirmNewConversation={handleNewConversationConfirm}
        />
      </aside>
    )
  },
)

ChatPanelContent.displayName = 'ChatPanelContent'

export const ChatPanel = memo<ChatPanelProps>((props) => {
  return (
    <ComponentErrorBoundary componentName="ChatPanel">
      <ChatPanelContent {...props} />
    </ComponentErrorBoundary>
  )
})

ChatPanel.displayName = 'ChatPanel'
