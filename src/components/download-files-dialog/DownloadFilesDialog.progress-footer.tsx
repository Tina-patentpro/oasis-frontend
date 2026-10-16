import type { DownloadProgress } from '@/utils/download'

import type { DownloadExportType } from './DownloadFilesDialog.types'

export function DownloadProgressPanel({
  exportProgress,
  exportSuccessHint,
  onRetryExport,
}: {
  exportProgress: DownloadProgress | null
  exportSuccessHint: string | null
  onRetryExport: () => void
}) {
  if (!exportProgress) {
    return null
  }

  return (
    <div
      className="px-6 py-4 border-t bg-gray-50"
      role={exportProgress.status === 'error' ? undefined : 'status'}
      aria-live={exportProgress.status === 'error' ? undefined : 'polite'}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {exportProgress.status === 'loading'
              ? '导出中…'
              : exportProgress.status === 'success'
                ? '导出完成'
                : exportProgress.status === 'error'
                  ? '导出失败'
                  : '准备中'}
          </span>
          <span className="text-gray-900 font-medium">{exportProgress.percentage}%</span>
        </div>

        {exportProgress.status === 'loading' && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${exportProgress.percentage}%` }}
            />
          </div>
        )}

        {exportProgress.status === 'error' && (
          <div className="text-red-600 text-sm" role="alert">
            {exportProgress.error}
            <button
              type="button"
              onClick={onRetryExport}
              className="ml-2 text-emerald-600 hover:text-emerald-700 underline"
            >
              重试
            </button>
          </div>
        )}

        {exportProgress.status === 'success' && exportSuccessHint && (
          <div className="text-amber-700 text-sm">{exportSuccessHint}</div>
        )}
      </div>
    </div>
  )
}

export function DownloadDialogFooter({
  exportType,
  instructionsCount,
  selectedCount,
  fileCount,
  isExporting,
  themeColor,
  onClose,
  onDownload,
}: {
  exportType: DownloadExportType
  instructionsCount: number
  selectedCount: number
  fileCount: number
  isExporting: boolean
  themeColor: string
  onClose: () => void
  onDownload: () => void
}) {
  const disabled = selectedCount === 0 || isExporting
  return (
    <div className="px-6 py-4 border-t bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-600">
        {exportType === 'instructions'
          ? `共 ${instructionsCount} 条指令`
          : `已选择 ${selectedCount} / ${fileCount} 个文件`}
      </div>
      <div className="flex w-full justify-end gap-3 sm:w-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={isExporting}
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          取消
        </button>
        {exportType === 'instructions' ? (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-white transition-colors whitespace-nowrap"
            style={{
              backgroundColor: themeColor,
              color: '#ffffff',
              boxShadow: `0 8px 16px ${themeColor}33`,
            }}
          >
            关闭
          </button>
        ) : (
          <button
            type="button"
            onClick={onDownload}
            disabled={disabled}
            className="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 whitespace-nowrap"
            style={{
              backgroundColor: disabled ? '#d1d5db' : themeColor,
              color: disabled ? '#6b7280' : '#ffffff',
              boxShadow: disabled ? 'none' : `0 8px 16px ${themeColor}33`,
            }}
          >
            {isExporting
              ? '导出中…'
              : exportType === 'files'
                ? `下载 (${selectedCount})`
                : `导出 (${selectedCount})`}
          </button>
        )}
      </div>
    </div>
  )
}
