import type { CSSProperties, ReactNode, RefObject } from 'react'

import type { ChatTabKey, ChatSession, Theme } from '../../types'
import { AttachmentBar } from '../chat/AttachmentBar'
import type { InstructionFormState } from '../chat/hooks/instruction-library-types'
import { useInstructionLibrary } from '../chat/hooks/useInstructionLibrary'
import { InstructionLibraryPanel } from '../chat/InstructionLibraryPanel'
import { Tooltip } from '../ui'

import { ChatComposerArea, type ChatComposerFileUpload } from './ChatPanel.composer'
import { INSTRUCTION_LIBRARY_LABELS, type TextareaHeightPresetKey } from './ChatPanel.constants'
import { getAssociateProjectButtonStyle } from './ChatPanel.helpers'

interface ChatFooterMetaProps {
  currentTheme: Theme
  onExportChat: () => void
  showProjectStatusLine: boolean
  associatedProjectName: string
  disabled?: boolean
}

const ChatFooterMeta = ({
  currentTheme,
  onExportChat,
  showProjectStatusLine,
  associatedProjectName,
  disabled = false,
}: ChatFooterMetaProps) => (
  <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-gray-500">
    {showProjectStatusLine ? (
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0">关联到:</span>
        <span
          className="min-w-0 truncate font-medium"
          style={{ color: currentTheme.primaryText ?? currentTheme.primary }}
          title={associatedProjectName}
        >
          {associatedProjectName}
        </span>
      </div>
    ) : null}
    <Tooltip content="导出当前对话为 Markdown 文件" position="top" inlineChild>
      <button
        type="button"
        className="flex shrink-0 items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onExportChat}
        aria-label="导出对话"
        disabled={disabled}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        导出
      </button>
    </Tooltip>
  </div>
)

interface AssociateProjectActionButtonProps {
  theme: Theme
  onClick: () => void
  disabled?: boolean
  buttonRef?: RefObject<HTMLButtonElement | null>
}

const AssociateProjectActionButton = ({
  theme,
  onClick,
  disabled = false,
  buttonRef,
}: AssociateProjectActionButtonProps) => (
  <div className="relative group">
    <Tooltip content="选择要关联的项目，将当前会话与项目数据关联">
      <button
        ref={buttonRef}
        className="chat-action-btn px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2"
        onClick={onClick}
        aria-label="关联项目"
        type="button"
        style={getAssociateProjectButtonStyle(theme)}
        disabled={disabled}
      >
        关联
      </button>
    </Tooltip>
  </div>
)

interface ChatSecondaryActionsProps {
  chatTab: ChatTabKey
  currentTheme: Theme
  instructionHook: ReturnType<typeof useInstructionLibrary>
  onInstructionChange: (field: keyof InstructionFormState, value: string) => void
  onAssociateProjectClick: () => void
  disabled?: boolean
  associateProjectButtonRef?: RefObject<HTMLButtonElement | null>
}

export function getChatSecondaryActions({
  chatTab,
  currentTheme,
  instructionHook,
  onInstructionChange,
  onAssociateProjectClick,
  disabled = false,
  associateProjectButtonRef,
}: ChatSecondaryActionsProps): ReactNode[] {
  const secondaryActions: ReactNode[] = []

  if (chatTab !== 'general') {
    secondaryActions.push(
      <AssociateProjectActionButton
        key="associate-project-action"
        theme={currentTheme}
        onClick={onAssociateProjectClick}
        disabled={disabled}
        buttonRef={associateProjectButtonRef}
      />,
    )
  }

  secondaryActions.push(
    <InstructionLibraryPanel
      key={`instruction-library-${chatTab}`}
      label={INSTRUCTION_LIBRARY_LABELS[chatTab]}
      instructionOpen={instructionHook.instructionOpen}
      instructionLibrary={instructionHook.instructionLibrary}
      isLoading={instructionHook.isLoading}
      instructionListHeight={instructionHook.instructionListHeight}
      showInstructionForm={instructionHook.showInstructionForm}
      newInstruction={instructionHook.newInstruction}
      instructionBtnRef={instructionHook.instructionBtnRef}
      instructionAddBtnRef={instructionHook.instructionAddBtnRef}
      instructionPanelRef={instructionHook.instructionPanelRef}
      toggleInstruction={instructionHook.toggleInstruction}
      toggleInstructionForm={instructionHook.toggleInstructionForm}
      onInstructionSelect={instructionHook.handleInstructionSelect}
      onInstructionDelete={instructionHook.handleInstructionDelete}
      onInstructionCreate={instructionHook.handleInstructionCreate}
      onInstructionCancel={instructionHook.handleInstructionCancel}
      onInstructionChange={onInstructionChange}
      validationError={instructionHook.validationError}
      loadError={instructionHook.loadError}
      operationError={instructionHook.operationError}
      deletingInstructionKey={instructionHook.deletingInstructionKey}
      isCreatingInstruction={instructionHook.isCreatingInstruction}
      onInstructionReload={instructionHook.reloadInstructions}
      startInstructionResize={instructionHook.startInstructionResize}
      handleInstructionResizeKeyDown={instructionHook.handleInstructionResizeKeyDown}
      theme={currentTheme}
      disabled={disabled}
    />,
  )

  return secondaryActions
}

interface ChatPanelFooterProps {
  panelWidth: number
  loading: boolean
  currentTheme: Theme
  currentTextareaHeightPreset: TextareaHeightPresetKey
  handleTextareaHeightPresetChange: (preset: TextareaHeightPresetKey) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  localInput: string
  handleInputChange: (value: string) => void
  chatTab: ChatTabKey
  textareaStyle: CSSProperties
  textareaPreviewStyle: CSSProperties
  handleSendChat: () => void
  fileUpload: ChatComposerFileUpload
  dragOverlayStyle: CSSProperties
  handleTextareaReady: (textarea: HTMLTextAreaElement) => void
  onExportChat: () => void
  showProjectStatusLine: boolean
  associatedProjectName: string
  attachments: ChatSession['attachments']
  onRemoveAttachment: (id: string) => void
  readMenu: ReactNode
  secondaryAction: ReactNode
  onClearChat: () => void
  onStartNewConversation: () => void
  clearChatButtonRef?: RefObject<HTMLButtonElement | null>
  newConversationButtonRef?: RefObject<HTMLButtonElement | null>
}

export const ChatPanelFooter = ({
  panelWidth,
  loading,
  currentTheme,
  currentTextareaHeightPreset,
  handleTextareaHeightPresetChange,
  textareaRef,
  localInput,
  handleInputChange,
  chatTab,
  textareaStyle,
  textareaPreviewStyle,
  handleSendChat,
  fileUpload,
  dragOverlayStyle,
  handleTextareaReady,
  onExportChat,
  showProjectStatusLine,
  associatedProjectName,
  attachments,
  onRemoveAttachment,
  readMenu,
  secondaryAction,
  onClearChat,
  onStartNewConversation,
  clearChatButtonRef,
  newConversationButtonRef,
}: ChatPanelFooterProps) => (
  <div
    className={`shrink-0 border-t px-3 py-3 space-y-3 bg-white transition-opacity ${loading ? 'opacity-50' : ''}`}
    aria-label="对话输入与操作区"
    aria-busy={loading}
    aria-disabled={loading}
  >
    <ChatComposerArea
      currentTheme={currentTheme}
      currentTextareaHeightPreset={currentTextareaHeightPreset}
      handleTextareaHeightPresetChange={handleTextareaHeightPresetChange}
      textareaRef={textareaRef}
      localInput={localInput}
      handleInputChange={handleInputChange}
      loading={loading}
      disabled={loading}
      chatTab={chatTab}
      textareaStyle={textareaStyle}
      textareaPreviewStyle={textareaPreviewStyle}
      handleSendChat={handleSendChat}
      fileUpload={fileUpload}
      dragOverlayStyle={dragOverlayStyle}
      handleTextareaReady={handleTextareaReady}
    />
    <ChatFooterMeta
      currentTheme={currentTheme}
      onExportChat={onExportChat}
      showProjectStatusLine={showProjectStatusLine}
      associatedProjectName={associatedProjectName}
      disabled={loading}
    />

    <AttachmentBar
      panelWidth={panelWidth}
      attachments={attachments}
      onRemoveAttachment={onRemoveAttachment}
      readMenu={readMenu}
      secondaryAction={secondaryAction}
      chatInput={localInput}
      onClearChat={onClearChat}
      onSendChat={handleSendChat}
      onStartNewConversation={onStartNewConversation}
      clearChatButtonRef={clearChatButtonRef}
      newConversationButtonRef={newConversationButtonRef}
      theme={currentTheme}
      loading={loading}
    />
  </div>
)
