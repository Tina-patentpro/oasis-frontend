import { EXPORT_FORMATS } from '@/utils/download'

import type { DownloadExportType } from './DownloadFilesDialog.types'

type ExportFormatKey = keyof typeof EXPORT_FORMATS

export function DownloadDialogHeader({
  exportType,
  titleId,
  descriptionId,
  backgroundColor,
  onClose,
}: {
  exportType: DownloadExportType
  titleId: string
  descriptionId: string
  backgroundColor: string
  onClose: () => void
}) {
  const title =
    exportType === 'instructions'
      ? '指令库列表'
      : exportType === 'workflow'
        ? 'Workflow列表'
        : exportType === 'files'
          ? '选择下载文件'
          : '导出数据'

  const description =
    exportType === 'instructions'
      ? '查看工作聚焦、语义生图、通用对话三种类型的指令'
      : exportType === 'workflow'
        ? '请查看您的Workflow记录'
        : exportType === 'files'
          ? '请选择要下载的文件'
          : `请选择要导出的${exportType === 'session' ? '会话' : exportType === 'project' ? '项目' : '历史记录'}`

  return (
    <div className="px-6 py-4 border-b" style={{ backgroundColor }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {title}
          </h2>
          <p id={descriptionId} className="text-sm text-gray-600 mt-1">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-600 transition-colors"
          aria-label="关闭下载文件弹窗"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function DownloadExportOptions({
  exportType,
  selectedFormat,
  compressFiles,
  includeAttachments,
  isExporting,
  onSelectedFormatChange,
  onCompressFilesChange,
  onIncludeAttachmentsChange,
}: {
  exportType: DownloadExportType
  selectedFormat: ExportFormatKey
  compressFiles: boolean
  includeAttachments: boolean
  isExporting: boolean
  onSelectedFormatChange: (value: ExportFormatKey) => void
  onCompressFilesChange: (value: boolean) => void
  onIncludeAttachmentsChange: (value: boolean) => void
}) {
  if (exportType === 'files' || exportType === 'workflow' || exportType === 'instructions') {
    return null
  }

  return (
    <div className="px-6 py-4 border-b bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-2"
            htmlFor="download-files-export-format"
          >
            导出格式
          </label>
          <select
            id="download-files-export-format"
            value={selectedFormat}
            onChange={(event) => onSelectedFormatChange(event.target.value as ExportFormatKey)}
            disabled={isExporting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
          >
            {Object.entries(EXPORT_FORMATS).map(([key, format]) => (
              <option key={key} value={key}>
                {format.format.toUpperCase()} ({format.extension})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              aria-label="压缩为ZIP"
              type="checkbox"
              checked={compressFiles}
              onChange={(event) => onCompressFilesChange(event.target.checked)}
              disabled={isExporting}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-400"
            />
            <span className="text-sm text-gray-700">压缩为ZIP</span>
          </label>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              aria-label="包含附件"
              type="checkbox"
              checked={includeAttachments}
              onChange={(event) => onIncludeAttachmentsChange(event.target.checked)}
              disabled={isExporting}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-400"
            />
            <span className="text-sm text-gray-700">包含附件</span>
          </label>
        </div>
      </div>
    </div>
  )
}
