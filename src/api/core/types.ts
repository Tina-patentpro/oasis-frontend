import type { ResponseValidator } from '../validation'

export type SuccessEnvelope<T> = { success: true; data: T }
export type ErrorEnvelope = {
  success: false
  error: { code: string; message: string; details?: unknown }
}

export interface RetryOptions {
  retries?: number
  backoffMs?: number
  maxBackoffMs?: number
  retryOn?: Array<number | 'network'>
}

export type RequestProfile = 'interactive' | 'background'

export interface ApiRequestOptions<T> extends RequestInit {
  validator?: ResponseValidator<T>
  retry?: RetryOptions
  timeoutMs?: number
  requestProfile?: RequestProfile
}

