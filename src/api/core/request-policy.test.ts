import { describe, expect, test } from '@jest/globals'

import { resolveRequestPolicy } from './request-policy'

describe('resolveRequestPolicy', () => {
  test('returns strict timeout policy for interactive profile', () => {
    const policy = resolveRequestPolicy({ profile: 'interactive' })
    expect(policy.timeoutMs).toBe(12000)
    expect(policy.retry?.retries).toBe(1)
  })

  test('returns long timeout policy for background profile', () => {
    const policy = resolveRequestPolicy({ profile: 'background' })
    expect(policy.timeoutMs).toBe(30000)
    expect(policy.retry?.retries).toBe(2)
  })

})
