import type { FileSelectionResult, FileValidationResult, UploadProgress } from './types'

const DEFAULT_ACCEPT = '*/*'
const SAFE_FILE_NAME_PATTERN = /^[\p{L}\p{N}._-]+$/u

const parseAcceptValues = (accept: string | undefined): string[] => {
  if (!accept) {
    return [DEFAULT_ACCEPT]
  }

  return accept
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

const getFileExtension = (fileName: string): string | null => {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return null
  }

  return fileName.slice(lastDot).toLowerCase()
}

const isRiskyFileName = (fileName: string): boolean => !SAFE_FILE_NAME_PATTERN.test(fileName)

export const isFileAccepted = (file: File, accept: string | undefined): boolean => {
  const acceptValues = parseAcceptValues(accept)
  if (acceptValues.length === 0) {
    return true
  }

  const wildcard = acceptValues.includes('*') || acceptValues.includes(DEFAULT_ACCEPT)
  if (wildcard) {
    return true
  }

  const fileType = file.type?.toLowerCase() ?? ''
  const fileExtension = getFileExtension(file.name)

  return acceptValues.some((value) => {
    if (!value) {
      return false
    }

    if (value.startsWith('.')) {
      return fileExtension === value
    }

    if (value.endsWith('/*')) {
      const group = value.slice(0, value.length - 1)
      return fileType.startsWith(group)
    }

    return value === fileType
  })
}

export const buildValidationResult = (
  file: File,
  accept: string | undefined,
  maxSize: number,
): FileValidationResult => {
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `文件大小超过限制 (${Math.round(maxSize / 1024 / 1024)}MB)`,
    }
  }

  if (!isFileAccepted(file, accept)) {
    return {
      isValid: false,
      error: `不支持的文件类型：${file.type || file.name}`,
    }
  }

  return { isValid: true }
}

export const selectValidFiles = (
  files: FileList,
  maxFiles: number,
  validateFile: (file: File) => FileValidationResult,
): FileSelectionResult => {
  const validFiles: File[] = []
  const errors: string[] = []

  Array.from(files).forEach((file, index) => {
    if (index >= maxFiles) {
      errors.push(`最多只能选择 ${maxFiles} 个文件`)
      return
    }

    const validation = validateFile(file)
    if (validation.isValid) {
      validFiles.push(file)
      return
    }

    errors.push(`${file.name}: ${validation.error}`)
  })

  return {
    errors,
    validFiles,
  }
}

export const getRiskyFileNames = (files: File[]): string[] =>
  Array.from(new Set(files.map((file) => file.name).filter(isRiskyFileName)))

export const buildFileNameWarning = (fileNames: string[]): string | null => {
  if (fileNames.length === 0) {
    return null
  }

  return `文件名包含空格或特殊符号，可能导致生成失败，建议先改名后再上传：${fileNames.join('、')}`
}

export const createPendingUploadProgress = (files: File[]): UploadProgress[] =>
  files.map((file) => ({
    file,
    progress: 0,
    status: 'pending',
  }))
