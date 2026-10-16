/**
 * useAPI hook unit tests
 * Covers: execute success, error handling, reset, ref-based pattern for stable identity.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, jest, test, afterEach } from '@jest/globals'

jest.mock('@/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode?: number,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

import { ApiError } from '@/api'

import { useAPI } from '../useAPI'

afterEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// ---------------------------------------------------------------------------
// Execute flow (success)
// ---------------------------------------------------------------------------

describe('useAPI: execute success flow', () => {
  test('returns data and clears loading on success', async () => {
    const apiFn = jest.fn<(id: number) => Promise<string>>().mockResolvedValue('result-data')

    const { result } = renderHook(() => useAPI(apiFn))

    // Initial state
    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()

    let executeResult: string | null = null
    await act(async () => {
      executeResult = await result.current.execute(42)
    })

    expect(executeResult).toBe('result-data')
    expect(result.current.data).toBe('result-data')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(apiFn).toHaveBeenCalledWith(42)
  })

  test('calls onSuccess callback with data', async () => {
    const onSuccess = jest.fn<(data: string) => void>()
    const apiFn = jest.fn<() => Promise<string>>().mockResolvedValue('hello')

    const { result } = renderHook(() => useAPI(apiFn, { onSuccess }))

    await act(async () => {
      await result.current.execute()
    })

    expect(onSuccess).toHaveBeenCalledWith('hello')
  })

  test('sets isLoading to true during execution and false after', async () => {
    const deferred = createDeferred<string>()
    const apiFn = jest.fn<() => Promise<string>>().mockReturnValue(deferred.promise)

    const { result } = renderHook(() => useAPI(apiFn))

    act(() => {
      void result.current.execute()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    await act(async () => {
      deferred.resolve('done')
    })

    expect(result.current.isLoading).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('useAPI: error handling', () => {
  test('stores ApiError when the API function rejects with an ApiError', async () => {
    const apiError = new ApiError('bad request', 'ERR_BAD', 400)
    const apiFn = jest.fn<() => Promise<string>>().mockRejectedValue(apiError)

    const { result } = renderHook(() => useAPI(apiFn))

    let executeResult: string | null = 'not-null'
    await act(async () => {
      executeResult = await result.current.execute()
    })

    expect(executeResult).toBeNull()
    expect(result.current.error).toBe(apiError)
    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  test('wraps non-ApiError rejection into a generic Error', async () => {
    const apiFn = jest.fn<() => Promise<string>>().mockRejectedValue('string-error')

    const { result } = renderHook(() => useAPI(apiFn))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('string-error')
  })

  test('calls onError callback with the error', async () => {
    const onError = jest.fn<(error: Error) => void>()
    const apiError = new ApiError('api-fail', 'ERR_CODE', 500)
    const apiFn = jest.fn<() => Promise<string>>().mockRejectedValue(apiError)

    const { result } = renderHook(() => useAPI(apiFn, { onError }))

    await act(async () => {
      await result.current.execute()
    })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBe(apiError)
    expect(onError.mock.calls[0][0].message).toBe('api-fail')
  })

  test('clears previous error on new execute call', async () => {
    const apiFn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('first-fail'))
      .mockResolvedValueOnce('ok')

    const { result } = renderHook(() => useAPI(apiFn))

    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.error).not.toBeNull()

    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe('ok')
  })
})

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe('useAPI: reset', () => {
  test('clears data, error, and loading after reset', async () => {
    const apiFn = jest.fn<() => Promise<string>>().mockResolvedValue('data')

    const { result } = renderHook(() => useAPI(apiFn))

    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.data).toBe('data')

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  test('restores initialData after reset when initialData was provided', () => {
    const apiFn = jest.fn<() => Promise<string>>().mockResolvedValue('new-data')

    const { result } = renderHook(() => useAPI(apiFn, { initialData: 'initial' }))

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBe('initial')
  })
})

// ---------------------------------------------------------------------------
// Ref-based pattern prevents infinite re-renders
// ---------------------------------------------------------------------------

describe('useAPI: ref-based callback stability', () => {
  test('onSuccess callback ref updates without recreating execute', () => {
    const apiFn = jest.fn<() => Promise<string>>().mockResolvedValue('data')
    const onSuccess1 = jest.fn<(data: string) => void>()
    const onSuccess2 = jest.fn<(data: string) => void>()

    const { result, rerender } = renderHook(({ onSuccess }) => useAPI(apiFn, { onSuccess }), {
      initialProps: { onSuccess: onSuccess1 },
    })

    const executeBefore = result.current.execute

    // Re-render with a different onSuccess callback reference
    rerender({ onSuccess: onSuccess2 })

    // execute reference stays stable because it only depends on apiFunction
    expect(result.current.execute).toBe(executeBefore)
  })

  test('onError callback ref updates without recreating execute', () => {
    const apiFn = jest.fn<() => Promise<string>>().mockResolvedValue('data')
    const onError1 = jest.fn<(error: Error) => void>()
    const onError2 = jest.fn<(error: Error) => void>()

    const { result, rerender } = renderHook(({ onError }) => useAPI(apiFn, { onError }), {
      initialProps: { onError: onError1 },
    })

    const executeBefore = result.current.execute

    rerender({ onError: onError2 })

    expect(result.current.execute).toBe(executeBefore)
  })

  test('uses latest onSuccess ref when execute resolves', async () => {
    const deferred = createDeferred<string>()
    const apiFn = jest.fn<() => Promise<string>>().mockReturnValue(deferred.promise)
    const onSuccess1 = jest.fn<(data: string) => void>()
    const onSuccess2 = jest.fn<(data: string) => void>()

    const { result, rerender } = renderHook(({ onSuccess }) => useAPI(apiFn, { onSuccess }), {
      initialProps: { onSuccess: onSuccess1 },
    })

    // Start execution
    act(() => {
      void result.current.execute()
    })

    // Swap callback while request is in-flight
    rerender({ onSuccess: onSuccess2 })

    // Resolve the promise
    await act(async () => {
      deferred.resolve('result')
    })

    // The latest callback (onSuccess2) should have been invoked
    expect(onSuccess1).not.toHaveBeenCalled()
    expect(onSuccess2).toHaveBeenCalledWith('result')
  })
})
