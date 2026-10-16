import { mapErrorToDisplayInfo, type ErrorDisplayInfo } from './errorMapping'

/**
 * 统一的 API 错误类
 * 提供一致的错误处理和类型判断方法
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'

    // 确保 stack trace 正确
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ApiError)
    }
  }

  /**
   * 判断是否为认证错误
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403
  }

  /**
   * 判断是否为验证错误
   */
  isValidationError(): boolean {
    return this.statusCode === 400 || this.statusCode === 422
  }

  /**
   * 判断是否为服务器错误
   */
  isServerError(): boolean {
    return this.statusCode ? this.statusCode >= 500 : false
  }

  /**
   * 判断是否为网络错误
   */
  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR'
  }

  /**
   * 将错误转换为前端提示信息
   */
  toDisplayInfo(): ErrorDisplayInfo {
    return mapErrorToDisplayInfo({
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    })
  }

  /**
   * 格式化错误信息为 JSON
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

/**
 * 类型守卫：判断是否为 ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
