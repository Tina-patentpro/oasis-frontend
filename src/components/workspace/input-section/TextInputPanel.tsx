import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'

const loadInputContentRenderer = () =>
  import('../../ContentRenderer').then((module) => ({
    default: module.ContentRenderer,
  }))

const LazyInputContentRenderer = lazy(loadInputContentRenderer)

type EditorMode = 'markdown' | 'preview'

interface EditorModeState {
  inputPage: string
  mode: EditorMode
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) {
    return
  }

  if (typeof ref === 'function') {
    ref(value)
    return
  }

  ;(ref as { current: T | null }).current = value
}

function getModeButtonClass(isActive: boolean): string {
  return [
    'rounded-full px-2.5 py-1 text-[11px] font-medium leading-4 transition-colors',
    isActive
      ? 'bg-gray-900 text-white shadow-sm'
      : 'text-gray-500 hover:bg-white hover:text-gray-800',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' ')
}

interface TextInputPanelProps {
  inputPage: string
  currentValue: string
  placeholder: string
  fieldLabel: string
  appliedLayout: string
  onInputChange: (page: string, value: string) => void
  textareaRef?: Ref<HTMLTextAreaElement>
  textareaClassName?: string
  previewClassName?: string
  textareaStyle?: CSSProperties
  previewStyle?: CSSProperties
  showCapabilityHint?: boolean
  supportHint?: string
  previewHint?: string
  textareaAriaLabel?: string
  toolbarAriaLabel?: string
  toolbarLeading?: ReactNode
  toolbarBeforeModeSelector?: ReactNode
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onPaste?: (event: ClipboardEvent<HTMLTextAreaElement>) => void
  onEditorMount?: (element: HTMLTextAreaElement) => void
  disabled?: boolean
  maxLength?: number
}

export const TextInputPanel: FC<TextInputPanelProps> = ({
  inputPage,
  currentValue,
  placeholder,
  fieldLabel,
  appliedLayout,
  onInputChange,
  textareaRef,
  textareaClassName,
  previewClassName,
  textareaStyle,
  previewStyle,
  showCapabilityHint = true,
  supportHint = '支持 Markdown、公式、表格和 Mermaid 图表源码',
  previewHint = '只读预览，切回 Markdown 可继续编辑',
  textareaAriaLabel,
  toolbarAriaLabel,
  toolbarLeading,
  toolbarBeforeModeSelector,
  onKeyDown,
  onPaste,
  onEditorMount,
  disabled = false,
  maxLength,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pendingFocusRef = useRef(false)
  const [editorModeState, setEditorModeState] = useState<EditorModeState>(() => ({
    inputPage,
    mode: 'markdown',
  }))
  const hasTextPreviewContent = currentValue.trim().length > 0
  const previewBelongsToCurrentPage =
    editorModeState.inputPage === inputPage && editorModeState.mode === 'preview'
  const shouldResetPreviewMode = !hasTextPreviewContent && previewBelongsToCurrentPage
  if (shouldResetPreviewMode) {
    setEditorModeState({ inputPage, mode: 'markdown' })
  }
  const isPreviewMode = previewBelongsToCurrentPage && hasTextPreviewContent
  const isContrastLayout = appliedLayout === 'contrast'
  const resolvedTextareaClassName =
    textareaClassName ??
    'w-full border border-gray-200 rounded-3xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:border-gray-300 ' +
      (isContrastLayout ? 'h-full resize-none' : 'min-h-[220px]')
  const resolvedPreviewClassName =
    previewClassName ??
    'w-full overflow-y-auto rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] ' +
      (isContrastLayout ? 'h-full min-h-0' : 'min-h-[220px]')
  const modeHint = useMemo(
    () => (isPreviewMode ? previewHint : 'Markdown 源码编辑'),
    [isPreviewMode, previewHint],
  )

  useEffect(() => {
    if (isPreviewMode) {
      void loadInputContentRenderer()
    }
  }, [isPreviewMode])

  const setInputRefs = useCallback(
    (element: HTMLTextAreaElement | null) => {
      inputRef.current = element
      assignRef(textareaRef, element)
    },
    [textareaRef],
  )

  useLayoutEffect(() => {
    if (isPreviewMode || !inputRef.current) {
      return
    }

    onEditorMount?.(inputRef.current)

    if (pendingFocusRef.current) {
      pendingFocusRef.current = false
      inputRef.current.focus()
    }
  }, [currentValue, isPreviewMode, onEditorMount])

  const showMarkdownEditor = useCallback(() => {
    if (disabled) {
      return
    }

    pendingFocusRef.current = true
    setEditorModeState({ inputPage, mode: 'markdown' })
  }, [disabled, inputPage])

  const showPreview = useCallback(() => {
    if (disabled || !hasTextPreviewContent) {
      return
    }

    setEditorModeState({ inputPage, mode: 'preview' })
  }, [disabled, hasTextPreviewContent, inputPage])

  return (
    <div className={isContrastLayout ? 'flex h-full min-h-0 flex-col' : ''}>
      <div
        className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-500"
        role={toolbarAriaLabel ? 'toolbar' : undefined}
        aria-label={toolbarAriaLabel}
      >
        <div className="flex min-w-0 items-center gap-2">
          {toolbarLeading}
          <span className="min-w-0 truncate">{showCapabilityHint ? supportHint : modeHint}</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbarBeforeModeSelector}
          <div
            role="group"
            aria-label={`${fieldLabel}编辑模式`}
            className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-0.5"
          >
            <button
              type="button"
              className={getModeButtonClass(!isPreviewMode)}
              aria-pressed={!isPreviewMode}
              disabled={disabled}
              onClick={showMarkdownEditor}
            >
              编辑 Markdown
            </button>
            <button
              type="button"
              className={getModeButtonClass(isPreviewMode)}
              aria-pressed={isPreviewMode}
              disabled={disabled || !hasTextPreviewContent}
              onClick={showPreview}
            >
              预览效果
            </button>
          </div>
        </div>
      </div>

      {!isPreviewMode ? (
        <textarea
          ref={setInputRefs}
          value={currentValue}
          onChange={(e) => onInputChange(inputPage, e.target.value)}
          placeholder={placeholder}
          className={resolvedTextareaClassName}
          style={textareaStyle}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          disabled={disabled}
          maxLength={maxLength}
          aria-label={textareaAriaLabel ?? `${fieldLabel}内容`}
        />
      ) : (
        <div
          role="region"
          className={resolvedPreviewClassName}
          style={previewStyle ?? textareaStyle}
          aria-label={`${fieldLabel}预览内容`}
        >
          <div className="mb-2 text-xs text-gray-500">{previewHint}</div>
          {hasTextPreviewContent ? (
            <Suspense
              fallback={
                <div className="whitespace-pre-wrap break-words text-gray-600">{currentValue}</div>
              }
            >
              <LazyInputContentRenderer content={currentValue} renderMode="rich" />
            </Suspense>
          ) : (
            <div className="flex min-h-[180px] items-center justify-center text-gray-500">
              暂无预览内容，请先输入 Markdown。
            </div>
          )}
        </div>
      )}
    </div>
  )
}
