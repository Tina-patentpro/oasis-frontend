import React from 'react'
import { FileText, Upload, X } from 'lucide-react'

import { getProgressLabel, getStatusCircleClassName, getStatusTextClassName } from './view-state'
import type { UploadProgress, UploadStatus } from './types'

interface FileUploadProgressPanelProps {
  isUploadComplete: boolean
  progressTitle: string
  shouldShowStatusSummary: boolean
  showProgress: boolean
  totalProgress: number
  uploadProgress: UploadProgress[]
}

const renderStatusIcon = (status: UploadStatus) => {
  switch (status) {
    case 'pending':
      return <Upload className="w-4 h-4 text-white" />
    case 'success':
      return <FileText className="w-4 h-4 text-white" />
    case 'error':
      return <X className="w-4 h-4 text-white" />
    case 'uploading':
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white border-t-transparent"></div>
      )
    default:
      return null
  }
}

const UploadProgressRow: React.FC<{ item: UploadProgress }> = ({ item }) => (
  <div className="flex min-w-0 items-center justify-between p-3 border rounded-lg" role="listitem">
    <div className="flex flex-1 min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className={getStatusCircleClassName(item.status)}>{renderStatusIcon(item.status)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
          <p className="text-xs text-gray-500">{(item.file.size / 1024).toFixed(2)} KB</p>
        </div>
      </div>

      <div className="text-right">
        <span className={getStatusTextClassName(item.status)}>{getProgressLabel(item)}</span>
        {item.error ? (
          <p className="text-xs text-red-500 mt-1" role="alert">
            {item.error}
          </p>
        ) : null}
      </div>
    </div>
  </div>
)

export const FileUploadProgressPanel: React.FC<FileUploadProgressPanelProps> = ({
  isUploadComplete,
  progressTitle,
  shouldShowStatusSummary,
  showProgress,
  totalProgress,
  uploadProgress,
}) => {
  if (!showProgress || uploadProgress.length === 0) {
    return null
  }

  return (
    <>
      {isUploadComplete ? (
        <div
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          role="status"
        >
          已上传 {uploadProgress.length} 个文件
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-gray-900">{progressTitle}</h4>
          {shouldShowStatusSummary ? (
            <span className="text-sm text-gray-600">{totalProgress}%</span>
          ) : null}
        </div>

        <div className="space-y-2" role="list" aria-label="上传文件列表">
          {uploadProgress.map((item, index) => (
            <UploadProgressRow
              item={item}
              key={`${item.file.name}-${item.file.size}-${item.file.lastModified}-${index}`}
            />
          ))}
        </div>
      </div>
    </>
  )
}
