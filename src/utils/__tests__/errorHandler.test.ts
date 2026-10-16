import { describe, expect, test, jest } from '@jest/globals'

jest.mock('@/api/errors', () => {
  const actual = jest.requireActual<typeof import('@/api/errors')>('@/api/errors')
  return {
    ...actual,
    isApiError: jest.fn(),
  }
})

jest.mock('@/modules/workspace/errors/recovery-model', () => ({
  resolveRecoveryAction: jest.fn(),
}))

import { isApiError } from '@/api/errors'
import { resolveRecoveryAction } from '@/modules/workspace/errors/recovery-model'

import {
  getErrorMessage,
  isNetworkError,
  isAuthError,
  isValidationError,
  isServerError,
  resolveRecoveryActionFromError,
  logError,
  retryAsync,
  withErrorHandler,
} from '../errorHandler'

// --- getErrorMessage ---

describe('getErrorMessage', () => {
  test('returns message from ApiError', () => {
    jest.mocked(isApiError).mockReturnValue(true)
    const error = { message: 'API错误' } as any
    expect(getErrorMessage(error)).toBe('API错误')
  })

  test('returns fallback message when ApiError has no message', () => {
    jest.mocked(isApiError).mockReturnValue(true)
    const error = {} as any
    expect(getErrorMessage(error)).toBe('请求失败，请稍后重试。')
  })

  test('returns message from standard Error', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    expect(getErrorMessage(new Error('标准错误'))).toBe('标准错误')
  })

  test('returns string directly', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    expect(getErrorMessage('字符串错误')).toBe('字符串错误')
  })

  test('returns default message for unknown type', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    expect(getErrorMessage(123)).toBe('发生未知错误，请稍后重试。')
    expect(getErrorMessage(null)).toBe('发生未知错误，请稍后重试。')
    expect(getErrorMessage(undefined)).toBe('发生未知错误，请稍后重试。')
  })

  test('uses a caller-specific fallback message for unknown type', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    expect(getErrorMessage(undefined, '上传失败')).toBe('上传失败')
  })
})

// --- isNetworkError ---

describe('isNetworkError', () => {
  test('delegates to ApiError.isNetworkError()', () => {
    jest.mocked(isApiError).mockReturnValue(true)
    const error = { isNetworkError: () => true } as any
    expect(isNetworkError(error)).toBe(true)
  })

  test('detects network keywords in Error message', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    expect(isNetworkError(new Error('Network error'))).toBe(true)
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true)
    expect(isNetworkError(new Error('Request timeout'))).toBe(true)
  })

  test('returns false for non-network errors', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    expect(isNetworkError(new Error('Something else'))).toBe(false)
    expect(isNetworkError('string')).toBe(false)
    expect(isNetworkError(42)).toBe(false)
  })
})

// --- isAuthError ---

describe('isAuthError', () => {
  test('delegates to ApiError.isAuthError()', () => {
    jest.mocked(isApiError).mockReturnValue(true)
    const error = { isAuthError: () => true } as any
    expect(isAuthError(error)).toBe(true)
  })

  test('returns false for non-ApiError', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    expect(isAuthError(new Error('Unauthorized'))).toBe(false)
  })
})

// --- isValidationError ---

describe('isValidationError', () => {
  test('delegates to ApiError.isValidationError()', () => {
    jest.mocked(isApiError).mockReturnValue(true)
    const error = { isValidationError: () => true } as any
    expect(isValidationError(error)).toBe(true)
  })

  test('returns false for non-ApiError', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    expect(isValidationError(new Error('Invalid'))).toBe(false)
  })
})

// --- isServerError ---

describe('isServerError', () => {
  test('delegates to ApiError.isServerError()', () => {
    jest.mocked(isApiError).mockReturnValue(true)
    const error = { isServerError: () => true } as any
    expect(isServerError(error)).toBe(true)
  })

  test('returns false for non-ApiError', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    expect(isServerError(new Error('Internal'))).toBe(false)
  })
})

// --- resolveRecoveryActionFromError ---

describe('resolveRecoveryActionFromError', () => {
  test('delegates to resolveRecoveryAction for ApiError', () => {
    jest.mocked(isApiError).mockReturnValue(true)
    jest.mocked(resolveRecoveryAction).mockReturnValue('retry')
    const error = { statusCode: 500, code: 'TIMEOUT' } as any
    expect(resolveRecoveryActionFromError(error)).toBe('retry')
    expect(resolveRecoveryAction).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'TIMEOUT',
    })
  })

  test('returns retry for network error', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    // isNetworkError will also return false since isApiError is false
    // but the error message contains 'fetch' which isNetworkError checks
    const error = new Error('Failed to fetch')
    expect(resolveRecoveryActionFromError(error)).toBe('retry')
  })

  test('calls resolveRecoveryAction with empty object for unknown error', () => {
    jest.mocked(isApiError).mockReturnValue(false)
    jest.mocked(resolveRecoveryAction).mockReturnValue('relogin')
    expect(resolveRecoveryActionFromError(new Error('unknown'))).toBe('relogin')
    expect(resolveRecoveryAction).toHaveBeenCalledWith({})
  })
})

// --- logError ---

describe('logError', () => {
  test('logs error with timestamp and context', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    logError(new Error('test error'), 'TestContext')
    expect(spy).toHaveBeenCalled()
    const call = spy.mock.calls[0]
    expect(call[0]).toContain('[TestContext]')
    expect(call[0]).toContain('test error')
    spy.mockRestore()
  })

  test('logs error without context', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    logError(new Error('no context'))
    expect(spy).toHaveBeenCalled()
    const call = spy.mock.calls[0]
    expect(call[0]).not.toContain('[]')
    expect(call[0]).toContain('no context')
    spy.mockRestore()
  })
})

// --- retryAsync ---

describe('retryAsync', () => {
  test('succeeds on first attempt', async () => {
    const fn = jest.fn<() => Promise<string>>().mockResolvedValue('ok')
    const result = await retryAsync(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('retries and succeeds on second attempt', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok')
    const result = await retryAsync(fn, { retryDelay: 0 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('throws after max retries exhausted', async () => {
    const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('always fail'))
    await expect(retryAsync(fn, { maxRetries: 2, retryDelay: 0 })).rejects.toThrow('always fail')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  test('calls onRetry callback', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok')
    const onRetry = jest.fn<(attempt: number, error: Error) => void>()
    await retryAsync(fn, { retryDelay: 0, onRetry })
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })
})

// --- withErrorHandler ---

describe('withErrorHandler', () => {
  test('passes through successful result', async () => {
    const fn = jest.fn<(a: string, b: string) => Promise<string>>().mockResolvedValue('success')
    const wrapped = withErrorHandler(fn)
    const result = await wrapped('arg1', 'arg2')
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  test('calls onError and rethrows Error', async () => {
    const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('boom'))
    const onError = jest.fn<(error: Error) => void>()
    const wrapped = withErrorHandler(fn, onError)
    await expect(wrapped()).rejects.toThrow('boom')
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  test('wraps non-Error into Error', async () => {
    const fn = jest.fn<() => Promise<string>>().mockRejectedValue('string error')
    const onError = jest.fn<(error: Error) => void>()
    const wrapped = withErrorHandler(fn, onError)
    await expect(wrapped()).rejects.toThrow('string error')
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })
})
