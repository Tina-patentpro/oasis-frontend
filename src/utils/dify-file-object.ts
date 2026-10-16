type DifyImageFileRecord = Record<string, unknown>

const DIFY_OBJECT_PATTERN =
  /\{[^{}]*(?:(?:['"]type['"]\s*:\s*['"]image['"])|(?:['"]transfer_method['"]\s*:\s*['"]tool_file['"])|__dify__file__|\/files\/tools\/)[^{}]*\}/gi

const DANGEROUS_PROTOCOL = /^\s*(?:javascript|vbscript):/i
const DATA_IMAGE_PROTOCOL = /^\s*data:image\//i
const IMAGE_EXTENSION_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue
    }

    const trimmed = value.trim()
    if (trimmed && trimmed !== 'None' && trimmed !== 'null') {
      return trimmed
    }
  }

  return ''
}

function extractStringField(source: string, keys: string[]): string {
  for (const key of keys) {
    const pattern = new RegExp(
      `['"]${key}['"]\\s*:\\s*(?:['"]([^'"]*)['"]|([^,}\\]]+))`,
      'i',
    )
    const match = source.match(pattern)
    const value = match?.[1] ?? match?.[2]
    const picked = pickString(value)
    if (picked) {
      return picked
    }
  }

  return ''
}

function getPathWithoutQuery(url: string): string {
  return url.split(/[?#]/)[0] ?? url
}

function getExtension(value: string): string {
  const path = getPathWithoutQuery(value).toLowerCase()
  const match = path.match(/\.([a-z0-9]+)$/)

  return match?.[1] ?? ''
}

function inferMimeType(url: string, fileName?: string, mimeType?: string): string | undefined {
  if (mimeType?.trim()) {
    return mimeType.trim()
  }

  const extension = getExtension(fileName || url)

  return IMAGE_EXTENSION_MIME[extension]
}

function isSafeUrl(url: string): boolean {
  if (!url || DANGEROUS_PROTOCOL.test(url)) {
    return false
  }

  if (/^\s*data:/i.test(url)) {
    return DATA_IMAGE_PROTOCOL.test(url)
  }

  return true
}

function isImageFile(params: {
  type?: string
  url: string
  fileName?: string
  mimeType?: string
}): boolean {
  const normalizedType = params.type?.trim().toLowerCase()
  const normalizedMimeType = params.mimeType?.trim().toLowerCase()

  if (normalizedType === 'image') {
    return true
  }

  if (normalizedMimeType?.startsWith('image/')) {
    return true
  }

  return Boolean(IMAGE_EXTENSION_MIME[getExtension(params.fileName || params.url)])
}

function normalizeCandidate(params: {
  type?: string
  url: string
  fileName?: string
  mimeType?: string
}): DifyImageFileRecord | null {
  const url = params.url.trim()
  const fileName = params.fileName?.trim()
  const mimeType = inferMimeType(url, fileName, params.mimeType)

  if (
    !isSafeUrl(url) ||
    !isImageFile({
      type: params.type,
      url,
      fileName,
      mimeType,
    })
  ) {
    return null
  }

  return {
    type: 'image',
    filename: fileName,
    url,
    mime_type: mimeType,
  }
}

function extractFromRecord(record: Record<string, unknown>): DifyImageFileRecord | null {
  return normalizeCandidate({
    type: pickString(record.type),
    url: pickString(
      record.download_url,
      record.downloadUrl,
      record.url,
      record.file_url,
      record.fileUrl,
      record.remote_url,
      record.remoteUrl,
    ),
    fileName: pickString(record.filename, record.fileName, record.name) || undefined,
    mimeType:
      pickString(record.mime_type, record.mimeType, record.content_type, record.contentType) ||
      undefined,
  })
}

function extractFromLooseObjectText(source: string): DifyImageFileRecord[] {
  const records: DifyImageFileRecord[] = []
  const matches = source.matchAll(DIFY_OBJECT_PATTERN)

  for (const match of matches) {
    const rawObject = match[0]
    const normalized = normalizeCandidate({
      type: extractStringField(rawObject, ['type']),
      url: extractStringField(rawObject, [
        'download_url',
        'downloadUrl',
        'url',
        'file_url',
        'fileUrl',
        'remote_url',
        'remoteUrl',
      ]),
      fileName: extractStringField(rawObject, ['filename', 'fileName', 'name']) || undefined,
      mimeType:
        extractStringField(rawObject, ['mime_type', 'mimeType', 'content_type', 'contentType']) ||
        undefined,
    })

    if (normalized) {
      records.push(normalized)
    }
  }

  return records
}

function parseJsonValue(value: string): unknown | undefined {
  const trimmed = value.trim()
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
    return undefined
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return undefined
  }
}

function isInputEchoKey(key: string): boolean {
  const normalized = key.trim().toLowerCase()

  return normalized === 'input' || normalized === 'inputs'
}

function collectDifyImageFileObjects(value: unknown, output: DifyImageFileRecord[]): void {
  if (typeof value === 'string') {
    const parsed = parseJsonValue(value)
    if (parsed !== undefined) {
      collectDifyImageFileObjects(parsed, output)
      return
    }

    output.push(...extractFromLooseObjectText(value))
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectDifyImageFileObjects(item, output))
    return
  }

  if (!isRecord(value)) {
    return
  }

  const directRecord = extractFromRecord(value)
  if (directRecord) {
    output.push(directRecord)
  }

  Object.entries(value).forEach(([key, item]) => {
    if (isInputEchoKey(key)) {
      return
    }

    collectDifyImageFileObjects(item, output)
  })
}

export function extractDifyImageFileObjects(value: unknown): DifyImageFileRecord[] {
  const extracted: DifyImageFileRecord[] = []
  collectDifyImageFileObjects(value, extracted)

  const uniqueByUrl = new Map<string, DifyImageFileRecord>()
  extracted.forEach((record) => {
    const url = pickString(record.url)
    if (url && !uniqueByUrl.has(url)) {
      uniqueByUrl.set(url, record)
    }
  })

  return Array.from(uniqueByUrl.values())
}
