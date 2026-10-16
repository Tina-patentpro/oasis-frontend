/* eslint-disable complexity */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FC,
} from 'react'

import { FileText, Image as ImageIcon, Trash2 } from 'lucide-react'

import { MAX_UPLOAD_FILE_SIZE_BYTES } from '@/constants/uploadLimits'
import { useThemeStore } from '@/stores'
import {
  getUploadSelectionState,
  parseUploadInputValue,
  type UploadInputFileItem,
} from '@/modules/workspace/hooks/content-sections/upload-input-value'

import { useClickOutside } from '../../hooks/useClickOutside'
import { Tooltip } from '../ui'
import { FileUpload } from '../ui/FileUpload'
import { getInputSectionPanelId, getInputSectionTabId } from './input-section/a11y'
import { InputSectionActions } from './input-section/InputSectionActions'
import { InputSectionHeader } from './input-section/InputSectionHeader'
import { TextInputPanel } from './input-section/TextInputPanel'
import type { InputSectionProps } from './input-section/types'
import '@/styles/inputSectionHeader.css'

interface FileUploadPanelProps {
  inputPage: string
  currentValue: string
  fieldType?: string
  onFileUpload: InputSectionProps['onFileUpload']
  onInputChange: InputSectionProps['onInputChange']
  appliedLayout: string
}

const FileUploadPanel: FC<FileUploadPanelProps> = ({
  inputPage,
  currentValue,
  fieldType,
  onFileUpload,
  onInputChange,
  appliedLayout,
}) => {
  const [lastUploadTime, setLastUploadTime] = useState(0)
  const isImageMode = fieldType === 'image'

  const existingFiles = useMemo(() => {
    return parseUploadInputValue(currentValue)
  }, [currentValue])
  const uploadSelectionState = useMemo(
    () => getUploadSelectionState(fieldType, existingFiles.length),
    [existingFiles.length, fieldType],
  )
  const isMultiValueField = uploadSelectionState.multiple

  const handleRemoveFile = (index: number) => {
    if (isMultiValueField) {
      const newList = [...existingFiles]
      newList.splice(index, 1)
      onInputChange(inputPage, newList.length > 0 ? JSON.stringify(newList) : '')
    } else {
      onInputChange(inputPage, '')
    }
  }

  const panelClass = [
    'w-full flex flex-col gap-4',
    appliedLayout === 'contrast' ? 'h-full min-h-0' : '',
  ].join(' ')
  const helperText = isImageMode
    ? uploadSelectionState.nextMode === 'replace' && existingFiles.length > 0
      ? '已达到图片上限，本次选择会替换当前图片'
      : `多图片上传，最多 ${uploadSelectionState.maxFiles} 个 (还可传 ${uploadSelectionState.remainingSlots} 个)`
    : isMultiValueField
      ? uploadSelectionState.nextMode === 'replace' && existingFiles.length > 0
        ? '已达到输入上限，本次选择会替换当前文件'
        : `多文件上传，最多 ${uploadSelectionState.maxFiles} 个 (还可传 ${uploadSelectionState.remainingSlots} 个)`
      : existingFiles.length > 0
        ? '已达到输入上限，可选择替换文件'
        : '单文件上传，最大 10MB'
  const idleSelectionLabel =
    existingFiles.length === 0
      ? '选择文件'
      : uploadSelectionState.nextMode === 'replace'
        ? '选择替换文件'
        : '继续选择文件'
  const uploaderShellClass =
    appliedLayout === 'contrast'
      ? existingFiles.length > 0
        ? 'min-h-[144px]'
        : 'flex-1 min-h-[180px]'
      : existingFiles.length > 0
        ? 'min-h-[144px]'
        : 'min-h-[220px]'

  return (
    <div className={panelClass}>
      <section
        data-testid="upload-material-card"
        className="rounded-3xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">上传材料</h3>
            <p className="mt-1 text-xs text-gray-500">{helperText}</p>
          </div>
          {existingFiles.length > 0 && (
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
              已上传 {existingFiles.length} 个文件
            </div>
          )}
        </div>

        {existingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">已上传文件</p>
            <div className="grid grid-cols-1 gap-2">
              {existingFiles.map((file: UploadInputFileItem, idx: number) => (
                <div
                  key={file.url || file.name}
                  className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:border-blue-200"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-500">
                      {isImageMode ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="max-w-[200px] truncate text-sm font-medium text-gray-700">
                        {file.name || file.url.split('/').pop() || '未命名文件'}
                      </span>
                      {file.mimeType ? (
                        <span className="text-[10px] uppercase text-gray-500">{file.mimeType}</span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="rounded-lg p-2 text-gray-500 opacity-0 transition-[background-color,color,opacity,transform] group-hover:bg-red-50 group-hover:text-red-500 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2"
                    aria-label={`移除文件：${file.name || file.url.split('/').pop() || '未命名文件'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
          <div className={`w-full rounded-2xl overflow-hidden ${uploaderShellClass}`}>
            <FileUpload
              key={`${inputPage}-${lastUploadTime}`}
              accept={isImageMode ? 'image/*' : undefined}
              multiple={uploadSelectionState.multiple}
              maxSize={MAX_UPLOAD_FILE_SIZE_BYTES}
              maxFiles={uploadSelectionState.selectionLimit}
              idleSelectionLabel={idleSelectionLabel}
              idleSelectionDisabled={false}
              className="h-full"
              showHint={false}
              onUpload={async (files) => {
                const dataTransfer = new DataTransfer()
                files.forEach((file) => dataTransfer.items.add(file))
                await onFileUpload(dataTransfer.files, inputPage, isImageMode ? 'image' : 'file', {
                  mode: uploadSelectionState.nextMode,
                })
                setLastUploadTime(Date.now())
              }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export const InputSection: FC<InputSectionProps> = ({
  inputPage,
  inputSections,
  layoutMode,
  appliedLayout,
  contentPages,
  destinations,
  onInputPageChange,
  onInputChange,
  onLayoutModeChange,
  onFileUpload,
  onReadHistory,
  onCopyInput,
  onClearAll,
  onStartNewSession,
  startNewSessionDisabled,
  startNewSessionTooltip,
  onQuickCreateProject,
  projects,
  selectedProjectId,
  onProjectChange,
  sectionDefinitions,
  apiDetail,
  tabsLoadError,
  onRetryLoadTabs,
}) => {
  const inputMenuBtnRef = useRef<HTMLButtonElement>(null)
  const inputMenuRef = useRef<HTMLDivElement>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const inputImageRef = useRef<HTMLInputElement>(null)
  const [inputMenuOpen, setInputMenuOpen] = useState(false)
  const [uploadDestination, setUploadDestination] = useState<string>('')
  const [uploadType, setUploadType] = useState<'file' | 'image'>('file')
  const autoReferenceOpenRef = useRef(new Set<string>())
  const modeRef = useRef<'text' | 'file' | 'image' | 'reference'>('text')

  const currentTheme = useThemeStore((state) => state.currentTheme)
  const themePrimary = currentTheme.primary
  const themeBorder = `${themePrimary}26`
  const themeSoft = `${themePrimary}14`
  const themeShadow = `${themePrimary}30`

  const baseActionStyle = {
    '--chat-btn-bg': '#ffffff',
    '--chat-btn-color': '#374151',
    '--chat-btn-border': `1px solid ${themeBorder}`,
    '--chat-btn-hover-bg': themeSoft,
    '--chat-btn-hover-color': themePrimary,
    '--chat-btn-hover-shadow': themeShadow,
    '--chat-btn-press-bg': `${themePrimary}26`,
    '--chat-btn-focus-ring': themePrimary,
    '--chat-btn-hover-translate': '-1px',
  } as CSSProperties

  useClickOutside([inputMenuBtnRef, inputMenuRef], () => setInputMenuOpen(false), inputMenuOpen)

  // 根据apiDetail.input_schema获取当前字段的定义
  const currentApiField = useMemo(() => {
    if (!apiDetail?.input_schema) return null
    return apiDetail.input_schema.find((field) => field.en_name === inputPage)
  }, [apiDetail, inputPage])

  const currentDefinition = useMemo(
    () => sectionDefinitions[inputPage],
    [sectionDefinitions, inputPage],
  )

  // 根据API字段类型确定输入模式
  const inputMode =
    currentDefinition?.inputMode ??
    (currentApiField?.type === 'file'
      ? 'file'
      : currentApiField?.type === 'file_list'
        ? 'file'
        : currentApiField?.type === 'image'
          ? 'image'
          : 'text')
  const isTextMode = inputMode === 'text'
  const isFileMode = inputMode === 'file'
  const isImageMode = inputMode === 'image'
  const isReferenceMode = inputMode === 'reference'
  const isMultiFile = currentDefinition?.isMultiFile ?? currentApiField?.type === 'file_list'
  const canTriggerReadAction = isFileMode || isImageMode
  const currentFieldType =
    currentApiField?.type ??
    (isImageMode ? 'image' : isMultiFile ? 'file_list' : isFileMode ? 'file' : undefined)

  // 获取当前输入值：只使用用户输入的内容，不使用API的content字段，以便显示placeholder
  const currentValue = inputSections[inputPage] || ''
  const currentUploadedFiles = useMemo(
    () => (canTriggerReadAction ? parseUploadInputValue(currentValue) : []),
    [canTriggerReadAction, currentValue],
  )
  const currentUploadState = useMemo(
    () => getUploadSelectionState(currentFieldType, currentUploadedFiles.length),
    [currentFieldType, currentUploadedFiles.length],
  )
  const readActionLabel =
    canTriggerReadAction &&
    currentUploadedFiles.length > 0 &&
    currentUploadState.nextMode === 'replace'
      ? '选择替换文件'
      : '读取'
  const readActionTooltip = !canTriggerReadAction
    ? '仅在文件或图片参数下可用'
    : currentUploadedFiles.length > 0 && currentUploadState.nextMode === 'replace'
      ? '已达上限，本次会从项目下载文件中替换当前已选文件'
      : '从当前项目的下载文件中选择并导入到当前参数'

  useEffect(() => {
    modeRef.current = inputMode
  }, [inputMode])

  const contentPageKeySignature = useMemo(
    () => contentPages.map((page) => page.key).join('|'),
    [contentPages],
  )

  useEffect(() => {
    autoReferenceOpenRef.current.clear()
  }, [contentPageKeySignature])

  useEffect(() => {
    if (isReferenceMode && !autoReferenceOpenRef.current.has(inputPage)) {
      autoReferenceOpenRef.current.add(inputPage)
      onReadHistory()
    }
  }, [inputPage, isReferenceMode, onReadHistory])

  useEffect(() => {
    if (!isTextMode && inputMenuOpen) {
      // 当前输入模式不再支持文本时，主动关闭菜单避免遗留打开状态
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputMenuOpen(false)
    }
  }, [isTextMode, inputMenuOpen])

  const triggerFileSelect = (type: 'file' | 'image', dest: string) => {
    setUploadType(type)
    setUploadDestination(dest)
    setInputMenuOpen(false)

    if (type === 'file' && inputFileRef.current) {
      inputFileRef.current.click()
    } else if (type === 'image' && inputImageRef.current) {
      inputImageRef.current.click()
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const mode = modeRef.current
      if (mode === 'file' || mode === 'image') {
        // 文件/图片模式：只调用onFileUpload，它会上传文件并设置URL
        // 不要调用onInputChange，因为那会用文件名覆盖URL
        onFileUpload(files, inputPage, mode === 'image' ? 'image' : 'file')
      } else {
        // 文本模式：调用onFileUpload将文件添加到指定目的地
        onFileUpload(files, uploadDestination, uploadType)
      }
    }
    // Reset input
    e.target.value = ''
  }

  const triggerReadAction = () => {
    if (!canTriggerReadAction) {
      return
    }

    onReadHistory(inputPage)
  }

  const containerBase =
    appliedLayout === 'horizontal' || appliedLayout === 'contrast'
      ? 'flex-1 min-w-[320px]'
      : 'w-full'
  const containerClasses = [
    containerBase,
    'flex flex-col',
    appliedLayout === 'vertical' ? '' : 'min-h-0',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses}>
      <div
        className={`relative flex flex-col ${appliedLayout === 'vertical' ? '' : 'flex-1 min-h-0'}`}
      >
        <InputSectionHeader
          currentApiField={currentApiField}
          selectedProjectId={selectedProjectId}
          projects={projects}
          onProjectChange={onProjectChange}
          onQuickCreateProject={onQuickCreateProject}
          onStartNewSession={onStartNewSession}
          startNewSessionDisabled={startNewSessionDisabled}
          startNewSessionTooltip={startNewSessionTooltip}
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
          contentPages={contentPages}
          inputPage={inputPage}
          inputSections={inputSections}
          onInputPageChange={onInputPageChange}
          baseActionStyle={baseActionStyle}
          tabsLoadError={tabsLoadError}
          onRetryLoadTabs={onRetryLoadTabs}
        />

        {/* Scrollable Content */}
        <div
          id={getInputSectionPanelId(inputPage)}
          role="tabpanel"
          aria-labelledby={getInputSectionTabId(inputPage)}
          className={`flex flex-col gap-3 pt-3 ${
            appliedLayout === 'vertical' ? '' : 'flex-1 min-h-0 overflow-y-auto'
          }`}
        >
          {/* Input Area */}
          <div className={'relative ' + (appliedLayout === 'contrast' ? 'flex-1 min-h-0' : '')}>
            {isTextMode && (
              <TextInputPanel
                inputPage={inputPage}
                currentValue={currentValue}
                placeholder={
                  currentDefinition?.placeholder ??
                  currentApiField?.content ??
                  `请输入${currentApiField?.cn_name || '内容'}`
                }
                fieldLabel={
                  currentApiField?.cn_name ||
                  contentPages.find((p) => p.key === inputPage)?.label ||
                  ''
                }
                appliedLayout={appliedLayout}
                onInputChange={onInputChange}
              />
            )}

            {isReferenceMode && (
              <div className="border border-gray-200 rounded-3xl px-4 py-4 bg-gray-50 text-sm text-gray-600 min-h-[200px]">
                {currentValue ? (
                  <div className="whitespace-pre-wrap break-words text-gray-800">
                    {currentValue}
                  </div>
                ) : (
                  <div>已为您打开引用面板，请完成内容选择。</div>
                )}
              </div>
            )}

            {(isFileMode || isImageMode) && (
              <FileUploadPanel
                inputPage={inputPage}
                currentValue={currentValue}
                fieldType={currentFieldType}
                onFileUpload={onFileUpload}
                onInputChange={onInputChange}
                appliedLayout={appliedLayout}
              />
            )}

            {/* Attachment Menu */}
            {isTextMode && inputMenuOpen && (
              <div
                ref={inputMenuRef}
                className="absolute bottom-12 left-3 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden text-xs w-48 z-20"
              >
                <div className="px-4 py-2 text-gray-500">添加文件到</div>
                {destinations.map((dest) => (
                  <Tooltip key={'file-' + dest.key} content={`将文件添加到${dest.title}区域`}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => triggerFileSelect('file', dest.key)}
                    >
                      📄 {dest.title}
                    </button>
                  </Tooltip>
                ))}
                <div className="px-4 py-2 text-gray-500 border-t">添加图片到</div>
                {destinations.map((dest) => (
                  <Tooltip key={'img-' + dest.key} content={`将图片添加到${dest.title}区域`}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => triggerFileSelect('image', dest.key)}
                    >
                      🖼 {dest.title}
                    </button>
                  </Tooltip>
                ))}
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              aria-label="选择附件文件"
              ref={inputFileRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              aria-label="选择图片文件"
              ref={inputImageRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <InputSectionActions
            canTriggerReadAction={canTriggerReadAction}
            onTriggerReadAction={triggerReadAction}
            readActionLabel={readActionLabel}
            readActionTooltip={readActionTooltip}
            onCopyInput={onCopyInput}
            onClearAll={onClearAll}
            appliedLayout={appliedLayout}
            baseActionStyle={baseActionStyle}
          />
        </div>
      </div>
    </div>
  )
}
