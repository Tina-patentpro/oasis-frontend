export interface FileUploadProps {
  accept?: string
  multiple?: boolean
  disabled?: boolean
  idleSelectionLabel?: string
  idleSelectionDisabled?: boolean
  onFileSelect?: (files: File[]) => void
  onUpload?: (files: File[]) => Promise<void>
  showProgress?: boolean
  showHint?: boolean
  className?: string
  maxSize?: number
  maxFiles?: number
}

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'

export interface UploadProgress {
  file: File
  progress: number
  status: UploadStatus
  error?: string
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
}

export interface FileSelectionResult {
  validFiles: File[]
  errors: string[]
}

export interface FileUploadViewState {
  chooseButtonLabel: string
  hasError: boolean
  hasSelectedFiles: boolean
  isPendingConfirmation: boolean
  isSelectionDisabled: boolean
  isUploadComplete: boolean
  isUploading: boolean
  pendingHintId?: string
  progressTitle: string
  shouldShowStatusSummary: boolean
  totalProgress: number
  uploadButtonLabel: string
}
