type RestoredImageCandidate = {
  url: string
  fileName?: string
  mimeType?: string
  index: number
}

const FILE_URL_SPLITTER = /,(?=\s*(?:https?:\/\/|\/))/g
const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif|svg|bmp|avif)$/i
const NON_IMAGE_EXTENSION =
  /\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z|txt|md|csv|json|xml|html?)$/i
const DANGEROUS_PROTOCOL = /^\s*(?:javascript|vbscript):/i
const SAFE_DATA_IMAGE_PROTOCOL = /^\s*data:image\/(?:png|jpe?g|gif|webp);base64,/i

function splitFileUrlString(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) {
    return []
  }

  return trimmed
    .split(FILE_URL_SPLITTER)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function splitFileUrlList(value: unknown): string[] {
  if (typeof value === 'string') {
    return splitFileUrlString(value)
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => (typeof item === 'string' ? splitFileUrlString(item) : []))
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue
    }

    const trimmed = value.trim()
    if (trimmed) {
      return trimmed
    }
  }

  return ''
}

function getPathWithoutQuery(url: string): string {
  return url.split(/[?#]/)[0] ?? url
}

function getFileNameFromUrl(url: string, fallback: string): string {
  const path = getPathWithoutQuery(url)
  const rawName = path.slice(path.lastIndexOf('/') + 1)
  if (!rawName) {
    return fallback
  }

  try {
    return decodeURIComponent(rawName)
  } catch {
    return rawName
  }
}

function isSafeImageUrl(url: string): boolean {
  if (!url || DANGEROUS_PROTOCOL.test(url)) {
    return false
  }

  if (/^\s*data:/i.test(url)) {
    return SAFE_DATA_IMAGE_PROTOCOL.test(url)
  }

  return true
}

function shouldRenderAsImage(candidate: RestoredImageCandidate): boolean {
  if (!isSafeImageUrl(candidate.url)) {
    return false
  }

  const mimeType = candidate.mimeType?.trim().toLowerCase()
  if (mimeType) {
    return mimeType.startsWith('image/')
  }

  const path = getPathWithoutQuery(candidate.url)
  if (IMAGE_EXTENSION.test(path)) {
    return true
  }

  if (NON_IMAGE_EXTENSION.test(path)) {
    return false
  }

  // 语义生图常见签名地址没有图片后缀；没有明确非图片证据时按图片恢复。
  return true
}

function normalizeAltText(fileName: string): string {
  return fileName.replace(/[\r\n[\]]+/g, ' ').trim() || '生成图片'
}

function formatMarkdownImage(candidate: RestoredImageCandidate): string {
  const fileName =
    candidate.fileName || getFileNameFromUrl(candidate.url, `生成图片 ${candidate.index + 1}`)
  const escapedUrl = candidate.url.replace(/>/g, '%3E')

  return `![${normalizeAltText(fileName)}](<${escapedUrl}>)`
}

function extractFileOutputCandidates(
  fileOutput: Array<Record<string, unknown>> | undefined,
  positionalUrls: string[],
): RestoredImageCandidate[] {
  if (!Array.isArray(fileOutput)) {
    return []
  }

  return fileOutput
    .map((item, index): RestoredImageCandidate | null => {
      const directDownloadUrl = pickString(item.download_url, item.downloadUrl)
      const ownUrl = pickString(
        directDownloadUrl,
        item.url,
        item.file_url,
        item.fileUrl,
        item.remote_url,
        item.remoteUrl,
      )
      const positionalUrl = positionalUrls[index]
      const url = ownUrl || positionalUrl

      if (!url) {
        return null
      }

      return {
        url,
        fileName: pickString(item.filename, item.fileName, item.name) || undefined,
        mimeType:
          pickString(item.mime_type, item.mimeType, item.content_type, item.contentType) ||
          undefined,
        index,
      }
    })
    .filter((candidate): candidate is RestoredImageCandidate => candidate !== null)
}

function extractRestoredImages(params: {
  fileUrl?: unknown
  fileOutput?: Array<Record<string, unknown>>
}): RestoredImageCandidate[] {
  const positionalUrls = splitFileUrlList(params.fileUrl)
  const candidates = extractFileOutputCandidates(params.fileOutput, positionalUrls)

  positionalUrls.forEach((url, index) => {
    candidates.push({ url, index })
  })

  const images: RestoredImageCandidate[] = []
  const seenUrls = new Set<string>()

  candidates.forEach((candidate) => {
    if (seenUrls.has(candidate.url) || !shouldRenderAsImage(candidate)) {
      return
    }

    seenUrls.add(candidate.url)
    images.push(candidate)
  })

  return images
}

export function buildRestoredChatflowImageContent(params: {
  answerText?: string
  fileUrl?: unknown
  fileOutput?: Array<Record<string, unknown>>
}): string {
  const answerText = typeof params.answerText === 'string' ? params.answerText : ''
  const images = extractRestoredImages(params)
  const imageMarkdown = images
    .filter((image) => !answerText.includes(image.url))
    .map(formatMarkdownImage)
    .join('\n\n')

  if (!imageMarkdown) {
    return answerText
  }

  if (!answerText.trim()) {
    return imageMarkdown
  }

  return `${answerText.trimEnd()}\n\n${imageMarkdown}`
}

function pickFileOutputIdentity(item: Record<string, unknown>): string {
  return (
    pickString(
      item.download_url,
      item.downloadUrl,
      item.url,
      item.file_url,
      item.fileUrl,
      item.remote_url,
      item.remoteUrl,
    ) || JSON.stringify(item)
  )
}

export function mergeRestoredChatflowImageSources(params: {
  fileUrls: unknown[]
  fileOutputs: Array<Array<Record<string, unknown>> | undefined>
}): {
  fileUrl?: string[]
  fileOutput?: Array<Record<string, unknown>>
} {
  const fileUrl = Array.from(new Set(params.fileUrls.flatMap(splitFileUrlList)))
  const fileOutput: Array<Record<string, unknown>> = []
  const seenFileOutput = new Set<string>()

  params.fileOutputs.forEach((candidate) => {
    if (!Array.isArray(candidate) || candidate.length === 0) {
      return
    }

    candidate.forEach((item) => {
      const identity = pickFileOutputIdentity(item)
      if (seenFileOutput.has(identity)) {
        return
      }

      seenFileOutput.add(identity)
      fileOutput.push(item)
    })
  })

  return {
    fileUrl: fileUrl.length > 0 ? fileUrl : undefined,
    fileOutput: fileOutput.length > 0 ? fileOutput : undefined,
  }
}
