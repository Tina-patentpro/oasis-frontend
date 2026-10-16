import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { userService } from '@/api/services/user.service'
import { referralService } from '@/api/services/referral.service'

import { ProfileAndRewardPage } from './ProfileAndRewardPage'

jest.mock('@/api/services/user.service', () => ({
  userService: {
    getUserDetail: jest.fn(),
    getUserInviteList: jest.fn(),
  },
}))

jest.mock('@/api/services/referral.service', () => ({
  referralService: {
    generateReferralCode: jest.fn(),
  },
}))

const mockShowToast = jest.fn()

jest.mock('@/stores/useUIStore', () => ({
  useUIStore: {
    getState: () => ({
      showToast: mockShowToast,
    }),
  },
}))

const mockUserService = userService as jest.Mocked<typeof userService>
const mockReferralService = referralService as jest.Mocked<typeof referralService>

describe('ProfileAndRewardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('generates a missing invite code through the documented backend endpoint', async () => {
    mockUserService.getUserDetail.mockResolvedValue({
      username: '测试用户',
      avatar: '',
      phone: '13800000000',
      email: 'test@example.com',
      balance: 12.5,
      invite_code: '',
    })
    mockUserService.getUserInviteList.mockResolvedValue({
      total: 0,
      totalreward_amount: 0,
      config: { usage_limit: 10, referrer_reward: 8 },
      items: [],
    })
    mockReferralService.generateReferralCode.mockResolvedValue({
      code: 'PROFILE2026',
      maxUses: 10,
      rewardAmount: 8,
      createdAt: '2026-07-11',
    })

    const user = userEvent.setup()
    render(<ProfileAndRewardPage />)

    await user.click(await screen.findByRole('button', { name: '生成邀请码' }))

    expect(mockReferralService.generateReferralCode).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('PROFILE2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制邀请码' })).toBeInTheDocument()
    expect(mockShowToast).toHaveBeenCalledWith('邀请码已生成')
  })

  test('disables the next page when the current page already contains the full result set', async () => {
    mockUserService.getUserDetail.mockResolvedValue({
      username: '测试用户',
      avatar: '',
      phone: '13800000000',
      email: 'test@example.com',
      balance: 12.5,
      invite_code: 'ABC123',
    })
    mockUserService.getUserInviteList.mockResolvedValue({
      total: 10,
      totalreward_amount: 80,
      config: { usage_limit: 10, referrer_reward: 8 },
      items: Array.from({ length: 10 }, (_, index) => ({
        referrer_id: 1,
        invitee_id: index + 1,
        reward_amount: '8',
        triggered_by: 'on_register',
        invited_at: '2026-07-11T08:00:00.000Z',
        status: 'paid' as const,
        referrer: { id: 1, username: '测试用户' },
        invitee: { id: index + 1, username: `被邀请用户${index + 1}` },
      })),
    })

    render(<ProfileAndRewardPage />)

    expect(await screen.findByRole('button', { name: '下一页' })).toBeDisabled()
  })

  test('shows a page-level retry error instead of empty reward data when loading fails', async () => {
    mockUserService.getUserDetail.mockRejectedValueOnce(new Error('network down'))
    mockUserService.getUserInviteList.mockRejectedValueOnce(new Error('network down'))

    render(<ProfileAndRewardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('加载失败')
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
    expect(screen.queryByText('邀请总人数')).not.toBeInTheDocument()
    expect(screen.queryByText('暂无邀请记录，快去邀请好友吧！')).not.toBeInTheDocument()
  })

  test('retries reward loading from the page-level error state', async () => {
    mockUserService.getUserDetail
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        username: '测试用户',
        avatar: '',
        phone: '13800000000',
        email: 'test@example.com',
        balance: 12.5,
        invite_code: 'ABC123',
      })
    mockUserService.getUserInviteList
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        total: 0,
        totalreward_amount: 0,
        config: {
          usage_limit: 0,
          referrer_reward: 8,
        },
        items: [],
      })

    const user = userEvent.setup()
    render(<ProfileAndRewardPage />)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: '重试' }))

    await waitFor(() => {
      expect(screen.getByText('测试用户')).toBeInTheDocument()
    })
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })
})
