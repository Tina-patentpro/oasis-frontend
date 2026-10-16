/**
 * 错误处理工具
 * 提供统一的错误处理和错误信息提取
 */

import { isApiError } from '@/api/errors'
import { isNetworkTransportError, NETWORK_ERROR_MESSAGE } from '@/api/core/error-utils'
import {
  resolveRecoveryAction,
  type RecoveryAction,
} from '@/modules/workspace/errors/recovery-model'

/**
 * 从错误对象中提取用户友好的错误信息
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage = '发生未知错误，请稍后重试。',
): string {
  if (isNetworkTransportError(error)) {
    return NETWORK_ERROR_MESSAGE
  }

  if (isApiError(error)) {
    return error.message || '请求失败，请稍后重试。'
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return fallbackMessage
}

/**
 * 错误类型判断
 * 使用 ApiError 类内置的判断方法
 */
export function isNetworkError(error: unknown): boolean {
  if (isNetworkTransportError(error)) {
    return true
  }

  if (isApiError(error)) {
    return error.isNetworkError()
  }

  if (error instanceof Error) {
    return (
      error.message.includes('Network') ||
      error.message.includes('fetch') ||
      error.message.includes('timeout')
    )
  }
  return false
}

export function isAuthError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.isAuthError()
  }
  return false
}

export function isValidationError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.isValidationError()
  }
  return false
}

export function isServerError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.isServerError()
  }
  return false
}

export function resolveRecoveryActionFromError(error: unknown): RecoveryAction {
  if (isApiError(error)) {
    return resolveRecoveryAction({
      statusCode: error.statusCode,
      code: error.code,
    })
  }

  if (isNetworkError(error)) {
    return 'retry'
  }

  return resolveRecoveryAction({})
}

/**
 * 错误日志记录
 */
export function logError(error: unknown, context?: string): void {
  const errorMessage = getErrorMessage(error)
  const timestamp = new Date().toISOString()

  console.error(`[${timestamp}] ${context ? `[${context}] ` : ''}${errorMessage}`, error)

  // 在生产环境中，这里可以发送错误到日志服务
  // if (import.meta.env.PROD) {
  //   sendToErrorTracking(error, context);
  // }
}

/**
 * 错误重试工具
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    retryDelay?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {},
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        onRetry?.(attempt + 1, lastError)
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  throw lastError!
}

/**
 * 创建错误处理装饰器
 */
export function withErrorHandler<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  onError?: (error: Error) => void,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    try {
      return await fn(...args)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err)
      throw err
    }
  }
}
