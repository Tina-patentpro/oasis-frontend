export type RecoveryAction = 'retry' | 'rollback' | 'relogin' | 'contact_support'

interface RecoveryDescriptor {
  label: string
  hint: string
}

const RECOVERY_DESCRIPTORS: Record<RecoveryAction, RecoveryDescriptor> = {
  retry: {
    label: '重试',
    hint: '请求可能是临时失败，建议重试一次。',
  },
  rollback: {
    label: '回退',
    hint: '当前操作无法完成，建议回退到上一步后重试。',
  },
  relogin: {
    label: '重新登录',
    hint: '登录状态可能已过期，请重新登录后继续。',
  },
  contact_support: {
    label: '联系支持',
    hint: '错误不可恢复，请联系技术支持处理。',
  },
}

export function resolveRecoveryAction(params: {
  statusCode?: number
  code?: string
}): RecoveryAction {
  const { statusCode, code } = params

  if (statusCode === 401 || statusCode === 403 || code === 'AUTH_UNAUTHORIZED') {
    return 'relogin'
  }

  if (statusCode === 408 || statusCode === 429) {
    return 'retry'
  }

  if (typeof statusCode === 'number' && statusCode >= 500) {
    return 'retry'
  }

  if (statusCode === 400 || statusCode === 404 || statusCode === 409 || statusCode === 422) {
    return 'rollback'
  }

  return 'rollback'
}

export function getRecoveryActionDescriptor(action: RecoveryAction): RecoveryDescriptor {
  return RECOVERY_DESCRIPTORS[action]
}
