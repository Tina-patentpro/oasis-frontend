import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import {
  __unsafeResetTokenMemoryForTests,
  clearAccessToken,
  getAccessToken,
  getAccessTokenExpiryAt,
  getAccessTokenRemainingMs,
  setAccessToken,
} from './token-storage'

describe('token-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    __unsafeResetTokenMemoryForTests()
  })

  afterEach(() => {
    clearAccessToken()
    localStorage.clear()
    sessionStorage.clear()
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  test('persists token only in sessionStorage and restores after memory reset', () => {
    setAccessToken('token-123')

    expect(sessionStorage.getItem('auth_access_token_v1')).not.toBeNull()
    expect(localStorage.getItem('auth_access_token_v1')).toBeNull()
    expect(getAccessToken()).toBe('token-123')

    __unsafeResetTokenMemoryForTests()
    expect(getAccessToken()).toBe('token-123')
  })

  test('removes legacy localStorage tokens without migrating them', () => {
    const now = Date.now()
    localStorage.setItem(
      'auth_access_token_v1',
      JSON.stringify({
        version: 1,
        token: 'legacy-token-123',
        issuedAt: now,
        expiresAt: now + 60_000,
        binding: `${navigator.language}|${navigator.userAgent}`,
      }),
    )
    localStorage.setItem('access_token', 'legacy-token-123')

    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem('auth_access_token_v1')).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(sessionStorage.getItem('auth_access_token_v1')).toBeNull()
  })

  test('clears malformed payload from sessionStorage', () => {
    sessionStorage.setItem('auth_access_token_v1', '{"token":""}')

    expect(getAccessToken()).toBeNull()
    expect(sessionStorage.getItem('auth_access_token_v1')).toBeNull()
  })

  test('expires persisted token after one-hour ttl', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-15T00:00:00.000Z'))

    setAccessToken('token-123')
    __unsafeResetTokenMemoryForTests()

    jest.setSystemTime(new Date('2026-02-15T01:00:01.000Z'))
    expect(getAccessToken()).toBeNull()
    expect(sessionStorage.getItem('auth_access_token_v1')).toBeNull()
  })

  test('keeps token valid within one-hour window', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-15T00:00:00.000Z'))

    setAccessToken('token-123')
    __unsafeResetTokenMemoryForTests()

    jest.setSystemTime(new Date('2026-02-15T00:59:59.000Z'))
    expect(getAccessToken()).toBe('token-123')
    expect(sessionStorage.getItem('auth_access_token_v1')).not.toBeNull()
  })

  test('does not extend expiry when the same token is set repeatedly', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-15T00:00:00.000Z'))

    setAccessToken('token-123')
    const initialExpiry = getAccessTokenExpiryAt()

    jest.setSystemTime(new Date('2026-02-15T00:30:00.000Z'))
    setAccessToken('token-123')

    expect(getAccessTokenExpiryAt()).toBe(initialExpiry)
  })

  test('returns expiry metadata when token exists', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-15T00:00:00.000Z'))

    setAccessToken('token-123')

    expect(getAccessTokenExpiryAt()).toBe(Date.parse('2026-02-15T01:00:00.000Z'))
    expect(getAccessTokenRemainingMs()).toBe(60 * 60 * 1000)
  })

  test('returns null expiry metadata when token is expired', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-15T00:00:00.000Z'))

    setAccessToken('token-123')
    __unsafeResetTokenMemoryForTests()

    jest.setSystemTime(new Date('2026-02-15T01:00:01.000Z'))
    expect(getAccessTokenExpiryAt()).toBeNull()
    expect(getAccessTokenRemainingMs()).toBeNull()
  })

  test('falls back to memory token when sessionStorage write is blocked', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key) {
      if (this === sessionStorage && key === 'auth_access_token_v1') {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      }
    })

    expect(() => setAccessToken('token-123')).not.toThrow()
    expect(getAccessToken()).toBe('token-123')
    expect(localStorage.getItem('auth_access_token_v1')).toBeNull()
  })
})
