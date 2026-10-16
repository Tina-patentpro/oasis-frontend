import { useMemo, useState, type CSSProperties } from 'react'

import type { Session } from '@/types/api'
import { buildFinalResult } from '@/modules/workspace/hooks/content-sections/async-result-hydrator'
import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'

interface LocalHistoryFileItem {
  selectionId: string
  sessionId: number
  sessionTitle: string
  sessionType: number
  createdAt?: string
  answerText?: string
  url: string
  mimeType: string
  name: string
  isImage: boolean
}

interface LocalHistoryFilesDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedData: string[], rawItems?: LocalHistoryFileItem[]) => void
  sessions: Session[]
  themeColor: string
}

export const LocalHistoryFilesDialog: React.FC<LocalHistoryFilesDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sessions,
  themeColor,
}: LocalHistoryFilesDialogProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const items = useMemo<LocalHistoryFileItem[]>(() => {
    return sessions.flatMap((session) => {
      const files =
        buildFinalResult({
          answerText: '',
          fileOutput: session.file_output,
          fileUrl: session.file_url,
          sessionId: session.id,
        })?.files ?? []

      return files.map((file, index) => {
        const mimeType = file.mimeType || 'application/octet-stream'
        const isImage =
          mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(file.url ?? '')

        return {
          selectionId: `${session.id}:${file.url ?? ''}:${index}`,
          sessionId: session.id,
          sessionTitle: session.title || session.api_name || '未命名项目',
          sessionType: session.type ?? 1,
          createdAt: session.createdAt,
          answerText: session.answer_text,
          url: file.url ?? '',
          mimeType,
          name: file.fileName || '未命名文件',
          isImage,
        }
      })
    })
  }, [sessions])

  const toggleSelection = (selectionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(selectionId)) {
        next.delete(selectionId)
      } else {
        next.add(selectionId)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
      return
    }

    setSelectedIds(new Set(items.map((item) => item.selectionId)))
  }

  const handleConfirm = () => {
    const selectedItems = items.filter((item) => selectedIds.has(item.selectionId))
    if (selectedItems.length === 0) {
      onConfirm([])
      onClose()
      setSelectedIds(new Set())
      return
    }

    onConfirm(
      selectedItems.map((item) => item.name),
      selectedItems as LocalHistoryFileItem[],
    )

    setSelectedIds(new Set())
    onClose()
  }

  const allSelected = items.length > 0 && selectedIds.size === items.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="local-history-files-title"
      className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <h3 id="local-history-files-title" className="text-lg font-medium text-gray-900">
          选择要读取的项目下载文件
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="关闭项目下载文件选择弹窗"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
        {items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-500">
            <svg
              className="w-16 h-16 mb-4 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-sm">当前项目暂无可读取的项目下载文件</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg border border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    aria-label="全选当前页"
                    type="checkbox"
                    className="peer sr-only"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                  <div
                    className={`w-5 h-5 rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 ${
                      allSelected || someSelected
                        ? 'border-transparent'
                        : 'border-gray-300 bg-white'
                    }`}
                    style={
                      {
                        backgroundColor: allSelected || someSelected ? themeColor : undefined,
                        '--tw-ring-color': themeColor,
                      } as CSSProperties
                    }
                  />
                  {(allSelected || someSelected) && (
                    <svg
                      className="absolute w-3.5 h-3.5 text-white pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      {allSelected ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      )}
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">全选当前页</span>
              </label>
              <span className="text-xs text-gray-500">共 {items.length} 项</span>
            </div>

            <div className="grid gap-3">
              {items.map((item) => {
                const isSelected = selectedIds.has(item.selectionId)

                return (
                  <div
                    key={item.selectionId}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    className={`group flex w-full cursor-pointer items-start gap-4 rounded-xl border p-4 text-left transition-[background-color,border-color,color,box-shadow,opacity,transform] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                    style={
                      {
                        '--tw-ring-color': themeColor,
                      } as CSSProperties
                    }
                    onClick={() => toggleSelection(item.selectionId)}
                    onKeyDown={(event) => {
                      if (
                        event.key === ' ' ||
                        event.key === 'Spacebar' ||
                        event.code === 'Space' ||
                        event.key === 'Enter'
                      ) {
                        event.preventDefault()
                        toggleSelection(item.selectionId)
                      }
                    }}
                  >
                    <div className="relative flex items-center justify-center w-5 h-5 shrink-0 mt-0.5">
                      <div
                        className={`w-5 h-5 rounded border transition-colors ${
                          isSelected ? 'border-transparent' : 'border-gray-300 bg-white'
                        }`}
                        style={{
                          backgroundColor: isSelected ? themeColor : undefined,
                        }}
                      />
                      {isSelected && (
                        <svg
                          className="absolute w-3.5 h-3.5 text-white pointer-events-none"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0"
                          style={{
                            backgroundColor: `${themeColor}15`,
                            color: themeColor,
                          }}
                        >
                          {item.sessionType === 2 ? 'chatflow' : 'workflow'}
                        </span>
                        <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                      </div>

                      <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
                        来源：{item.sessionTitle}
                      </p>

                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                          <span className="truncate max-w-[200px]">
                            {item.isImage ? '图片文件' : '文档附件'}
                          </span>
                        </div>
                        {item.answerText ? (
                          <span className="truncate text-xs text-gray-500 max-w-[240px]">
                            {item.answerText.trim() || '无文本内容'}
                          </span>
                        ) : null}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : '未知日期'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
        <div className="text-sm text-gray-500">
          已选择 <span className="font-medium text-gray-900">{selectedIds.size}</span> 项
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: themeColor }}
          >
            确认读取
          </button>
        </div>
      </div>
    </AccessibleDialog>
  )
}
