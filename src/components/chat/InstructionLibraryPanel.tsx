import React, { type CSSProperties, type RefObject, memo, useCallback, useMemo, useId } from 'react'

import type { Theme } from '../../types'
import { Tooltip } from '../ui'
import type { InstructionFormState, InstructionItem } from './hooks/instruction-library-types'
import { useInstructionDeleteConfirmation } from './hooks/useInstructionDeleteConfirmation'
import { useInstructionPanelFocus } from './hooks/useInstructionPanelFocus'

interface InstructionLibraryPanelProps {
  label?: string
  instructionOpen: boolean
  instructionLibrary: InstructionItem[]
  isLoading: boolean
  instructionListHeight: number
  showInstructionForm: boolean
  newInstruction: InstructionFormState
  instructionBtnRef: RefObject<HTMLButtonElement | null>
  instructionAddBtnRef: RefObject<HTMLButtonElement | null>
  instructionPanelRef: RefObject<HTMLDivElement | null>
  toggleInstruction: () => void
  toggleInstructionForm: () => void
  onInstructionSelect: (content: string) => void
  onInstructionDelete: (key: string) => void
  onInstructionCreate: () => void
  onInstructionCancel: () => void
  onInstructionChange: (field: keyof InstructionFormState, value: string) => void
  validationError?: string
  loadError?: string
  operationError?: string
  deletingInstructionKey?: string | null
  isCreatingInstruction?: boolean
  onInstructionReload: () => void
  startInstructionResize: (event: React.MouseEvent<HTMLElement>) => void
  handleInstructionResizeKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
  theme: Theme
  disabled?: boolean
}

function getInstructionPanelControlId(isOpen: boolean, isDisabled: boolean, panelId: string) {
  return isOpen && !isDisabled ? panelId : undefined
}

export const InstructionLibraryPanel = memo<InstructionLibraryPanelProps>(
  ({
    label = '指令库Ⅰ',
    instructionOpen,
    instructionLibrary,
    isLoading,
    instructionListHeight,
    showInstructionForm,
    newInstruction,
    instructionBtnRef,
    instructionAddBtnRef,
    instructionPanelRef,
    toggleInstruction,
    toggleInstructionForm,
    onInstructionSelect,
    onInstructionDelete,
    onInstructionCreate,
    onInstructionCancel,
    onInstructionChange,
    validationError,
    loadError,
    operationError,
    deletingInstructionKey,
    isCreatingInstruction = false,
    onInstructionReload,
    startInstructionResize,
    handleInstructionResizeKeyDown,
    theme,
    disabled = false,
  }) => {
    const instructionPrimary = theme.primary
    const instructionHover = theme.primaryHover
    const instructionForeground = theme.primaryForeground ?? '#ffffff'
    const instructionText = theme.primaryText ?? theme.primary
    const instructionBorder = useMemo(() => `${instructionPrimary}33`, [instructionPrimary])
    const instructionSoft = useMemo(() => `${instructionPrimary}12`, [instructionPrimary])
    const instructionMuted = useMemo(() => `${instructionPrimary}1a`, [instructionPrimary])
    const formIdPrefix = useId()
    const titleInputId = `${formIdPrefix}-instruction-title`
    const contentInputId = `${formIdPrefix}-instruction-content`
    const formErrorId = `${formIdPrefix}-instruction-form-error`
    const panelId = `${formIdPrefix}-instruction-panel`
    const validationErrorId = validationError ? formErrorId : undefined
    const panelControlId = getInstructionPanelControlId(instructionOpen, disabled, panelId)

    const toggleStyle = useMemo(
      () =>
        (disabled
          ? {
              '--chat-btn-bg': '#e5e7eb',
              '--chat-btn-color': '#6b7280',
              '--chat-btn-border': '1px solid transparent',
              '--chat-btn-hover-bg': '#e5e7eb',
              '--chat-btn-hover-color': '#6b7280',
              '--chat-btn-hover-shadow': 'transparent',
              '--chat-btn-press-bg': '#e5e7eb',
              '--chat-btn-focus-ring': instructionPrimary,
              '--chat-btn-hover-translate': '0',
            }
          : instructionOpen
            ? {
                '--chat-btn-bg': instructionPrimary,
                '--chat-btn-color': instructionForeground,
                '--chat-btn-border': `1px solid ${instructionBorder}`,
                '--chat-btn-hover-bg': instructionHover,
                '--chat-btn-hover-color': instructionForeground,
                '--chat-btn-hover-shadow': `${instructionPrimary}40`,
                '--chat-btn-press-bg': instructionHover,
                '--chat-btn-focus-ring': instructionPrimary,
                '--chat-btn-hover-translate': '-1px',
              }
            : {
                '--chat-btn-bg': '#f3f4f6',
                '--chat-btn-color': '#374151',
                '--chat-btn-border': `1px solid ${instructionBorder}`,
                '--chat-btn-hover-bg': instructionSoft,
                '--chat-btn-hover-color': instructionText,
                '--chat-btn-hover-shadow': `${instructionPrimary}24`,
                '--chat-btn-press-bg': `${instructionPrimary}26`,
                '--chat-btn-focus-ring': instructionPrimary,
                '--chat-btn-hover-translate': '-1px',
              }) as CSSProperties,
      [
        disabled,
        instructionOpen,
        instructionPrimary,
        instructionForeground,
        instructionText,
        instructionBorder,
        instructionHover,
        instructionSoft,
      ],
    )

    const handleTitleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        onInstructionChange('title', event.target.value)
      },
      [onInstructionChange],
    )

    const handleContentChange = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onInstructionChange('content', event.target.value)
      },
      [onInstructionChange],
    )

    const { pendingDeleteKey, setPendingDeleteKey } = useInstructionDeleteConfirmation()
    const handlePanelKeyDown = useInstructionPanelFocus({
      instructionOpen,
      instructionPanelRef,
      instructionBtnRef,
      toggleInstruction,
    })

    return (
      <div className="relative">
        <Tooltip content="打开常用提示词，快速插入到输入框开头">
          <button
            ref={instructionBtnRef}
            type="button"
            onClick={disabled ? undefined : toggleInstruction}
            className="chat-action-btn px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors"
            style={toggleStyle}
            aria-label="打开指令库"
            aria-haspopup="dialog"
            aria-expanded={instructionOpen}
            aria-controls={panelControlId}
            disabled={disabled}
          >
            {label}
          </button>
        </Tooltip>
        {instructionOpen && (
          <div
            id={panelId}
            ref={instructionPanelRef}
            role="dialog"
            aria-label={label}
            className="absolute bottom-12 left-1/2 z-30 w-[19rem] -translate-x-1/2 rounded-3xl border bg-white shadow-2xl overflow-hidden"
            style={{
              borderColor: instructionBorder,
              boxShadow: `0 18px 36px ${instructionMuted}`,
            }}
            onKeyDown={handlePanelKeyDown}
          >
            <div
              className="px-4 py-3 border-b"
              style={{
                background: `linear-gradient(145deg, ${instructionSoft}, #ffffff)`,
                borderColor: instructionBorder,
              }}
            >
              <div className="flex items-start justify-end">
                <Tooltip content="新增自定义提示词">
                  <button
                    type="button"
                    ref={instructionAddBtnRef}
                    className="chat-action-btn h-10 w-10 rounded-full flex items-center justify-center text-lg font-semibold"
                    style={
                      {
                        '--chat-btn-bg': instructionSoft,
                        '--chat-btn-color': instructionText,
                        '--chat-btn-border': `1px solid ${instructionBorder}`,
                        '--chat-btn-hover-bg': `${instructionPrimary}20`,
                        '--chat-btn-hover-color': instructionText,
                        '--chat-btn-hover-shadow': `${instructionPrimary}29`,
                        '--chat-btn-press-bg': `${instructionPrimary}26`,
                        '--chat-btn-focus-ring': instructionPrimary,
                        '--chat-btn-hover-translate': '-1px',
                      } as CSSProperties
                    }
                    onClick={disabled ? undefined : toggleInstructionForm}
                    aria-label="自定义提示词"
                    disabled={disabled}
                  >
                    ＋
                  </button>
                </Tooltip>
              </div>
            </div>

            {showInstructionForm && (
              <div
                className="px-4 py-3 space-y-2 border-b text-xs text-gray-600"
                style={{ borderColor: instructionBorder, backgroundColor: '#ffffff' }}
              >
                <div className="grid gap-2">
                  <label htmlFor={titleInputId} className="sr-only">
                    提示词标题
                  </label>
                  <input
                    id={titleInputId}
                    name="instruction-title"
                    type="text"
                    value={newInstruction.title}
                    onChange={handleTitleChange}
                    placeholder="提示词标题"
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={validationErrorId}
                    autoComplete="off"
                    disabled={disabled || isCreatingInstruction}
                    className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                    style={{ borderColor: instructionBorder }}
                  />
                  <label htmlFor={contentInputId} className="sr-only">
                    提示词内容
                  </label>
                  <textarea
                    id={contentInputId}
                    name="instruction-content"
                    rows={4}
                    value={newInstruction.content}
                    onChange={handleContentChange}
                    placeholder="输入提示词内容，会插入到输入框开头"
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={validationErrorId}
                    autoComplete="off"
                    disabled={disabled || isCreatingInstruction}
                    className="rounded-lg border px-3 py-2 text-sm leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 resize-none"
                    style={{ borderColor: instructionBorder }}
                  />
                </div>
                {validationError && (
                  <p id={formErrorId} className="text-xs text-red-500 mt-1" aria-live="polite">
                    {validationError}
                  </p>
                )}
                <div className="flex justify-end gap-2 text-xs">
                  <Tooltip content="取消创建新提示词">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border text-gray-500 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={onInstructionCancel}
                      disabled={disabled || isCreatingInstruction}
                    >
                      取消
                    </button>
                  </Tooltip>
                  <Tooltip content="保存新创建的提示词到指令库">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: instructionPrimary, color: instructionForeground }}
                      onClick={onInstructionCreate}
                      disabled={disabled || isCreatingInstruction}
                      aria-busy={isCreatingInstruction}
                    >
                      {isCreatingInstruction ? '保存中…' : '保存'}
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}

            <div className="relative" style={{ maxHeight: instructionListHeight }}>
              <div
                className="overflow-y-auto px-3 py-3 space-y-2 text-sm"
                style={{ maxHeight: instructionListHeight }}
              >
                {isLoading && instructionLibrary.length === 0 && (
                  <div className="text-center py-6 text-gray-500 text-xs">加载中…</div>
                )}
                {!isLoading && loadError ? (
                  <div className="py-6 text-center text-xs text-gray-500">
                    <p className="mb-3 text-red-500" role="alert" aria-live="polite">
                      {loadError}
                    </p>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-1.5 text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={onInstructionReload}
                      aria-label="重新加载提示词"
                      disabled={disabled}
                    >
                      重新加载
                    </button>
                  </div>
                ) : null}
                {!isLoading && !loadError && instructionLibrary.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs">暂无可用提示词</div>
                ) : null}
                {!isLoading && operationError ? (
                  <p className="px-1 pb-2 text-xs text-red-500" role="alert" aria-live="polite">
                    {operationError}
                  </p>
                ) : null}
                {instructionLibrary.map((item) => {
                  const canDelete = item.canDelete ?? item.isCustom ?? false
                  const isDeleting = deletingInstructionKey === item.key
                  const deleteDisabled = disabled || Boolean(deletingInstructionKey)

                  return (
                    <div
                      key={item.key}
                      className="relative rounded-2xl border transition-[border-color,background-color,box-shadow] duration-150"
                      style={
                        {
                          '--border-default': instructionBorder,
                          '--border-hover': instructionPrimary,
                          '--bg-default': '#ffffff',
                          '--bg-hover': instructionSoft,
                          '--shadow-color': instructionMuted,
                          borderColor: 'var(--border-default)',
                          backgroundColor: 'var(--bg-default)',
                          boxShadow: `0 6px 18px ${instructionMuted}`,
                        } as CSSProperties
                      }
                      onMouseEnter={(e) => {
                        const el = e.currentTarget
                        el.style.borderColor = `var(--border-hover)`
                        el.style.backgroundColor = `var(--bg-hover)`
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget
                        el.style.borderColor = `var(--border-default)`
                        el.style.backgroundColor = `var(--bg-default)`
                      }}
                    >
                      <Tooltip
                        content={
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-xs opacity-90 mt-1">点击后插入到输入框开头</div>
                            {item.description && (
                              <div className="text-xs opacity-70 mt-1 max-w-[200px] break-words">
                                {item.description}
                              </div>
                            )}
                          </div>
                        }
                      >
                        <button
                          type="button"
                          onClick={() => onInstructionSelect(item.content)}
                          className={`w-full cursor-pointer rounded-2xl px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 ${canDelete ? 'pr-14' : 'pr-3'}`}
                          disabled={disabled}
                        >
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span
                              className="min-w-0 break-words text-sm"
                              style={{ color: instructionText }}
                            >
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                                style={{
                                  backgroundColor: instructionSoft,
                                  color: instructionText,
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                            {canDelete && (
                              <span
                                className="text-[10px] font-medium rounded-full px-2 py-0.5"
                                style={{
                                  backgroundColor: instructionSoft,
                                  color: instructionText,
                                }}
                              >
                                自建
                              </span>
                            )}
                          </div>
                          <p className="mt-1 break-words text-xs leading-relaxed text-gray-600">
                            {item.description}
                          </p>
                        </button>
                      </Tooltip>
                      {canDelete ? (
                        <div className="absolute right-3 top-2">
                          <Tooltip content="从指令库中删除此提示词">
                            {isDeleting ? (
                              <button
                                type="button"
                                disabled
                                aria-busy="true"
                                className="cursor-wait rounded px-1 text-xs text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                              >
                                删除中…
                              </button>
                            ) : pendingDeleteKey === item.key ? (
                              <button
                                type="button"
                                disabled={deleteDisabled}
                                className="rounded px-1 text-xs text-red-600 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => {
                                  onInstructionDelete(item.key)
                                  setPendingDeleteKey(null)
                                }}
                              >
                                确认?
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={deleteDisabled}
                                className="rounded px-1 text-xs text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => {
                                  setPendingDeleteKey(item.key)
                                }}
                              >
                                删除
                              </button>
                            )}
                          </Tooltip>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              <Tooltip content="拖拽调整指令库面板高度">
                <div
                  role="separator"
                  tabIndex={disabled ? -1 : 0}
                  className="absolute top-2 left-2 h-5 w-5 cursor-ns-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  onMouseDown={disabled ? undefined : startInstructionResize}
                  onKeyDown={disabled ? undefined : handleInstructionResizeKeyDown}
                  aria-label="调整提示词列表高度"
                  aria-orientation="horizontal"
                  aria-valuemin={240}
                  aria-valuemax={520}
                  aria-valuenow={instructionListHeight}
                  aria-valuetext={`${instructionListHeight} 像素`}
                  aria-keyshortcuts="ArrowUp ArrowDown PageUp PageDown Home End"
                  aria-disabled={disabled}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 h-full w-[2px] rounded-full"
                    style={{ backgroundColor: 'rgba(148, 163, 184, 0.65)' }}
                  ></span>
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 h-[2px] w-full rounded-full"
                    style={{ backgroundColor: 'rgba(148, 163, 184, 0.65)' }}
                  ></span>
                </div>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    )
  },
)

InstructionLibraryPanel.displayName = 'InstructionLibraryPanel'
