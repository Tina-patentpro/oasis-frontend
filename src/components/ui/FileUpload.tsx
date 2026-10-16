import React, { useCallback, useMemo, useRef, useState } from 'react'

import { MAX_UPLOAD_FILE_SIZE_BYTES } from '@/constants/uploadLimits'

import { FileUploadActions } from './file-upload/FileUploadActions'
import { FileUploadDropzone } from './file-upload/FileUploadDropzone'
import { FileUploadHint } from './file-upload/FileUploadHint'
import { FileUploadMessages } from './file-upload/FileUploadMessages'
import { FileUploadProgressPanel } from './file-upload/FileUploadProgressPanel'
import { FileUploadSubmitAction } from './file-upload/FileUploadSubmitAction'
import {
  buildFileNameWarning,
  buildValidationResult,
  createPendingUploadProgress,
  getRiskyFileNames,
  selectValidFiles,
} from './file-upload/validation'
import {
  buildFileUploadViewState,
  markUploadAsError,
  markUploadAsSuccess,
  markUploadAsUploading,
} from './file-upload/view-state'
import type { FileUploadProps, UploadProgress } from './file-upload/types'

export { isFileAccepted } from './file-upload/validation'

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*/*',
  multiple = false,
  disabled = false,
  idleSelectionLabel = '选择文件',
  idleSelectionDisabled = false,
  onFileSelect,
  onUpload,
  showProgress = true,
  showHint = true,
  className = '',
  maxSize = MAX_UPLOAD_FILE_SIZE_BYTES,
  maxFiles = 10,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [fileNameWarning, setFileNameWarning] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const viewState = useMemo(
    () =>
      buildFileUploadViewState({
        disabled,
        idleSelectionDisabled,
        idleSelectionLabel,
        uploadProgress,
      }),
    [disabled, idleSelectionDisabled, idleSelectionLabel, uploadProgress],
  )

  const validateFile = useCallback(
    (file: File) => buildValidationResult(file, accept, maxSize),
    [accept, maxSize],
  )

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || viewState.isSelectionDisabled) {
        return
      }

      setFileNameWarning(null)
      setValidationError(null)

      const { validFiles, errors } = selectValidFiles(files, maxFiles, validateFile)
      if (errors.length > 0) {
        console.warn('文件验证失败:', errors)
        setValidationError(errors.join('；'))
        return
      }

      setFileNameWarning(buildFileNameWarning(getRiskyFileNames(validFiles)))
      onFileSelect?.(validFiles)

      if (showProgress) {
        setUploadProgress(createPendingUploadProgress(validFiles))
      }
    },
    [maxFiles, onFileSelect, showProgress, validateFile, viewState.isSelectionDisabled],
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (viewState.isSelectionDisabled) {
        return
      }

      setIsDragging(true)
    },
    [viewState.isSelectionDisabled],
  )

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      if (viewState.isSelectionDisabled) {
        return
      }

      handleFileSelect(event.dataTransfer.files)
    },
    [handleFileSelect, viewState.isSelectionDisabled],
  )

  const handleUpload = useCallback(async () => {
    if (uploadProgress.length === 0) {
      return
    }

    setUploadProgress(markUploadAsUploading)

    try {
      if (onUpload) {
        await onUpload(uploadProgress.map((item) => item.file))
      }

      if (showProgress) {
        setUploadProgress(markUploadAsSuccess)
      }
    } catch (error) {
      console.error('上传失败:', error)
      setUploadProgress(markUploadAsError(error))
    }
  }, [onUpload, showProgress, uploadProgress])

  const resetUpload = useCallback(() => {
    setUploadProgress([])
    setFileNameWarning(null)
    setValidationError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className={`relative flex flex-col ${className}`}>
      <FileUploadDropzone
        accept={accept}
        fileInputRef={fileInputRef}
        hasSelectedFiles={viewState.hasSelectedFiles}
        isDragging={isDragging}
        isSelectionDisabled={viewState.isSelectionDisabled}
        multiple={multiple}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
      />

      <FileUploadActions
        chooseButtonLabel={viewState.chooseButtonLabel}
        disabled={disabled}
        hasSelectedFiles={viewState.hasSelectedFiles}
        isSelectionDisabled={viewState.isSelectionDisabled}
        isUploadComplete={viewState.isUploadComplete}
        isUploading={viewState.isUploading}
        onChooseFiles={openFileDialog}
        onReset={resetUpload}
        showProgress={showProgress}
      />

      <FileUploadProgressPanel
        isUploadComplete={viewState.isUploadComplete}
        progressTitle={viewState.progressTitle}
        shouldShowStatusSummary={viewState.shouldShowStatusSummary}
        showProgress={showProgress}
        totalProgress={viewState.totalProgress}
        uploadProgress={uploadProgress}
      />

      <FileUploadMessages
        fileNameWarning={fileNameWarning}
        pendingHintId={viewState.pendingHintId}
        showPendingHint={showProgress && viewState.isPendingConfirmation}
        validationError={validationError}
      />

      <FileUploadSubmitAction
        disabled={disabled}
        hasError={viewState.hasError}
        hasSelectedFiles={viewState.hasSelectedFiles}
        isPendingConfirmation={viewState.isPendingConfirmation}
        isUploadComplete={viewState.isUploadComplete}
        isUploading={viewState.isUploading}
        onUpload={handleUpload}
        pendingHintId={viewState.pendingHintId}
        showProgress={showProgress}
        uploadButtonLabel={viewState.uploadButtonLabel}
      />

      <FileUploadHint accept={accept} maxFiles={maxFiles} maxSize={maxSize} showHint={showHint} />
    </div>
  )
}

FileUpload.displayName = 'FileUpload'
