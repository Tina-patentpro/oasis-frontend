import { getViteApiBaseUrl } from '@/config/runtime-env'

const GENERATED_FILE_PATH = /^\/?files\//i

export function isGeneratedFilePath(value: string): boolean {
  return GENERATED_FILE_PATH.test(value.trim())
}

export function resolveGeneratedFileUrl(value: string, baseUrl = getViteApiBaseUrl()): string {
  const trimmed = value.trim()
  if (!trimmed || !isGeneratedFilePath(trimmed)) {
    return value
  }

  const generatedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  try {
    if (baseUrl) {
      const resolvedBaseUrl = new URL(baseUrl)
      if (resolvedBaseUrl.protocol !== 'http:' && resolvedBaseUrl.protocol !== 'https:') {
        throw new Error('Generated file base URL must use http or https.')
      }
      return new URL(generatedPath, resolvedBaseUrl).toString()
    }
  } catch {
    // Fall back below.
  }

  if (typeof window === 'undefined') {
    return trimmed
  }

  try {
    return new URL(generatedPath, window.location.href).toString()
  } catch {
    return trimmed
  }
}
