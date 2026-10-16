let unauthorizedHandlingPromise: Promise<void> | null = null
type UnauthorizedHandler = (reason: string) => void | Promise<void>
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): () => void {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null
    }
  }
}

/**
 * 统一处理 401 未授权状态。
 * 后端不支持 refresh token，前端遇到 401 时应直接走强制登出链路。
 */
export async function handleUnauthorized(reason = '登录状态已过期，请重新登录'): Promise<void> {
  if (unauthorizedHandlingPromise) {
    return unauthorizedHandlingPromise
  }

  unauthorizedHandlingPromise = (async () => {
    try {
      await unauthorizedHandler?.(reason)
    } catch (error) {
      // 未授权处理失败时不阻断上层错误抛出，避免请求链路悬挂
      console.error('[apiClient] 无法触发强制登出', error)
    }
  })().finally(() => {
    unauthorizedHandlingPromise = null
  })

  return unauthorizedHandlingPromise
}
