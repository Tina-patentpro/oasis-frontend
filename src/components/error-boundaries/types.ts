/**
 * 错误类型枚举
 */
export enum ErrorType {
  DYNAMIC_IMPORT_ERROR = 'dynamic_import_error', // 前端资源分块加载错误
  NETWORK_ERROR = 'network_error', // 网络错误
  API_ERROR = 'api_error', // API调用错误
  RENDER_ERROR = 'render_error', // 渲染错误
  ASYNC_ERROR = 'async_error', // 异步操作错误
  VALIDATION_ERROR = 'validation_error', // 验证错误
  AUTH_ERROR = 'auth_error', // 认证错误
  UNKNOWN_ERROR = 'unknown_error', // 未知错误
}

/**
 * 错误消息映射
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.DYNAMIC_IMPORT_ERROR]: '页面资源加载失败，请刷新页面后重试',
  [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查您的网络设置',
  [ErrorType.API_ERROR]: '服务请求失败，请稍后重试',
  [ErrorType.RENDER_ERROR]: '页面加载出错，我们正在努力修复',
  [ErrorType.ASYNC_ERROR]: '异步操作失败，请稍后重试',
  [ErrorType.VALIDATION_ERROR]: '数据验证失败，请检查输入',
  [ErrorType.AUTH_ERROR]: '登录已过期，请重新登录',
  [ErrorType.UNKNOWN_ERROR]: '出现未知错误，请联系技术支持',
}

/**
 * 错误分类函数
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase()

  if (isDynamicImportError(error)) {
    return ErrorType.DYNAMIC_IMPORT_ERROR
  }
  if (message.includes('network') || message.includes('fetch')) {
    return ErrorType.NETWORK_ERROR
  }
  if (message.includes('api') || message.includes('request')) {
    return ErrorType.API_ERROR
  }
  if (message.includes('auth') || message.includes('unauthorized')) {
    return ErrorType.AUTH_ERROR
  }
  if (message.includes('validation')) {
    return ErrorType.VALIDATION_ERROR
  }
  if (message.includes('async') || message.includes('promise')) {
    return ErrorType.ASYNC_ERROR
  }

  return ErrorType.UNKNOWN_ERROR
}

export function isDynamicImportError(error: Error): boolean {
  const name = error.name.toLowerCase()
  const message = error.message.toLowerCase()

  return (
    name.includes('chunkloaderror') ||
    message.includes('dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed')
  )
}

/**
 * 获取友好的错误消息
 */
export function getFriendlyErrorMessage(error: Error): string {
  const errorType = classifyError(error)
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ErrorType.UNKNOWN_ERROR]
}
