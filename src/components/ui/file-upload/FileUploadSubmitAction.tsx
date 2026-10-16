import React from 'react'

import { getUploadButtonClassName } from './view-state'

interface FileUploadSubmitActionProps {
  disabled: boolean
  hasError: boolean
  hasSelectedFiles: boolean
  isPendingConfirmation: boolean
  isUploadComplete: boolean
  isUploading: boolean
  onUpload: () => void
  pendingHintId?: string
  showProgress: boolean
  uploadButtonLabel: string
}

export const FileUploadSubmitAction: React.FC<FileUploadSubmitActionProps> = ({
  disabled,
  hasError,
  hasSelectedFiles,
  isPendingConfirmation,
  isUploadComplete,
  isUploading,
  onUpload,
  pendingHintId,
  showProgress,
  uploadButtonLabel,
}) => {
  if (!showProgress || !hasSelectedFiles || isUploadComplete) {
    return null
  }

  return (
    <button
      aria-describedby={isPendingConfirmation ? pendingHintId : undefined}
      className={getUploadButtonClassName(hasError, isPendingConfirmation)}
      disabled={disabled || isUploading}
      onClick={onUpload}
      type="button"
    >
      <span>{uploadButtonLabel}</span>
    </button>
  )
}
