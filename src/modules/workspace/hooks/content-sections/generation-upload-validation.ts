import { MAX_UPLOAD_FILE_SIZE_BYTES } from '@/constants/uploadLimits'

const ALLOWED_UPLOAD_EXTENSIONS = [
  '.txt',
  '.md',
  '.pdf',
  '.html',
  '.xlsx',
  '.xls',
  '.docx',
  '.csv',
  '.eml',
  '.msg',
  '.pptx',
  '.ppt',
  '.xml',
  '.epub',
] as const

const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'application/msword',
  'text/plain',
  'text/markdown',
  'text/html',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'message/rfc822',
  'application/vnd.ms-outlook',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/xml',
  'text/xml',
  'application/epub+zip',
] as const

type UploadKind = 'file' | 'image'

export const GENERATION_UPLOAD_MAX_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_BYTES

interface UploadFileLike {
  name: string
  type: string
  size?: number
}

export function isSupportedUploadFile(file: UploadFileLike, uploadKind: UploadKind): boolean {
  if (typeof file.size === 'number' && file.size > GENERATION_UPLOAD_MAX_SIZE_BYTES) {
    return false
  }

  if (uploadKind === 'image') {
    return file.type.startsWith('image/')
  }

  const extension = file.name.slice(((file.name.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase()

  return (
    ALLOWED_UPLOAD_EXTENSIONS.includes(
      `.${extension}` as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number],
    ) || ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])
  )
}

export function filterSupportedUploadFiles<T extends UploadFileLike>(
  files: T[],
  uploadKind: UploadKind,
): { acceptedFiles: T[]; rejectedFiles: T[] } {
  const acceptedFiles: T[] = []
  const rejectedFiles: T[] = []

  files.forEach((file) => {
    if (isSupportedUploadFile(file, uploadKind)) {
      acceptedFiles.push(file)
      return
    }
    rejectedFiles.push(file)
  })

  return {
    acceptedFiles,
    rejectedFiles,
  }
}

export function isGenerationUploadFileOversized(file: UploadFileLike): boolean {
  return typeof file.size === 'number' && file.size > GENERATION_UPLOAD_MAX_SIZE_BYTES
}

export function buildUnsupportedUploadFileMessage(fileName: string): string {
  return `文件 "${fileName}" 格式暂不受支持，目前支持 txt/md/pdf/html/xlsx/xls/docx/csv/eml/msg/pptx/ppt/xml/epub`
}

export function buildRejectedUploadFileMessage(file: UploadFileLike): string {
  if (isGenerationUploadFileOversized(file)) {
    return `文件 "${file.name}" 大小超过限制，最大支持 10MB`
  }

  return buildUnsupportedUploadFileMessage(file.name)
}
