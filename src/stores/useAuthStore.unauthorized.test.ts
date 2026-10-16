import { describe, expect, jest, test } from '@jest/globals'

jest.mock('@/api/client', () => ({
  apiClient: {
    clearToken: jest.fn(),
    setToken: jest.fn(),
  },
}))

jest.mock('@/api/services', () => ({
  authService: {
    login: jest.fn(),
    loginWithSms: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  },
  userService: {
    getUserDetail: jest.fn(),
  },
}))

import { handleUnauthorized } from '@/api/core/auth-refresh'

import { useAuthStore } from './useAuthStore'

describe('useAuthStore unauthorized handling', () => {
  test('registered unauthorized handler marks the session for re-authentication', async () => {
    useAuthStore.setState({
      user: null,
      accessToken: 'token-for-test',
      refreshToken: null,
      initialized: true,
      isAuthenticating: false,
      error: undefined,
      reauthRequired: false,
      reauthMessage: undefined,
    })

    await handleUnauthorized('请重新登录')

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().reauthRequired).toBe(true)
    expect(useAuthStore.getState().reauthMessage).toBe('请重新登录')
  })
})
