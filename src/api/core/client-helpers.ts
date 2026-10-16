import { ApiError } from '../errors'
import { isRecord, type ResponseValidator } from '../validation'

import { getErrorStatus, normalizeError } from './error-utils'
import { isTimeoutAbort, mergeAbortSignals, withTimeoutAbort } from './request-timeout'
import { resolveRequestPolicy } from './request-policy'
import { executeWithRetry } from './retry-policy'
import { isDetailErrorResponse, isErrorEnvelope } from './response-guards'
import { parseResponse } from './response-parser'
import { clearAccessToken, getAccessToken } from './token-storage'
import type { ApiRequestOptions } from './types'
import { getClientApp } from './client-app-env'
import { handleUnauthorized } from './auth-refresh'

function sanitizeErrorMessage(message: string): string {
  // Remove file paths
  let sanitized = message.replace(/\/[a-zA-Z0-9_/.-]+\.(ts|js|py|go|java)/g, '[path]')
  // Remove SQL-related content
  sanitized = sanitized.replace(
    /(?:SELECT|INSERT|UPDATE|DELETE|DROP).*?(?:FROM|INTO|SET|WHERE|TABLE).*/gi,
    '[query]',
  )
  // Remove stack trace patterns
  sanitized = sanitized.replace(/at\s+\w+\s+\(.*?\)/g, '[stack]')
  // Truncate if too long
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...'
  }
  return sanitized
}

const extractDetailValue = (errorData: unknown): unknown => {
  if (!isRecord(errorData) || !Object.prototype.hasOwnProperty.call(errorData, 'detail')) {
    return undefined
  }
  return errorData['detail']
}

const resolveDetailMessage = (detail: unknown, fallbackMessage: string): string => {
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail
  }

  if (Array.isArray(detail)) {
    const firstDetail = detail.find(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    )
    if (firstDetail) {
      const msg = typeof firstDetail['msg'] === 'string' ? firstDetail['msg'] : undefined
      const loc = Array.isArray(firstDetail['loc'])
        ? firstDetail['loc']
            .map((segment) => String(segment))
            .filter((segment) => segment.trim().length > 0)
            .join('.')
        : ''
      if (msg && loc) {
        return `${msg} (${loc})`
      }
      if (msg) {
        return msg
      }
    }
  }

  if (isRecord(detail)) {
    if (typeof detail['message'] === 'string' && detail['message'].trim().length > 0) {
      return detail['message']
    }
    if (typeof detail['msg'] === 'string' && detail['msg'].trim().length > 0) {
      return detail['msg']
    }
    if (typeof detail['error'] === 'string' && detail['error'].trim().length > 0) {
      return detail['error']
    }
  }

  return fallbackMessage
}

export function buildQueryString(params: unknown): string {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return ''
  }

  const searchParams = new URLSearchParams()

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    if (Array.isArray(value)) {
      const filtered = value.filter((item) => item !== undefined && item !== null)
      if (filtered.length > 0) {
        searchParams.set(key, filtered.map(String).join(','))
      }
      return
    }

    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export async function performRequest<T>(params: {
  baseURL: string
  endpoint: string
  options?: ApiRequestOptions<T>
  clearToken: () => void
  onUnauthorized: () => Promise<void>
}): Promise<T> {
  const { baseURL, endpoint, options = {}, clearToken, onUnauthorized } = params
  const { validator, retry, timeoutMs, requestProfile, ...fetchOptions } = options

  const policy = requestProfile ? resolveRequestPolicy({ profile: requestProfile }) : undefined
  const effectiveTimeout = timeoutMs ?? policy?.timeoutMs
  const effectiveRetry = retry ?? policy?.retry

  const clientApp = getClientApp()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Client-App': clientApp,
    ...fetchOptions.headers,
  }

  const token = getAccessToken()
  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const url = `${baseURL}${endpoint}`
  const runFetch = async (): Promise<T> => {
    const timeoutAbort = withTimeoutAbort(effectiveTimeout)
    const mergedSignal = mergeAbortSignals(fetchOptions.signal ?? undefined, timeoutAbort.signal)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: mergedSignal,
      })

      if (!response.ok) {
        let errorData: unknown
        try {
          errorData = await response.json()
        } catch {
          // ignore parse error
        }

        if (isErrorEnvelope(errorData)) {
          throw new ApiError(
            sanitizeErrorMessage(errorData.error.message),
            errorData.error.code,
            response.status,
            errorData.error.details,
          )
        }

        if (isDetailErrorResponse(errorData)) {
          throw new ApiError(sanitizeErrorMessage(errorData.detail), 'HTTP_ERROR', response.status)
        }

        const detail = extractDetailValue(errorData)
        if (detail !== undefined) {
          throw new ApiError(
            sanitizeErrorMessage(resolveDetailMessage(detail, `HTTP Error ${response.status}`)),
            'HTTP_ERROR',
            response.status,
            detail,
          )
        }

        throw new ApiError(
          `HTTP Error ${response.status}`,
          'HTTP_ERROR',
          response.status,
          errorData,
        )
      }

      return await parseResponse<T>(response, validator)
    } catch (error) {
      if (isTimeoutAbort(timeoutAbort.signal)) {
        throw new ApiError('Request timeout', 'REQUEST_TIMEOUT')
      }
      throw normalizeError(error)
    } finally {
      timeoutAbort.clear()
    }
  }

  try {
    return await executeWithRetry(runFetch, effectiveRetry, fetchOptions.signal ?? undefined)
  } catch (error) {
    if (getErrorStatus(error) === 401) {
      clearToken()
      await onUnauthorized()
      throw new ApiError('未授权，请重新登录', 'AUTH_UNAUTHORIZED', 401)
    }
    throw normalizeError(error)
  }
}

export async function uploadFileRequest<T>(params: {
  baseURL: string
  endpoint: string
  formData: FormData
  validator?: ResponseValidator<T>
  signal?: AbortSignal
}): Promise<T> {
  const { baseURL, endpoint, formData, validator, signal } = params
  const url = `${baseURL}${endpoint}`
  const token = getAccessToken()

  const runUpload = async (): Promise<T> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: formData,
      signal,
    })

    if (!response.ok) {
      let errorData: unknown
      try {
        errorData = await response.json()
      } catch {
        // ignore
      }

      if (isErrorEnvelope(errorData)) {
        throw new ApiError(
          sanitizeErrorMessage(errorData.error.message),
          errorData.error.code,
          response.status,
          errorData.error.details,
        )
      }

      // 处理 {"detail": "..."} 格式的报错（如上传限制）
      if (isDetailErrorResponse(errorData)) {
        throw new ApiError(
          sanitizeErrorMessage(errorData.detail),
          'UPLOAD_RESTRICTED',
          response.status,
        )
      }

      const detail = extractDetailValue(errorData)
      if (detail !== undefined) {
        throw new ApiError(
          sanitizeErrorMessage(resolveDetailMessage(detail, `HTTP Error ${response.status}`)),
          'HTTP_ERROR',
          response.status,
          detail,
        )
      }

      throw new ApiError(`HTTP Error ${response.status}`, 'HTTP_ERROR', response.status, errorData)
    }

    return await parseResponse<T>(response, validator)
  }

  try {
    return await runUpload()
  } catch (error) {
    if (getErrorStatus(error) === 401) {
      // 触发未授权处理
      clearAccessToken()
      await handleUnauthorized()
      throw new ApiError('登录过期，请重新登录', 'AUTH_UNAUTHORIZED', 401)
    }

    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(error instanceof Error ? error.message : '文件上传失败', 'UPLOAD_ERROR')
  }
}
