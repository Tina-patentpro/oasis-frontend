import {
  useId,
  type ChangeEventHandler,
  type ClipboardEventHandler,
  type CSSProperties,
  type DragEventHandler,
  type RefObject,
} from 'react'

import type { ChatTabKey, Theme } from '../../types'
import { Tooltip } from '../ui'
import { TextInputPanel } from '../workspace/input-section/TextInputPanel'

import { CHAT_INPUT_MAX_LENGTH, TEXTAREA_HEIGHT_PRESET_ORDER, TEXTAREA_HEIGHT_PRESETS, type TextareaHeightPresetKey } from './ChatPanel.constants'
import { getChatInputPlaceholder, getComposerAttachmentButtonStyle } from './ChatPanel.helpers'

export interface ChatComposerFileUpload {
  menuBtnRef: RefObject<HTMLButtonElement | null>
  menuOpen: boolean
  toggleMenu: () => void
  menuRef: RefObject<HTMLDivElement | null>
  handleAttach: (type: 'file' | 'image') => void
  fileInputRef: RefObject<HTMLInputElement | null>
  imageInputRef: RefObject<HTMLInputElement | null>
  handleFileInputChange: ChangeEventHandler<HTMLInputElement>
  handleImageInputChange: ChangeEventHandler<HTMLInputElement>
  isDragOver: boolean
  handleDragOver: DragEventHandler<HTMLDivElement>
  handleDragLeave: DragEventHandler<HTMLDivElement>
  handleDrop: DragEventHandler<HTMLDivElement>
  handlePaste: ClipboardEventHandler<HTMLTextAreaElement>
}

interface TextareaHeightPresetSwitchProps {
  currentTheme: Theme
  currentPreset: TextareaHeightPresetKey
  onChange: (preset: TextareaHeightPresetKey) => void
  disabled?: boolean
}

const TextareaHeightPresetSwitch = ({
  currentTheme,
  currentPreset,
  onChange,
  disabled = false,
}: TextareaHeightPresetSwitchProps) => (
  <div
    className="inline-flex items-center rounded-full border border-gray-200/80 bg-gray-50/90 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
    role="group"
    aria-label="输入框高度档位"
  >
    {TEXTAREA_HEIGHT_PRESET_ORDER.map((preset) => {
      const isActive = currentPreset === preset

      return (
        <button
          key={preset}
          type="button"
          className="min-w-[44px] rounded-full px-2.5 py-1 text-[11px] font-medium leading-4 transition-[background-color,color,box-shadow] hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => {
            if (!disabled) {
              onChange(preset)
            }
          }}
          aria-pressed={isActive}
          disabled={disabled}
          style={
            isActive
              ? {
                  backgroundColor: `${currentTheme.primary}18`,
                  color: currentTheme.primaryText ?? currentTheme.primary,
                  boxShadow: `0 1px 2px rgba(15, 23, 42, 0.08), inset 0 0 0 1px ${currentTheme.primary}30`,
                }
              : {
                  color: '#6b7280',
                }
          }
        >
          {TEXTAREA_HEIGHT_PRESETS[preset].label}
        </button>
      )
    })}
  </div>
)

interface ComposerAttachmentControlsProps {
  currentTheme: Theme
  dragOverlayStyle: CSSProperties
  menuBtnRef: RefObject<HTMLButtonElement | null>
  menuOpen: boolean
  toggleMenu: () => void
  menuRef: RefObject<HTMLDivElement | null>
  handleAttach: (type: 'file' | 'image') => void
  fileInputRef: RefObject<HTMLInputElement | null>
  imageInputRef: RefObject<HTMLInputElement | null>
  handleFileInputChange: ChangeEventHandler<HTMLInputElement>
  handleImageInputChange: ChangeEventHandler<HTMLInputElement>
  isDragOver: boolean
  disabled?: boolean
}

const ComposerAttachmentControls = ({
  currentTheme,
  dragOverlayStyle,
  menuBtnRef,
  menuOpen,
  toggleMenu,
  menuRef,
  handleAttach,
  fileInputRef,
  imageInputRef,
  handleFileInputChange,
  handleImageInputChange,
  isDragOver,
  disabled = false,
}: ComposerAttachmentControlsProps) => {
  const attachmentMenuId = useId()

  return (
    <>
      <div className="relative flex items-center">
        <Tooltip content="附加文件或图片，作为与助手交流的上下文资料">
          <button
            type="button"
            ref={menuBtnRef}
            className="chat-action-btn h-9 w-9 rounded-full inline-flex items-center justify-center text-base"
            onClick={disabled ? undefined : toggleMenu}
            aria-label="添加附件"
            aria-haspopup="dialog"
            aria-expanded={!disabled && menuOpen}
            aria-controls={!disabled && menuOpen ? attachmentMenuId : undefined}
            disabled={disabled}
            style={getComposerAttachmentButtonStyle(currentTheme)}
          >
            +
          </button>
        </Tooltip>
        {!disabled && menuOpen ? (
          <div
            id={attachmentMenuId}
            ref={menuRef}
            role="dialog"
            aria-label="添加附件"
            className="absolute left-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white text-sm shadow-lg"
          >
            <Tooltip content="上传文件或图片作为对话上下文">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                onClick={() => handleAttach('file')}
              >
                📸 添加照片或文件
              </button>
            </Tooltip>
            <Tooltip content="仅上传图片文件">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                onClick={() => handleAttach('image')}
              >
                🖼 仅图片
              </button>
            </Tooltip>
          </div>
        ) : null}
      </div>
      <input
        aria-label="选择对话附件"
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled}
      />
      <input
        aria-label="选择对话图片"
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageInputChange}
        disabled={disabled}
      />
      {isDragOver ? (
        <div
          className="absolute inset-0 rounded-3xl border-2 border-dashed flex items-center justify-center pointer-events-none z-10"
          style={dragOverlayStyle}
        >
          <span
            className="text-sm font-medium"
            style={{ color: currentTheme.primaryText ?? currentTheme.primary }}
          >
            松开以上传文件
          </span>
        </div>
      ) : null}
    </>
  )
}

interface ChatComposerAreaProps {
  currentTheme: Theme
  currentTextareaHeightPreset: TextareaHeightPresetKey
  handleTextareaHeightPresetChange: (preset: TextareaHeightPresetKey) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  localInput: string
  handleInputChange: (value: string) => void
  loading: boolean
  disabled: boolean
  chatTab: ChatTabKey
  textareaStyle: CSSProperties
  textareaPreviewStyle: CSSProperties
  handleSendChat: () => void
  fileUpload: ChatComposerFileUpload
  dragOverlayStyle: CSSProperties
  handleTextareaReady: (textarea: HTMLTextAreaElement) => void
}

export const ChatComposerArea = ({
  currentTheme,
  currentTextareaHeightPreset,
  handleTextareaHeightPresetChange,
  textareaRef,
  localInput,
  handleInputChange,
  loading,
  disabled,
  chatTab,
  textareaStyle,
  textareaPreviewStyle,
  handleSendChat,
  fileUpload: {
    menuBtnRef,
    menuOpen,
    toggleMenu,
    menuRef,
    handleAttach,
    fileInputRef,
    imageInputRef,
    handleFileInputChange,
    handleImageInputChange,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
  },
  dragOverlayStyle,
  handleTextareaReady,
}: ChatComposerAreaProps) => (
  <div
    className="relative"
    onDragOver={disabled ? undefined : handleDragOver}
    onDragLeave={disabled ? undefined : handleDragLeave}
    onDrop={disabled ? undefined : handleDrop}
  >
    <TextInputPanel
      inputPage="chat"
      currentValue={localInput}
      placeholder={getChatInputPlaceholder(loading, chatTab)}
      fieldLabel="对话输入框"
      appliedLayout="chat"
      onInputChange={(_, value) => handleInputChange(value)}
      textareaRef={textareaRef}
      textareaClassName="w-full rounded-3xl border border-gray-200 pl-4 pr-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] resize-none"
      previewClassName="w-full overflow-y-auto rounded-3xl border border-gray-200 bg-white pl-4 pr-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
      textareaStyle={textareaStyle}
      previewStyle={textareaPreviewStyle}
      maxLength={CHAT_INPUT_MAX_LENGTH}
      disabled={disabled}
      showCapabilityHint={false}
      previewHint="只读预览，切回 Markdown 可继续编辑"
      textareaAriaLabel="对话输入框"
      toolbarAriaLabel="对话输入区工具栏"
      toolbarLeading={
        <ComposerAttachmentControls
          currentTheme={currentTheme}
          dragOverlayStyle={dragOverlayStyle}
          menuBtnRef={menuBtnRef}
          menuOpen={menuOpen}
          toggleMenu={toggleMenu}
          menuRef={menuRef}
          handleAttach={handleAttach}
          fileInputRef={fileInputRef}
          imageInputRef={imageInputRef}
          handleFileInputChange={handleFileInputChange}
          handleImageInputChange={handleImageInputChange}
          isDragOver={isDragOver}
          disabled={disabled}
        />
      }
      toolbarBeforeModeSelector={
        <TextareaHeightPresetSwitch
          currentTheme={currentTheme}
          currentPreset={currentTextareaHeightPreset}
          onChange={handleTextareaHeightPresetChange}
          disabled={disabled}
        />
      }
      onKeyDown={(e) => {
        if (disabled) {
          e.preventDefault()
          return
        }

        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
          e.preventDefault()
          handleSendChat()
        }
      }}
      onPaste={disabled ? undefined : handlePaste}
      onEditorMount={handleTextareaReady}
    />
    {localInput.length > 500 ? (
      <div className="absolute bottom-1.5 right-4 text-[10px] text-gray-500">
        {localInput.length} 字符
      </div>
    ) : null}
  </div>
)
