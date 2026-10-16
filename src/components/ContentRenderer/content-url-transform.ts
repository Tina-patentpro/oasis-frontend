import { resolveGeneratedFileUrl } from '@/utils/generated-file-url'

const SAFE_PROTOCOL = /^(https?|ircs?|mailto|xmpp)$/i
const SAFE_DATA_IMAGE_PROTOCOL = /^data:image\/(?:png|jpe?g|gif|webp);base64,/i
const BASE64_PAYLOAD = /^[A-Za-z0-9+/]+={0,2}$/

const isSafeDataImageUrl = (value: string): boolean => {
  if (!SAFE_DATA_IMAGE_PROTOCOL.test(value)) return false

  const payload = value.slice(value.indexOf(',') + 1)
  return BASE64_PAYLOAD.test(payload) && payload.length % 4 !== 1
}

type UrlNode = {
  tagName?: string
}

/**
 * Keep ReactMarkdown's default safe URL behavior, plus allow embedded raster images
 * used by self-contained Dify render-test workflows.
 */
export const transformContentUrl = (value: string, key?: string, node?: UrlNode): string => {
  const isImageSource = key === 'src' && node?.tagName === 'img'

  if (isImageSource && isSafeDataImageUrl(value)) {
    return value
  }

  if (isImageSource) {
    const resolvedGeneratedFileUrl = resolveGeneratedFileUrl(value)
    if (resolvedGeneratedFileUrl !== value) {
      return resolvedGeneratedFileUrl
    }
  }

  const colon = value.indexOf(':')
  const questionMark = value.indexOf('?')
  const numberSign = value.indexOf('#')
  const slash = value.indexOf('/')

  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    SAFE_PROTOCOL.test(value.slice(0, colon))
  ) {
    return value
  }

  return ''
}
