/**
 * AuthService unit tests
 * Covers: loginWithSms, loginWithPassword, login dispatch, sendSmsCode,
 *         storeTokens / clearTokens, getCurrentUser, isAuthenticated.
 */
import { describe, expect, jest, test, beforeEach, afterEach } from '@jest/globals'

import type { AuthResponse, SmsLoginRequest, PasswordLoginRequest } from '@/types/api'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>()
const mockSetToken = jest.fn<(token: string) => void>()
const mockClearToken = jest.fn<() => void>()

jest.mock('@/api/client', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    setToken: (token: string) => mockSetToken(token),
    clearToken: () => mockClearToken(),
  },
}))

jest.mock('@/api/core/token-storage', () => ({
  getAccessToken: jest.fn<() => string | null>(() => 'stored-mock-token'),
}))

// Import after mocks
import { authService } from '../auth.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLoginResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    username: 'testuser',
    phone: '13800001111',
    balance: 100,
    invite_code: 'ABC123',
    register_time: '2026-01-01T00:00:00.000Z',
    last_login_time: '2026-04-01T12:00:00.000Z',
    token: 'jwt-token-from-server',
    ...overrides,
  }
}

beforeEach(() => {
  mockPost.mockReset()
  mockSetToken.mockReset()
  mockClearToken.mockReset()
  localStorage.clear()
})

afterEach(() => {
  jest.useRealTimers()
})

// ---------------------------------------------------------------------------
// loginWithSms
// ---------------------------------------------------------------------------

describe('AuthService.loginWithSms', () => {
  const smsData: SmsLoginRequest = { phone: '13800001111', code: '123456' }

  test('returns AuthResponse on successful login', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse())

    const result = await authService.loginWithSms(smsData)

    // @ts-expect-error jest expect.toEqual does not accept generic type arguments under strictNullChecks
    expect(result).toEqual<AuthResponse>({
      user: {
        id: 42,
        email: '',
        username: 'testuser',
        phone: '13800001111',
        balance: 100,
        role: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-04-01T12:00:00.000Z',
      },
      tokens: {
        accessToken: 'jwt-token-from-server',
        refreshToken: '',
        expiresIn: 3600,
      },
    })
  })

  test('calls apiClient.post with correct endpoint and payload', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse())

    await authService.loginWithSms(smsData)

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/login',
      {
        phone: '13800001111',
        code: '123456',
      },
      expect.any(Function),
    )
  })

  test('stores tokens via apiClient.setToken and localStorage', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse())

    await authService.loginWithSms(smsData)

    expect(mockSetToken).toHaveBeenCalledWith('jwt-token-from-server')
    const storedUser = JSON.parse(localStorage.getItem('user') as string)
    expect(storedUser.username).toBe('testuser')
  })

  test('throws when server response is missing token', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse({ token: '' }))

    await expect(authService.loginWithSms(smsData)).rejects.toThrow(
      '[AuthService] /auth/login 响应缺少 token',
    )
  })

  test('throws when server response token is non-string', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse({ token: null }))

    await expect(authService.loginWithSms(smsData)).rejects.toThrow(
      '[AuthService] /auth/login 响应缺少 token',
    )
  })

  test('propagates network errors from apiClient.post', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network failure'))

    await expect(authService.loginWithSms(smsData)).rejects.toThrow('Network failure')
  })

  test('trims whitespace from the returned token', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse({ token: '  spaced-token  ' }))

    const result = await authService.loginWithSms(smsData)
    expect(result.tokens.accessToken).toBe('spaced-token')
  })
})

// ---------------------------------------------------------------------------
// loginWithPassword
// ---------------------------------------------------------------------------

describe('AuthService.loginWithPassword', () => {
  const pwdData: PasswordLoginRequest = { phone: '13800001111', password: 'mypassword' }

  test('returns AuthResponse on successful password login', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse())

    const result = await authService.loginWithPassword(pwdData)

    expect(result.tokens.accessToken).toBe('jwt-token-from-server')
    expect(result.user.phone).toBe('13800001111')
  })

  test('calls apiClient.post with correct endpoint and payload', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse())

    await authService.loginWithPassword(pwdData)

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/pwdlogin',
      {
        phone: '13800001111',
        password: 'mypassword',
      },
      expect.any(Function),
    )
  })

  test('throws when server response is missing token', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse({ token: '' }))

    await expect(authService.loginWithPassword(pwdData)).rejects.toThrow(
      '[AuthService] /auth/pwdlogin 响应缺少 token',
    )
  })
})

// ---------------------------------------------------------------------------
// Unified login dispatch
// ---------------------------------------------------------------------------

describe('AuthService.login (unified entry)', () => {
  test('dispatches to loginWithSms when data contains code', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse())

    const result = await authService.login({ phone: '13800001111', code: '123456' })

    expect(mockPost).toHaveBeenCalledWith('/auth/login', expect.anything(), expect.any(Function))
    expect(result.tokens.accessToken).toBe('jwt-token-from-server')
  })

  test('dispatches to loginWithPassword when data contains password', async () => {
    mockPost.mockResolvedValueOnce(makeLoginResponse())

    const result = await authService.login({ phone: '13800001111', password: 'pass' })

    expect(mockPost).toHaveBeenCalledWith('/auth/pwdlogin', expect.anything(), expect.any(Function))
    expect(result.tokens.accessToken).toBe('jwt-token-from-server')
  })
})

// ---------------------------------------------------------------------------
// sendSmsCode
// ---------------------------------------------------------------------------

describe('AuthService.sendSmsCode', () => {
  test('calls apiClient.post with correct endpoint', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    await authService.sendSmsCode({ phone: '13800001111' })

    expect(mockPost).toHaveBeenCalledWith('/auth/send', { phone: '13800001111' })
  })
})

// ---------------------------------------------------------------------------
// storeTokens / clearTokens (via logout)
// ---------------------------------------------------------------------------

describe('AuthService token management', () => {
  test('logout clears tokens even when the server call fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('server error'))

    // The server error propagates, but clearTokens still runs via finally
    await expect(authService.logout()).rejects.toThrow('server error')

    expect(mockClearToken).toHaveBeenCalled()
    expect(localStorage.getItem('user')).toBeNull()
  })

  test('logout clears tokens after successful server call', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    await authService.logout()

    expect(mockClearToken).toHaveBeenCalled()
    expect(localStorage.getItem('user')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getCurrentUser / isAuthenticated
// ---------------------------------------------------------------------------

describe('AuthService.getCurrentUser', () => {
  test('returns null when no user stored in localStorage', () => {
    expect(authService.getCurrentUser()).toBeNull()
  })

  test('returns parsed user object from localStorage', () => {
    const user = { id: 1, username: 'tester' }
    localStorage.setItem('user', JSON.stringify(user))

    expect(authService.getCurrentUser()).toEqual(user)
  })
})

describe('AuthService.isAuthenticated', () => {
  test('returns true when access token exists', () => {
    // The mock getAccessToken returns 'stored-mock-token'
    expect(authService.isAuthenticated()).toBe(true)
  })

  test('returns false when access token is null', async () => {
    // Dynamically re-mock for this test
    const tokenStorage = jest.requireMock('@/api/core/token-storage') as {
      getAccessToken: jest.Mock<() => string | null>
    }
    tokenStorage.getAccessToken.mockReturnValueOnce(null)

    expect(authService.isAuthenticated()).toBe(false)
  })
})
