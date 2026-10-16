import { describe, expect, test } from '@jest/globals'

import { resolveSubmitErrorPolicy } from './async-submit-policy'

describe('resolveSubmitErrorPolicy', () => {
  test('keeps polling for gateway timeout regardless of async flag', () => {
    const policy = resolveSubmitErrorPolicy({ statusCode: 504 })
    expect(policy.keepPolling).toBe(true)
    expect(policy.markFailed).toBe(false)
  })

  test('marks failed for non-timeout errors', () => {
    const policy = resolveSubmitErrorPolicy({ statusCode: 500 })
    expect(policy.keepPolling).toBe(false)
    expect(policy.markFailed).toBe(true)
  })
})
