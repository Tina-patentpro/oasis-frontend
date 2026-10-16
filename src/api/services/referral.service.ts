import type {
  ApiReferralCode as ReferralCode,
  ReferralStatistics,
  UseReferralCodeRequest,
} from '@/types/api'

import { apiClient } from '../client'
import { userService } from './user.service'

export interface GeneratedReferralCode {
  code: string
  maxUses: number
  rewardAmount: number
  createdAt: string
}

type GenerateReferralCodeResponse =
  | GeneratedReferralCode
  | {
      success?: boolean
      referralCode?: GeneratedReferralCode
    }

function normalizeGeneratedReferralCode(
  response: GenerateReferralCodeResponse,
): GeneratedReferralCode {
  const candidate: Partial<GeneratedReferralCode> =
    'referralCode' in response ? (response.referralCode ?? {}) : (response as GeneratedReferralCode)

  if (typeof candidate.code !== 'string' || candidate.code.trim() === '') {
    throw new Error('生成推荐码响应缺少有效推荐码')
  }

  const maxUses = Number(candidate.maxUses)
  const rewardAmount = Number(candidate.rewardAmount)

  return {
    code: candidate.code.trim(),
    maxUses: Number.isFinite(maxUses) ? maxUses : 0,
    rewardAmount: Number.isFinite(rewardAmount) ? rewardAmount : 0,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
  }
}

class ReferralService {
  async generateReferralCode(): Promise<GeneratedReferralCode> {
    const response = (await apiClient.post(
      '/referral/generate',
      {},
    )) as GenerateReferralCodeResponse

    return normalizeGeneratedReferralCode(response)
  }

  async getReferralCode(): Promise<ReferralCode> {
    const [userDetail, inviteConfig] = await Promise.all([
      userService.getUserDetail(),
      userService.getInviteConfig(),
    ])

    return {
      id: 0,
      userId: 0,
      code: userDetail?.invite_code || '',
      maxUsage: Number(inviteConfig?.usage_limit || 0),
      usedCount: 0,
      rewardAmount: Number(inviteConfig?.referrer_reward || 0),
      createdAt: new Date().toISOString(),
    }
  }

  async useReferralCode(_request: UseReferralCodeRequest): Promise<void> {
    throw new Error(
      '[ReferralService] Backend API not found in API接口文档-用户端.md: useReferralCode',
    )
  }

  async getReferralStatistics(): Promise<ReferralStatistics> {
    const [response, inviteConfig] = await Promise.all([
      userService.getUserInviteList({ page: 1, limit: 100 }),
      userService.getInviteConfig(),
    ])

    const items = Array.isArray(response?.items) ? response.items : []
    const total = Number(response?.total || 0)
    const totalEarnings = items.reduce((sum, item) => {
      const reward = Number(
        ((item as unknown as Record<string, unknown>)?.reward_amount as number) || 0,
      )
      return Number.isFinite(reward) ? sum + reward : sum
    }, 0)
    const usageLimit = Number(inviteConfig?.usage_limit || 0)

    return {
      totalReferrals: total,
      totalEarnings,
      availableUses: Math.max(0, usageLimit - total),
    }
  }
}

export const referralService = new ReferralService()
