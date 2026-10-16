import { describe, expect, test } from '@jest/globals'

import { ApiError } from '../errors'

import { normalizeError } from './error-utils'

describe('normalizeError', () => {
  test('converts fetch transport failures to a user-friendly network error', () => {
    const error = normalizeError(new TypeError('Failed to fetch'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.message).toBe('网络连接失败，请检查网络后重试。')
  })
})
