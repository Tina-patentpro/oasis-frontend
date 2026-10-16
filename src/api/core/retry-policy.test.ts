import { describe, expect, jest, test } from '@jest/globals'

import { ApiError } from '../errors'
import { executeWithRetry, shouldRetry } from './retry-policy'

describe('retry-policy', () => {
  test('classifies retryable network and gateway errors only when configured', () => {
    expect(shouldRetry(new ApiError('offline', 'NETWORK_ERROR'), ['network'])).toBe(true)
    expect(shouldRetry(new ApiError('bad gateway', 'HTTP_ERROR', 502), [502, 503, 504])).toBe(true)
    expect(shouldRetry(new ApiError('server error', 'HTTP_ERROR', 500), [502, 503, 504])).toBe(
      false,
    )
    expect(shouldRetry(new Error('plain error'), ['network', 503])).toBe(false)
  })

  test('retries default network errors and resolves with the successful result', async () => {
    const operation = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError('offline', 'NETWORK_ERROR'))
      .mockResolvedValueOnce('ok')

    await expect(
      executeWithRetry(operation, {
        retries: 1,
        backoffMs: 1,
        maxBackoffMs: 1,
      }),
    ).resolves.toBe('ok')

    expect(operation).toHaveBeenCalledTimes(2)
  })

  test('does not retry status 500 unless the caller explicitly opts in', async () => {
    const error = new ApiError('server error', 'HTTP_ERROR', 500)
    const operation = jest.fn<() => Promise<string>>().mockRejectedValue(error)

    await expect(
      executeWithRetry(operation, {
        retries: 2,
        backoffMs: 1,
        maxBackoffMs: 1,
      }),
    ).rejects.toBe(error)

    expect(operation).toHaveBeenCalledTimes(1)
  })

  test('stops after the configured retry budget is exhausted', async () => {
    const error = new ApiError('service unavailable', 'HTTP_ERROR', 503)
    const operation = jest.fn<() => Promise<string>>().mockRejectedValue(error)

    await expect(
      executeWithRetry(operation, {
        retries: 2,
        backoffMs: 1,
        maxBackoffMs: 1,
      }),
    ).rejects.toBe(error)

    expect(operation).toHaveBeenCalledTimes(3)
  })

  test('does not call the operation when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const operation = jest.fn<() => Promise<string>>().mockResolvedValue('ok')

    await expect(
      executeWithRetry(
        operation,
        {
          retries: 1,
          backoffMs: 1,
          maxBackoffMs: 1,
        },
        controller.signal,
      ),
    ).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Aborted',
    })

    expect(operation).not.toHaveBeenCalled()
  })
})
