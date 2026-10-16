import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    clearToken: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    setToken: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { ResponseValidationError } from '../validation'
import { authService } from './auth.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('authService runtime response validation', () => {
  beforeEach(() => {
    mockPost.mockReset()
    localStorage.clear()
  })

  test('rejects password login response when token is missing', async () => {
    mockPost.mockImplementation(async (_endpoint, _payload, validator) => {
      if (!validator) {
        throw new Error('validator missing')
      }
      return validator({
        id: 1,
        username: '用户A',
        phone: '13800000000',
        balance: 0,
        invite_code: 'INVITE',
        register_time: '2026-06-20T00:00:00Z',
        last_login_time: '2026-06-20T00:00:00Z',
      })
    })

    await expect(
      authService.loginWithPassword({
        phone: '13800000000',
        password: 'password123',
      }),
    ).rejects.toThrow(ResponseValidationError)
  })

  test('persists sanitized user after password login while returning complete user', async () => {
    mockPost.mockImplementation(async (_endpoint, _payload, validator) => {
      if (!validator) {
        throw new Error('validator missing')
      }
      return validator({
        id: 1,
        username: '用户A',
        phone: '13800000000',
        balance: 88,
        invite_code: 'INVITE',
        register_time: '2026-06-20T00:00:00Z',
        last_login_time: '2026-06-21T00:00:00Z',
        token: 'token-123',
      })
    })

    const response = await authService.loginWithPassword({
      phone: '13800000000',
      password: 'password123',
    })

    const storedUser = JSON.parse(localStorage.getItem('user') ?? '{}') as Record<string, unknown>
    expect(storedUser.phone).toBeUndefined()
    expect(storedUser.balance).toBe(0)
    expect(storedUser.username).toBe('用户A')
    expect(response.user.phone).toBe('13800000000')
    expect(response.user.balance).toBe(88)
  })
})

describe('authService read-only current auth contract endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('validateInvitationCode calls current invitation validation endpoint', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        code: 'INV-001',
        isValid: true,
        organization: 'Oasis',
      },
    })

    await authService.validateInvitationCode('INV-001')

    expect(mockGet).toHaveBeenCalledWith('/api/auth/invitations/INV-001', undefined, undefined, {
      signal: undefined,
    })
  })
})

describe('authService current registration write contract endpoints', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  test('verifyRegistration calls current registration verification endpoint', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      },
    })

    const payload = {
      email: 'user@example.com',
      code: '123456',
    }

    await authService.verifyRegistration(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/auth/register/verify', payload, undefined, {
      signal: undefined,
    })
  })

  test('resendVerificationCode calls current resend verification endpoint', async () => {
    mockPost.mockResolvedValue({ success: true })

    const payload = {
      email: 'user@example.com',
    }

    await authService.resendVerificationCode(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/auth/register/resend', payload, undefined, {
      signal: undefined,
    })
  })
})
