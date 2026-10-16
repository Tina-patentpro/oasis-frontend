import { ApiError } from '../errors'

import type { RetryOptions } from './types'

export function shouldRetry(error: unknown, retryOn: Array<number | 'network'>): boolean {
  if (!(error instanceof ApiError)) {
    return false
  }

  if (error.isNetworkError() && retryOn.includes('network')) {
    return true
  }

  if (typeof error.statusCode === 'number') {
    return retryOn.includes(error.statusCode)
  }

  return false
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retry?: RetryOptions,
  signal?: AbortSignal,
): Promise<T> {
  const retries = retry?.retries ?? 0
  // 默认仅重试网络错误和 5xx 网关错误；不包含 500——多数 500 属于永久性应用错误
  // 需重试 500 的调用点（如 chatflow）应显式传入 retryOn 覆盖
  const retryOn = retry?.retryOn ?? ['network', 502, 503, 504]
  const initialDelay = retry?.backoffMs ?? 250
  const maxDelay = retry?.maxBackoffMs ?? initialDelay * 8

  let attempt = 0
  let delayMs = initialDelay

  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    try {
      return await operation()
    } catch (error) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      if (attempt >= retries || !shouldRetry(error, retryOn)) {
        throw error
      }

      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'))
          return
        }
        const timer = setTimeout(resolve, delayMs)
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            reject(new DOMException('Aborted', 'AbortError'))
          },
          { once: true },
        )
      })
      attempt += 1
      delayMs = Math.min(delayMs * 2, maxDelay)
    }
  }
}
