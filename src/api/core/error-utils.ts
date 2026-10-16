import { ApiError } from '../errors'

export const NETWORK_ERROR_MESSAGE = '网络连接失败，请检查网络后重试。'

const NETWORK_ERROR_PATTERNS = [
  'failed to fetch',
  'fetch failed',
  'networkerror',
  'network error',
  'load failed',
]

const getErrorMessageValue = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown }).message
    if (typeof maybeMessage === 'string') {
      return maybeMessage
    }
  }

  return ''
}

export function isNetworkTransportError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.code === 'NETWORK_ERROR'
  }

  const message = getErrorMessageValue(error).toLowerCase()
  return NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

export function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof ApiError && typeof error.statusCode === 'number') {
    return error.statusCode
  }
  if (error && typeof error === 'object') {
    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
      return (error as { status: number }).status
    }

    if (
      'statusCode' in error &&
      typeof (error as { statusCode: unknown }).statusCode === 'number'
    ) {
      return (error as { statusCode: number }).statusCode
    }
  }
  return undefined
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (isNetworkTransportError(error)) {
    return new ApiError(NETWORK_ERROR_MESSAGE, 'NETWORK_ERROR')
  }

  const status = getErrorStatus(error)
  const message = error instanceof Error ? error.message : '请求失败'
  return new ApiError(message, status === 401 ? 'AUTH_UNAUTHORIZED' : 'HTTP_ERROR', status)
}

export function isAbortLikeError(error: unknown): boolean {
  if (!error) {
    return false
  }

  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (error.name === 'AbortError') {
      return true
    }

    return (
      message.includes('aborted') ||
      message.includes('aborterror') ||
      message.includes('signal is aborted') ||
      message.includes('the user aborted')
    )
  }

  if (typeof error === 'object') {
    const maybeName = (error as { name?: unknown }).name
    const maybeMessage = (error as { message?: unknown }).message

    if (maybeName === 'AbortError') {
      return true
    }

    if (typeof maybeMessage === 'string') {
      const message = maybeMessage.toLowerCase()
      return message.includes('aborted') || message.includes('aborterror')
    }
  }

  return false
}
