import { getErrorMessage } from '@/utils/errorHandler'

import type { FileUploadViewState, UploadProgress, UploadStatus } from './types'

const PENDING_UPLOAD_BUTTON_CLASSES =
  'upload-confirm-button--pending ring-2 ring-emerald-200 ring-offset-2 ring-offset-white shadow-lg shadow-emerald-200/60'

const getProgressTitle = (isUploadComplete: boolean, isPendingConfirmation: boolean): string => {
  if (isUploadComplete) {
    return '已上传文件'
  }

  if (isPendingConfirmation) {
    return '待上传文件'
  }

  return '上传进度'
}

const getUploadButtonLabel = (isUploading: boolean, hasError: boolean): string => {
  if (isUploading) {
    return '上传中...'
  }

  if (hasError) {
    return '重新上传'
  }

  return '点击确认上传'
}

const getChooseButtonLabel = (
  isUploadComplete: boolean,
  hasSelectedFiles: boolean,
  idleSelectionLabel: string,
): string => {
  if (isUploadComplete) {
    return '继续选择文件'
  }

  if (hasSelectedFiles) {
    return '重新选择'
  }

  return idleSelectionLabel
}

export const getProgressLabel = (item: UploadProgress): string => {
  switch (item.status) {
    case 'pending':
      return '待上传'
    case 'uploading':
      return `${item.progress}%`
    case 'success':
      return '已上传'
    case 'error':
      return '上传失败'
    default:
      return `${item.progress}%`
  }
}

export const markUploadAsUploading = (items: UploadProgress[]): UploadProgress[] =>
  items.map((item) => ({
    ...item,
    progress: item.progress > 0 ? item.progress : 10,
    status: 'uploading',
  }))

export const markUploadAsSuccess = (items: UploadProgress[]): UploadProgress[] =>
  items.map(
    (item): UploadProgress => ({
      ...item,
      error: undefined,
      progress: 100,
      status: 'success',
    }),
  )

export const markUploadAsError =
  (error: unknown) =>
  (items: UploadProgress[]): UploadProgress[] =>
    items.map((item) => ({
      ...item,
      error: getErrorMessage(error, '上传失败'),
      status: 'error',
    }))

export const buildFileUploadViewState = ({
  disabled,
  idleSelectionDisabled,
  idleSelectionLabel,
  uploadProgress,
}: {
  disabled: boolean
  idleSelectionDisabled: boolean
  idleSelectionLabel: string
  uploadProgress: UploadProgress[]
}): FileUploadViewState => {
  const hasSelectedFiles = uploadProgress.length > 0
  const isUploading = uploadProgress.some((item) => item.status === 'uploading')
  const hasError = uploadProgress.some((item) => item.status === 'error')
  const isUploadComplete =
    hasSelectedFiles && uploadProgress.every((item) => item.status === 'success')
  const isPendingConfirmation =
    hasSelectedFiles && uploadProgress.every((item) => item.status === 'pending')
  const totalProgress =
    uploadProgress.length > 0
      ? Math.round(
          uploadProgress.reduce((sum, item) => sum + item.progress, 0) / uploadProgress.length,
        )
      : 0
  const isSelectionDisabled = disabled || isUploading || idleSelectionDisabled

  return {
    chooseButtonLabel: getChooseButtonLabel(isUploadComplete, hasSelectedFiles, idleSelectionLabel),
    hasError,
    hasSelectedFiles,
    isPendingConfirmation,
    isSelectionDisabled,
    isUploadComplete,
    isUploading,
    pendingHintId: hasSelectedFiles ? 'file-upload-pending-hint' : undefined,
    progressTitle: getProgressTitle(isUploadComplete, isPendingConfirmation),
    shouldShowStatusSummary: hasSelectedFiles && !isPendingConfirmation,
    totalProgress,
    uploadButtonLabel: getUploadButtonLabel(isUploading, hasError),
  }
}

export const getDropzoneClassName = ({
  hasSelectedFiles,
  isDragging,
  isSelectionDisabled,
}: {
  hasSelectedFiles: boolean
  isDragging: boolean
  isSelectionDisabled: boolean
}): string => {
  const stateClass = isDragging
    ? 'border-blue-400 bg-blue-50'
    : isSelectionDisabled
      ? 'border-gray-300 bg-gray-50'
      : 'border-gray-300 hover:border-gray-400'
  const sizeClass = hasSelectedFiles ? 'py-3' : 'py-5'
  const disabledClass = isSelectionDisabled ? 'opacity-50 cursor-not-allowed' : ''

  return `flex-1 border-2 border-dashed rounded-xl px-4 text-center transition-colors flex flex-col items-center justify-center ${stateClass} ${sizeClass} ${disabledClass}`
}

export const getChooseButtonClassName = (hasSelectedFiles: boolean): string => {
  const toneClass = hasSelectedFiles
    ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
    : 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'

  return `flex flex-1 items-center justify-center rounded-lg border px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed ${toneClass}`
}

export const getUploadButtonClassName = (
  hasError: boolean,
  isPendingConfirmation: boolean,
): string => {
  const toneClass = hasError ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
  const pendingClass = isPendingConfirmation ? PENDING_UPLOAD_BUTTON_CLASSES : ''

  return `w-full mt-4 px-4 py-2 text-white rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-[box-shadow,filter,transform] duration-200 ${toneClass} ${pendingClass}`.trim()
}

export const getStatusCircleClassName = (status: UploadStatus): string => {
  const toneClass =
    status === 'success' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-blue-500'

  return `w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center ${toneClass}`
}

export const getStatusTextClassName = (status: UploadStatus): string => {
  const toneClass =
    status === 'success'
      ? 'text-green-600'
      : status === 'error'
        ? 'text-red-500'
        : status === 'pending'
          ? 'text-gray-500'
          : 'text-gray-600'

  return `text-sm ${toneClass}`
}
