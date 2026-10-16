import { formatFileSize } from '@/utils/download'
import type { WorkflowListItem } from '@/types/api'
import { useUIStore } from '@/stores/useUIStore'

import type { DownloadExportType, FileItem, InstructionList } from './DownloadFilesDialog.types'

async function copyInstructionContent(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content)
    useUIStore.getState().showToast('指令内容已复制')
  } catch {
    useUIStore.getState().showToast('复制失败，请手动复制指令内容')
  }
}

function InstructionItems({
  instructions,
  instructionsLoading,
  instructionsError,
  themeColor,
  onRetry,
}: {
  instructions: InstructionList
  instructionsLoading: boolean
  instructionsError: string | null
  themeColor: string
  onRetry: () => void
}) {
  if (instructionsLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
        <div>正在加载…</div>
      </div>
    )
  }

  if (instructionsError) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-700"
        role="alert"
      >
        <p>{instructionsError}</p>
        <button
          type="button"
          className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100"
          onClick={onRetry}
        >
          重新加载
        </button>
      </div>
    )
  }

  if (instructions.length === 0) {
    return <div className="text-center py-12 text-gray-500">暂无指令数据</div>
  }

  return (
    <>
      {instructions.map((instruction) => (
        <div
          key={instruction.id}
          className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{instruction.title}</h3>
              <span
                className="text-xs px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
              >
                {instruction.type === 1
                  ? '工作聚焦'
                  : instruction.type === 2
                    ? '语义生图'
                    : '通用对话'}
              </span>
              {instruction.is_new === 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0">
                  NEW
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 max-h-24 overflow-y-auto line-clamp-3">
              {instruction.content}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {new Date(instruction.created_at).toLocaleString('zh-CN')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void copyInstructionContent(instruction.content)
            }}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shrink-0 flex items-center gap-1"
            title="复制指令内容"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
              />
            </svg>
            复制
          </button>
        </div>
      ))}
    </>
  )
}

function FileItems({
  exportType,
  fileList,
  selectedFiles,
  isLoading,
  isExporting,
  onToggleFileSelection,
}: {
  exportType: DownloadExportType
  fileList: FileItem[]
  selectedFiles: Set<string>
  isLoading: boolean
  isExporting: boolean
  onToggleFileSelection: (fileId: string, checked: boolean) => void
}) {
  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
        <div>读取中…</div>
      </div>
    )
  }

  if (fileList.length === 0) {
    return <div className="text-center py-8 text-gray-500">暂无数据</div>
  }

  return (
    <>
      {fileList.map((file) => {
        const workflow = file.data as WorkflowListItem | undefined
        return (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={(event) => {
              if (isExporting) {
                return
              }
              event.stopPropagation()
              onToggleFileSelection(file.id, !selectedFiles.has(file.id))
            }}
          >
            <input
              aria-label={`选择文件 ${file.name}`}
              type="checkbox"
              checked={selectedFiles.has(file.id)}
              onChange={(event) => {
                event.stopPropagation()
                onToggleFileSelection(file.id, event.target.checked)
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
              disabled={isExporting}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{file.name}</div>
              {exportType !== 'files' && <div className="text-xs text-gray-500">{file.type}</div>}
            </div>
            {exportType === 'workflow' && workflow && (
              <div className="text-xs text-gray-500">
                {new Date(workflow.created_at).toLocaleString('zh-CN')}
              </div>
            )}
            {exportType !== 'workflow' && exportType !== 'files' && (
              <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
            )}
          </div>
        )
      })}
    </>
  )
}

export function DownloadItemsList({
  exportType,
  fileList,
  selectedFiles,
  isLoading,
  isExporting,
  instructions,
  instructionsLoading,
  instructionsError,
  themeColor,
  onSelectAll,
  onDeselectAll,
  onToggleFileSelection,
  onRetryInstructions,
}: {
  exportType: DownloadExportType
  fileList: FileItem[]
  selectedFiles: Set<string>
  isLoading: boolean
  isExporting: boolean
  instructions: InstructionList
  instructionsLoading: boolean
  instructionsError: string | null
  themeColor: string
  onSelectAll: () => void
  onDeselectAll: () => void
  onToggleFileSelection: (fileId: string, checked: boolean) => void
  onRetryInstructions: () => void
}) {
  return (
    <div className="p-6">
      {exportType !== 'instructions' && fileList.length > 0 && (
        <div className="mb-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isExporting}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            全选
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={isExporting}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            清空
          </button>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {exportType === 'instructions' ? (
          <InstructionItems
            instructions={instructions}
            instructionsLoading={instructionsLoading}
            instructionsError={instructionsError}
            themeColor={themeColor}
            onRetry={onRetryInstructions}
          />
        ) : (
          <FileItems
            exportType={exportType}
            fileList={fileList}
            selectedFiles={selectedFiles}
            isLoading={isLoading}
            isExporting={isExporting}
            onToggleFileSelection={onToggleFileSelection}
          />
        )}
      </div>
    </div>
  )
}
