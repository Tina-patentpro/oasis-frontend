import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { referralService } from './referral.service'

const post = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('referralService.generateReferralCode', () => {
  beforeEach(() => {
    post.mockReset()
  })

  test('calls the documented generate endpoint and returns its referral code', async () => {
    post.mockResolvedValue({
      success: true,
      referralCode: {
        code: 'REF123ABC',
        maxUses: 10,
        rewardAmount: 50,
        createdAt: '2026-07-11',
      },
    } as never)

    await expect(referralService.generateReferralCode()).resolves.toEqual({
      code: 'REF123ABC',
      maxUses: 10,
      rewardAmount: 50,
      createdAt: '2026-07-11',
    })
    expect(post).toHaveBeenCalledWith('/referral/generate', {})
  })

  test('accepts a standard API envelope that was already unwrapped to the code object', async () => {
    post.mockResolvedValue({
      code: 'REFDIRECT',
      maxUses: 0,
      rewardAmount: 12,
      createdAt: '2026-07-11',
    } as never)

    await expect(referralService.generateReferralCode()).resolves.toMatchObject({
      code: 'REFDIRECT',
      maxUses: 0,
      rewardAmount: 12,
    })
  })

  test('rejects a malformed successful response instead of showing a blank code', async () => {
    post.mockResolvedValue({ success: true } as never)

    await expect(referralService.generateReferralCode()).rejects.toThrow(
      '生成推荐码响应缺少有效推荐码',
    )
  })
})
