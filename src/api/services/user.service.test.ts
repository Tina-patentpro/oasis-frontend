import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    uploadFile: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { userService } from './user.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('userService persistence hygiene', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    localStorage.clear()
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 7,
        email: 'old@example.com',
        username: 'old',
        balance: 0,
        role: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
    )
  })

  test('persists sanitized user after profile update while returning complete user', async () => {
    mockPost.mockResolvedValue({ code: 0, msg: 'ok' })
    mockGet.mockResolvedValue({
      username: 'new',
      avatar: 'https://example.com/avatar.png',
      phone: '13800000000',
      email: 'new@example.com',
      balance: 66,
      invite_code: 'INVITE',
    })

    const updated = await userService.updateUser({
      username: 'new',
      phone: '13800000000',
    })

    const storedUser = JSON.parse(localStorage.getItem('user') ?? '{}') as Record<string, unknown>
    expect(storedUser.phone).toBeUndefined()
    expect(storedUser.balance).toBe(0)
    expect(storedUser.username).toBe('new')
    expect(updated.phone).toBe('13800000000')
    expect(updated.balance).toBe(66)
  })
})

describe('userService.getUserDetail validation', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('returns detail when response has username and balance', async () => {
    mockGet.mockResolvedValue({
      username: 'tester',
      avatar: 'https://example.com/a.png',
      phone: '13800000000',
      email: '',
      balance: 100,
      invite_code: 'ABC',
    })

    const detail = await userService.getUserDetail()

    expect(detail.username).toBe('tester')
    expect(detail.balance).toBe(100)
  })

  test('throws when response lacks required username field', async () => {
    // 后端返回了对象但缺 username（关键字段），应抛错而非静默返回脏数据（A-5）
    mockGet.mockResolvedValue({ avatar: 'x', phone: '13800000000', balance: 0 })

    await expect(userService.getUserDetail()).rejects.toThrow('无效的用户详情响应')
  })
})

describe('userService read-only current user contract endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('getCurrentUserProfile calls current user profile endpoint', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        id: 'user-001',
        email: 'user@example.com',
        displayName: 'User',
      },
    })

    await userService.getCurrentUserProfile()

    expect(mockGet).toHaveBeenCalledWith('/api/users/me', undefined, undefined, {
      signal: undefined,
    })
  })

  test('getUserPreferences calls current user preferences endpoint', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        theme: 'system',
        language: 'zh-CN',
      },
    })

    await userService.getUserPreferences()

    expect(mockGet).toHaveBeenCalledWith('/api/users/me/preferences', undefined, undefined, {
      signal: undefined,
    })
  })
})
