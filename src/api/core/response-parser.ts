import { ApiError } from '../errors'
import type { ResponseValidator } from '../validation'

import {
  isCodeDataResponse,
  isDetailErrorResponse,
  isErrorEnvelope,
  isSuccessEnvelope,
} from './response-guards'

function isAcceptedCode(code: unknown): boolean {
  if (code === 200 || code === 0) {
    return true
  }

  if (typeof code === 'string' && code.trim()) {
    const parsed = Number(code)
    return parsed === 200 || parsed === 0
  }

  return false
}

export async function parseResponse<T>(
  response: Response,
  validator?: ResponseValidator<T>,
): Promise<T> {
  const status = response.status

  if (status === 204 || status === 205) {
    return undefined as T
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  const isJson = contentType.includes('application/json')

  if (!isJson) {
    const text = await response.text()
    return validator ? validator(text) : (text as unknown as T)
  }

  const text = await response.text()
  if (!text.trim()) {
    return undefined as T
  }

  let payload: unknown
  try {
    payload = JSON.parse(text) as unknown
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : '响应解析失败',
      'INVALID_RESPONSE',
      status,
    )
  }

  if (isErrorEnvelope(payload)) {
    throw new ApiError(payload.error.message, payload.error.code, status, payload.error.details)
  }

  if (isDetailErrorResponse(payload)) {
    // 特殊情况：如果是正在异步生成中（通常是404或轮询），暂且抛出作为提示，让外层机制处理；如果是执行失败，则抛出错误
    throw new ApiError(payload.detail, 'API_ERROR', status)
  }

  let data: unknown
  if (isCodeDataResponse<T>(payload)) {
    if (!isAcceptedCode(payload.code)) {
      const errorMessage = payload.message || payload.msg || 'API Error'
      throw new ApiError(errorMessage, 'API_ERROR', status)
    }
    data = payload.data
  } else if (isSuccessEnvelope<T>(payload)) {
    data = payload.data
  } else {
    data = payload
  }

  if (validator) {
    try {
      return validator(data as T)
    } catch (error) {
      throw new ApiError('响应数据校验失败', 'VALIDATION_ERROR', undefined, error)
    }
  }

  return data as T
}
