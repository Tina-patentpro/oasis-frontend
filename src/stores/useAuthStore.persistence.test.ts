import { afterEach, describe, expect, jest, test } from '@jest/globals'
import type { AuthResponse } from '@/types/api'

const clearTokenMock = jest.fn()
const setTokenMock = jest.fn()
const loginMock = jest.fn<() => Promise<AuthResponse>>()

jest.mock('@/api/client', () => ({
  apiClient: {
    clearToken: clearTokenMock,
    setToken: setTokenMock,
  },
}))

jest.mock('@/api/services', () => ({
  authService: {
    login: loginMock,
    loginWithSms: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  },
  userService: {
    getUserDetail: jest.fn(),
  },
}))

import { useAuthStore } from './useAuthStore'
import { useUserStore } from './useUserStore'

describe('useAuthStore user persistence hygiene', () => {
  afterEach(() => {
    clearTokenMock.mockClear()
    setTokenMock.mockClear()
    loginMock.mockReset()
    localStorage.clear()
    sessionStorage.clear()
    useUserStore.setState({
      phone: undefined,
      phoneManuallySet: false,
      profile: null,
    })
    useAuthStore.setState({
      accessToken: null,
      error: undefined,
      initialized: false,
      isAuthenticating: false,
      reauthMessage: undefined,
      reauthRequired: false,
      refreshToken: null,
      user: null,
    })
  })

  test('persists a sanitized user after login while keeping the in-memory user complete', async () => {
    const response: AuthResponse = {
      user: {
        id: 1,
        email: 'demo@example.com',
        username: 'demo',
        phone: '13800000000',
        balance: 99,
        role: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      tokens: {
        accessToken: 'token-123',
        refreshToken: '',
        expiresIn: 30 * 24 * 60 * 60,
      },
    }
    loginMock.mockResolvedValueOnce(response)

    await useAuthStore.getState().login({
      phone: '13800000000',
      code: '123456',
    })

    const storedUser = JSON.parse(localStorage.getItem('user') ?? '{}') as Record<string, unknown>
    expect(storedUser.phone).toBeUndefined()
    expect(storedUser.balance).toBe(0)
    expect(storedUser.username).toBe('demo')
    expect(useAuthStore.getState().user?.phone).toBe('13800000000')
    expect(useAuthStore.getState().user?.balance).toBe(99)
    expect(useUserStore.getState().phone).toBe('13800000000')
  })
})
