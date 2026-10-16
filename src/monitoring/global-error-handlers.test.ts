import { describe, expect, jest, test } from '@jest/globals'

import { registerGlobalErrorHandlers } from './global-error-handlers'

describe('global error handlers', () => {
  test('reports unhandled promise rejections with context', () => {
    const addEventListener = jest.fn()
    const removeEventListener = jest.fn()
    const reportError = jest.fn()

    registerGlobalErrorHandlers(reportError, {
      addEventListener,
      removeEventListener,
    })

    const handler = addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'unhandledrejection',
    )?.[1]
    expect(handler).toBeInstanceOf(Function)

    const error = new Error('async failed')
    ;(handler as (event: { reason: unknown }) => void)({ reason: error })

    expect(reportError).toHaveBeenCalledWith(error, {
      extra: {
        reasonType: 'object',
      },
      tags: {
        boundary: 'global',
        errorStage: 'unhandledrejection',
      },
    })
  })

  test('reports synchronous window errors and removes all listeners on cleanup', () => {
    const addEventListener = jest.fn()
    const removeEventListener = jest.fn()
    const reportError = jest.fn()

    const cleanup = registerGlobalErrorHandlers(reportError, {
      addEventListener,
      removeEventListener,
    })

    const errorHandler = addEventListener.mock.calls.find(([eventName]) => eventName === 'error')
      ?.[1]
    expect(errorHandler).toBeInstanceOf(Function)

    const error = new Error('sync failed')
    ;(errorHandler as (event: { error?: Error; message?: string }) => void)({ error })

    expect(reportError).toHaveBeenCalledWith(error, {
      extra: {
        message: undefined,
      },
      tags: {
        boundary: 'global',
        errorStage: 'error',
      },
    })

    cleanup()

    expect(removeEventListener).toHaveBeenCalledWith('error', errorHandler)
    expect(removeEventListener).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    )
  })
})
