/**
 * useAsyncState hook unit tests
 * Covers: execute flow, timeout, retry, reset clears timers, immediate mode, manual setters.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, jest, test, afterEach } from '@jest/globals'

import { useAsyncState } from '../useAsyncState'

afterEach(() => {
  jest.restoreAllMocks()
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

/**
 * Execute a hook function that is expected to reject.
 * We must not await the rejection inside act() because React may not flush
 * state updates when act() itself rejects. Instead, we let the promise
 * reject separately and then use waitFor to observe the state change.
 */
async function executeAndExpectRejection(result: {
  current: { execute: (...args: unknown[]) => Promise<unknown> }
}): Promise<void> {
  let rejectionCaught = false

  const p = result.current.execute()
  // Use setImmediate-like pattern to let microtasks flush
  await act(async () => {
    try {
      await p
    } catch {
      rejectionCaught = true
    }
  })
  if (!rejectionCaught) {
    throw new Error('Expected execute to reject, but it resolved')
  }
}

// ---------------------------------------------------------------------------
// Basic execute flow
// ---------------------------------------------------------------------------

describe('useAsyncState: basic execute flow', () => {
  test('executes async function and sets data on success', async () => {
    const asyncFn = jest.fn<(...args: unknown[]) => Promise<string>>().mockResolvedValue('ok')

    const { result } = renderHook(() => useAsyncState(asyncFn))

    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasExecuted).toBe(false)

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.data).toBe('ok')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.hasExecuted).toBe(true)
    expect(result.current.executeCount).toBe(1)
  })

  test('passes arguments to the async function', async () => {
    const asyncFn = jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(99)

    const { result } = renderHook(() => useAsyncState(asyncFn))

    await act(async () => {
      await result.current.execute('a', 'b')
    })

    expect(asyncFn).toHaveBeenCalledWith('a', 'b')
    expect(result.current.data).toBe(99)
  })

  test('increments executeCount on each call', async () => {
    const asyncFn = jest.fn<() => Promise<number>>().mockResolvedValue(1)

    const { result } = renderHook(() => useAsyncState(asyncFn))

    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.executeCount).toBe(1)

    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.executeCount).toBe(2)
  })

  test('calls onSuccess callback on success', async () => {
    const onSuccess = jest.fn<(data: string) => void>()
    const asyncFn = jest.fn<() => Promise<string>>().mockResolvedValue('success-data')

    const { result } = renderHook(() => useAsyncState(asyncFn, { onSuccess }))

    await act(async () => {
      await result.current.execute()
    })

    expect(onSuccess).toHaveBeenCalledWith('success-data')
  })

  test('calls onFinally callback on both success and failure', async () => {
    const onFinally = jest.fn<() => void>()
    const asyncFn = jest
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new Error('fail'))

    const { result } = renderHook(() => useAsyncState(asyncFn, { onFinally }))

    await act(async () => {
      await result.current.execute()
    })
    expect(onFinally).toHaveBeenCalledTimes(1)

    await executeAndExpectRejection(result)
    expect(onFinally).toHaveBeenCalledTimes(2)
  })

  test('sets error state on failure and clears loading', async () => {
    const asyncFn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useAsyncState(asyncFn))

    await executeAndExpectRejection(result)

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('boom')
    expect(result.current.isLoading).toBe(false)
  })

  test('calls onError callback on failure', async () => {
    const onError = jest.fn<(error: Error) => void>()
    const asyncFn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('err'))

    const { result } = renderHook(() => useAsyncState(asyncFn, { onError }))

    await executeAndExpectRejection(result)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].message).toBe('err')
  })
})

// ---------------------------------------------------------------------------
// Timeout functionality
// ---------------------------------------------------------------------------

describe('useAsyncState: timeout', () => {
  test('rejects with timeout error when async function exceeds timeout', async () => {
    jest.useFakeTimers()

    const deferred = createDeferred<string>()
    const asyncFn = jest.fn<() => Promise<string>>().mockReturnValue(deferred.promise)

    const { result } = renderHook(() => useAsyncState(asyncFn, { timeout: 2000 }))

    // Start execution
    const p = result.current.execute()

    // Advance past the timeout
    act(() => {
      jest.advanceTimersByTime(2500)
    })

    // Catch the rejection and let React flush state
    await act(async () => {
      try {
        await p
      } catch {
        // timeout rejection expected
      }
    })

    expect(result.current.error?.message).toContain('操作超时')

    jest.useRealTimers()
  })

  test('clears timeout timer when async function resolves before timeout', async () => {
    jest.useFakeTimers()

    const asyncFn = jest.fn<() => Promise<string>>().mockResolvedValue('fast')

    const { result } = renderHook(() => useAsyncState(asyncFn, { timeout: 5000 }))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.data).toBe('fast')
    expect(result.current.error).toBeNull()

    // Advance past timeout -- no error since timer was cleared on success
    act(() => {
      jest.advanceTimersByTime(6000)
    })

    expect(result.current.error).toBeNull()

    jest.useRealTimers()
  })
})

// ---------------------------------------------------------------------------
// Retry logic (using real timers with short delays)
// ---------------------------------------------------------------------------

describe('useAsyncState: retry', () => {
  test('retries the specified number of times before failing', async () => {
    const asyncFn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('retry-fail'))

    const { result } = renderHook(() => useAsyncState(asyncFn, { retryCount: 1, retryDelay: 10 }))

    await executeAndExpectRejection(result)

    // Initial call + 1 retry = 2 total calls
    expect(asyncFn).toHaveBeenCalledTimes(2)
    expect(result.current.error?.message).toBe('retry-fail')
  })

  test('succeeds on retry after initial failure', async () => {
    const asyncFn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('first-fail'))
      .mockResolvedValue('retried-ok')

    const { result } = renderHook(() => useAsyncState(asyncFn, { retryCount: 2, retryDelay: 10 }))

    const res = await act(async () => {
      return result.current.execute()
    })

    expect(res).toBe('retried-ok')
    expect(result.current.data).toBe('retried-ok')
    expect(asyncFn).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// Reset clears timeout timer (memory leak fix)
// ---------------------------------------------------------------------------

describe('useAsyncState: reset clears timers', () => {
  test('reset clears the timeout timer', async () => {
    jest.useFakeTimers()

    const deferred = createDeferred<string>()
    const asyncFn = jest.fn<() => Promise<string>>().mockReturnValue(deferred.promise)

    const { result } = renderHook(() => useAsyncState(asyncFn, { timeout: 5000 }))

    // Start execution (will set timeout)
    act(() => {
      void result.current.execute()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    // Reset while request is still pending
    act(() => {
      result.current.reset()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasExecuted).toBe(false)

    // Advance past timeout -- no error since timer was cleared
    act(() => {
      jest.advanceTimersByTime(6000)
    })

    expect(result.current.error).toBeNull()

    jest.useRealTimers()
  })

  test('reset restores initialData', async () => {
    const asyncFn = jest.fn<() => Promise<string>>().mockResolvedValue('new')

    const { result } = renderHook(() => useAsyncState(asyncFn, { initialData: 'init' }))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.data).toBe('new')

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBe('init')
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.executeCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Immediate mode
// ---------------------------------------------------------------------------

describe('useAsyncState: immediate mode', () => {
  test('executes automatically when immediate is true', async () => {
    const asyncFn = jest.fn<() => Promise<string>>().mockResolvedValue('auto')

    const { result } = renderHook(() => useAsyncState(asyncFn, { immediate: true }))

    await waitFor(() => {
      expect(result.current.data).toBe('auto')
    })

    expect(asyncFn).toHaveBeenCalledTimes(1)
    expect(result.current.hasExecuted).toBe(true)
  })

  test('does not execute when immediate is false', () => {
    const asyncFn = jest.fn<() => Promise<string>>().mockResolvedValue('no-auto')

    const { result } = renderHook(() => useAsyncState(asyncFn, { immediate: false }))

    expect(asyncFn).not.toHaveBeenCalled()
    expect(result.current.hasExecuted).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Manual setters
// ---------------------------------------------------------------------------

describe('useAsyncState: manual setters', () => {
  test('setLoading updates isLoading state', () => {
    const asyncFn = jest.fn<() => Promise<string>>().mockResolvedValue('x')

    const { result } = renderHook(() => useAsyncState(asyncFn))

    act(() => {
      result.current.setLoading(true)
    })
    expect(result.current.isLoading).toBe(true)

    act(() => {
      result.current.setLoading(false)
    })
    expect(result.current.isLoading).toBe(false)
  })

  test('setError updates error state', () => {
    const asyncFn = jest.fn<() => Promise<string>>().mockResolvedValue('x')

    const { result } = renderHook(() => useAsyncState(asyncFn))

    const err = new Error('manual error')
    act(() => {
      result.current.setError(err)
    })
    expect(result.current.error).toBe(err)

    act(() => {
      result.current.setError(null)
    })
    expect(result.current.error).toBeNull()
  })

  test('setData updates data state', () => {
    const asyncFn = jest.fn<() => Promise<string>>().mockResolvedValue('x')

    const { result } = renderHook(() => useAsyncState(asyncFn))

    act(() => {
      result.current.setData('manual-data')
    })
    expect(result.current.data).toBe('manual-data')

    act(() => {
      result.current.setData(undefined)
    })
    expect(result.current.data).toBeUndefined()
  })
})
