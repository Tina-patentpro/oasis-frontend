export type UploadInputFileItem = {
  url: string
  mimeType: string
  name?: string
}

export type UploadActionMode = 'append' | 'replace'

interface UploadFieldConfig {
  maxFiles: number
  multiple: boolean
}

interface UploadSelectionState extends UploadFieldConfig {
  existingCount: number
  isAtLimit: boolean
  nextMode: UploadActionMode
  remainingSlots: number
  selectionLimit: number
}

const DEFAULT_SINGLE_FILE_LIMIT = 1
const DEFAULT_MULTI_FILE_LIMIT = 5

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue
    }
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return ''
}

const decodeFileName = (name: string): string => {
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

export const getUploadFieldConfig = (fieldType: string | undefined): UploadFieldConfig => {
  switch (fieldType) {
    case 'file_list':
    case 'image':
      return {
        maxFiles: DEFAULT_MULTI_FILE_LIMIT,
        multiple: true,
      }
    case 'file':
    default:
      return {
        maxFiles: DEFAULT_SINGLE_FILE_LIMIT,
        multiple: false,
      }
  }
}

export const getUploadSelectionState = (
  fieldType: string | undefined,
  existingCount: number,
): UploadSelectionState => {
  const config = getUploadFieldConfig(fieldType)
  const normalizedExistingCount = Math.max(0, existingCount)
  const remainingSlots = Math.max(0, config.maxFiles - normalizedExistingCount)
  const isAtLimit = normalizedExistingCount >= config.maxFiles
  const nextMode: UploadActionMode =
    normalizedExistingCount > 0 && (!config.multiple || isAtLimit) ? 'replace' : 'append'

  return {
    ...config,
    existingCount: normalizedExistingCount,
    isAtLimit,
    nextMode,
    remainingSlots,
    selectionLimit: config.multiple
      ? isAtLimit
        ? config.maxFiles
        : Math.max(1, remainingSlots)
      : config.maxFiles,
  }
}

const inferNameFromUrl = (url: string): string | undefined => {
  const cleaned = url.split('?')[0]?.split('#')[0] ?? ''
  const segment = cleaned.split('/').pop()?.trim()
  return segment && segment.length > 0 ? decodeFileName(segment) : undefined
}

const normalizeFileItem = (item: unknown): UploadInputFileItem | null => {
  if (typeof item === 'string') {
    const url = item.trim()
    if (!url) {
      return null
    }
    return {
      url,
      mimeType: '',
      name: inferNameFromUrl(url),
    }
  }

  if (!isRecord(item)) {
    return null
  }

  const url = pickString(
    item.url,
    item.file,
    item.saved_path,
    item.savedPath,
    item.remote_url,
    item.remoteUrl,
  )
  if (!url) {
    return null
  }

  const mimeType = pickString(item.mimeType, item.mime_type, item.content_type, item.contentType)
  const nameCandidate = pickString(item.name, item.fileName, item.filename) || inferNameFromUrl(url)
  const name = nameCandidate ? decodeFileName(nameCandidate) : undefined

  return {
    url,
    mimeType,
    ...(name ? { name } : {}),
  }
}

export const parseUploadInputValue = (rawValue: string): UploadInputFileItem[] => {
  const text = typeof rawValue === 'string' ? rawValue.trim() : ''
  if (!text) {
    return []
  }

  try {
    const parsed = JSON.parse(text)
    const items = Array.isArray(parsed) ? parsed : [parsed]
    return items
      .map((item) => normalizeFileItem(item))
      .filter((item): item is UploadInputFileItem => item !== null)
  } catch {
    const fallback = normalizeFileItem(text)
    return fallback ? [fallback] : []
  }
}

export const mergeUploadInputValue = (
  existingValue: string,
  incomingItems: Array<{ url: string; mimeType?: string }>,
): UploadInputFileItem[] => {
  const existing = parseUploadInputValue(existingValue)
  const incoming = incomingItems
    .map((item) => normalizeFileItem(item))
    .filter((item): item is UploadInputFileItem => item !== null)

  const merged = [...existing]
  const urlIndex = new Map<string, number>()
  merged.forEach((item, index) => {
    urlIndex.set(item.url, index)
  })

  incoming.forEach((item) => {
    const index = urlIndex.get(item.url)
    if (index === undefined) {
      urlIndex.set(item.url, merged.length)
      merged.push(item)
      return
    }

    merged[index] = {
      ...merged[index],
      ...item,
      mimeType: item.mimeType || merged[index]?.mimeType || '',
    }
  })

  return merged
}

export const buildUploadedInputValue = (params: {
  targetFieldType: string | undefined
  existingValue: string
  uploadedFiles: Array<{ url: string; mimeType?: string }>
  selectionLimit: number
  maxFiles: number
  uploadMode: UploadActionMode
}): string => {
  const { targetFieldType, existingValue, uploadedFiles, selectionLimit, maxFiles, uploadMode } =
    params

  if (targetFieldType === 'file') {
    return JSON.stringify(uploadedFiles[0])
  }

  const limitedUploadedFiles = uploadedFiles.slice(0, selectionLimit)

  if (uploadMode === 'replace') {
    return JSON.stringify(limitedUploadedFiles)
  }

  const mergedFiles = mergeUploadInputValue(existingValue, limitedUploadedFiles)
  return JSON.stringify(mergedFiles.slice(0, maxFiles))
}
