import React from 'react'

interface FileUploadMessagesProps {
  fileNameWarning: string | null
  pendingHintId?: string
  showPendingHint: boolean
  validationError: string | null
}

export const FileUploadMessages: React.FC<FileUploadMessagesProps> = ({
  fileNameWarning,
  pendingHintId,
  showPendingHint,
  validationError,
}) => {
  if (!fileNameWarning && !showPendingHint && !validationError) {
    return null
  }

  return (
    <div
      className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
      data-testid="upload-message-group"
    >
      {fileNameWarning ? (
        <div
          aria-live="polite"
          className="min-w-0 break-words rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          role="status"
        >
          {fileNameWarning}
        </div>
      ) : null}

      {validationError ? (
        <div
          aria-live="assertive"
          className="min-w-0 break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          role="alert"
        >
          {validationError}
        </div>
      ) : null}

      {showPendingHint ? (
        <p
          className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
          id={pendingHintId}
        >
          文件已选好，点击下方“点击确认上传”后才会开始上传
        </p>
      ) : null}
    </div>
  )
}
