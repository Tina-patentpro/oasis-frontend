/**
 * API 错误码与前端提示映射。
 * 在接入真实服务前，可统一管理错误提示与重试策略。
 */

export type ErrorLevel = 'info' | 'warning' | 'error'

export interface ErrorDisplayInfo {
  title: string
  description: string
  level: ErrorLevel
  retryable: boolean
}

interface ErrorContext {
  code: string
  message: string
  statusCode?: number
}

const DEFAULT_DISPLAY: ErrorDisplayInfo = {
  title: '操作失败',
  description: '请稍后重试或联系管理员。',
  level: 'error',
  retryable: true,
}

const ERROR_CODE_MAP: Partial<Record<string, Partial<ErrorDisplayInfo>>> = {
  AUTH_UNAUTHORIZED: {
    title: '身份已失效',
    description: '登录状态已过期，请重新登录。',
    retryable: false,
  },
  AUTH_FORBIDDEN: {
    title: '权限不足',
    description: '当前账号暂无访问该功能的权限，如需开通请联系管理员。',
    retryable: false,
  },
  RESOURCE_NOT_FOUND: {
    title: '资源不存在',
    description: '目标资源未找到或已被删除。',
    retryable: false,
  },
  SERVER_ERROR: {
    title: '服务异常',
    description: '服务器繁忙，请稍后重试。',
    retryable: true,
  },
  NETWORK_ERROR: {
    title: '网络连接异常',
    description: '请检查网络后重试，或切换网络环境。',
    level: 'warning',
    retryable: true,
  },
  INVALID_RESPONSE: {
    title: '数据解析失败',
    description: '返回数据格式不符合预期，请稍后重试。',
    retryable: true,
  },
  UPLOAD_ERROR: {
    title: '上传失败',
    description: '文件上传失败，请检查网络或文件大小后重试。',
    retryable: true,
  },
}

const STATUS_CODE_MAP: Array<{
  match: (status?: number) => boolean
  info: Partial<ErrorDisplayInfo>
}> = [
  {
    match: (status) => status === 400 || status === 422,
    info: {
      title: '参数校验失败',
      description: '请检查输入内容是否完整或符合规范。',
      level: 'warning',
      retryable: false,
    },
  },
  {
    match: (status) => status === 404,
    info: {
      title: '资源不存在',
      description: '目标资源未找到或已处理。',
      retryable: false,
    },
  },
  {
    match: (status) => status === 429,
    info: {
      title: '请求过于频繁',
      description: '操作频率过高，请稍后重试。',
      level: 'warning',
      retryable: true,
    },
  },
  {
    match: (status) => !!status && status >= 500,
    info: {
      title: '服务暂不可用',
      description: '后端服务出现异常，已记录日志。',
      retryable: true,
    },
  },
]

/**
 * 将接口错误转换为统一提示描述。
 */
export const mapErrorToDisplayInfo = (error: ErrorContext): ErrorDisplayInfo => {
  const codeOverride = ERROR_CODE_MAP[error.code] ?? null
  const statusOverride = STATUS_CODE_MAP.find((item) => item.match(error.statusCode))?.info ?? null

  const merged: ErrorDisplayInfo = {
    ...DEFAULT_DISPLAY,
    ...(statusOverride ?? {}),
    ...(codeOverride ?? {}),
  }

  return {
    ...merged,
    description:
      (codeOverride?.description ?? statusOverride?.description ?? error.message) ||
      merged.description,
  }
}
