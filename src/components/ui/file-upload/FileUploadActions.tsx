import React from 'react'
import { Upload, X } from 'lucide-react'

import { getChooseButtonClassName } from './view-state'

interface FileUploadActionsProps {
  chooseButtonLabel: string
  disabled: boolean
  hasSelectedFiles: boolean
  isSelectionDisabled: boolean
  isUploadComplete: boolean
  isUploading: boolean
  onChooseFiles: () => void
  onReset: () => void
  showProgress: boolean
}

export const FileUploadActions: React.FC<FileUploadActionsProps> = ({
  chooseButtonLabel,
  disabled,
  hasSelectedFiles,
  isSelectionDisabled,
  isUploadComplete,
  isUploading,
  onChooseFiles,
  onReset,
  showProgress,
}) => {
  const shouldShowResetButton = showProgress && hasSelectedFiles && !isUploadComplete

  return (
    <div className="flex gap-2 mt-4">
      <button
        className={getChooseButtonClassName(hasSelectedFiles)}
        disabled={isSelectionDisabled}
        onClick={onChooseFiles}
        type="button"
      >
        <Upload className="w-5 h-5 mr-2" />
        {chooseButtonLabel}
      </button>

      {shouldShowResetButton ? (
        <button
          className="flex flex-1 items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || isUploading}
          onClick={onReset}
          type="button"
        >
          <X className="w-5 h-5 mr-2" />
          移除文件
        </button>
      ) : null}
    </div>
  )
}
