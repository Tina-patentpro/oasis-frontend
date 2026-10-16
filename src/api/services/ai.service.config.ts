import type { RetryOptions } from '@/api/core/types'

/**
 * Async workflow submission should be sent once.
 * Gateway 504 may still mean backend task keeps running.
 */
export const CREATE_WITH_API_RETRY_POLICY: RetryOptions = {
  retries: 0,
  retryOn: ['network'],
}

/**
 * 工作流执行最长等待时间（毫秒）。
 * 同步工作流（is_async=0）在 HTTP 层等待时间不超过此值，需与后端 Nginx
 * proxy_read_timeout 保持一致，避免前端比服务端更早断开连接。
 * 推荐值：300s（5分钟），可按实际工作流最长运行时间调整。
 */
export const CREATE_WITH_API_TIMEOUT_MS = 5 * 60 * 1000 // 300 000 ms
