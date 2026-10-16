type FileUrlLike = string | string[] | null | undefined

export const FILE_URL_SPLITTER = /,(?=\s*(?:https?:\/\/|\/))/g

function splitFileUrlString(value: string): string[] {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return []
  }

  return trimmed
    .split(FILE_URL_SPLITTER)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function normalizeFileUrlList(value: FileUrlLike | unknown): string[] {
  if (typeof value === 'string') {
    return splitFileUrlString(value)
  }

  if (!Array.isArray(value)) {
    return []
  }

  const normalized = value
    .flatMap((item) => (typeof item === 'string' ? splitFileUrlString(item) : []))
    .filter((item) => item.length > 0)

  return Array.from(new Set(normalized))
}

export function normalizeFileUrlValue(value: FileUrlLike | unknown): string | string[] | undefined {
  const normalized = normalizeFileUrlList(value)
  if (normalized.length === 0) {
    return undefined
  }
  return normalized.length === 1 ? normalized[0] : normalized
}

export function hasUsableFileUrl(value: FileUrlLike | unknown): boolean {
  return normalizeFileUrlList(value).length > 0
}

export function pickPrimaryFileUrl(value: FileUrlLike | unknown): string | undefined {
  return normalizeFileUrlList(value)[0]
}
