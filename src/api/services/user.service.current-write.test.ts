import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    patch: jest.fn(),
    put: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { userService } from './user.service'

const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>
const mockPut = apiClient.put as jest.MockedFunction<typeof apiClient.put>

describe('userService current user write contract endpoints', () => {
  beforeEach(() => {
    mockPatch.mockReset()
    mockPut.mockReset()
  })

  test('updateCurrentUserProfile calls current user profile update endpoint', async () => {
    mockPatch.mockResolvedValue({
      success: true,
      data: {
        id: 'user-001',
      },
    })

    const payload = {
      displayName: '新用户',
      avatarUrl: 'https://example.com/avatar.png',
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      phone: '13800000000',
    }

    await userService.updateCurrentUserProfile(payload)

    expect(mockPatch).toHaveBeenCalledWith('/api/users/me', payload, undefined, {
      signal: undefined,
    })
  })

  test('updateUserPreferences calls current user preferences update endpoint', async () => {
    mockPut.mockResolvedValue({
      success: true,
      data: {
        theme: 'dark',
      },
    })

    const payload = {
      theme: 'dark' as const,
      language: 'zh-CN',
      dateFormat: 'YYYY-MM-DD',
      notification: {
        email: true,
        sms: false,
        inApp: true,
      },
      accessibility: {
        fontScale: 1,
        highContrast: false,
      },
    }

    await userService.updateUserPreferences(payload)

    expect(mockPut).toHaveBeenCalledWith('/api/users/me/preferences', payload, undefined, {
      signal: undefined,
    })
  })
})
