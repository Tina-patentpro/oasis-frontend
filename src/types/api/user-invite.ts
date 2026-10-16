// 4. 用户邀请模块

export interface ApiReferralCode {
  id: number
  userId: number
  code: string
  maxUsage: number
  usedCount: number
  rewardAmount: number
  createdAt: string
}

export interface ApiReferralRecord {
  id: number
  referralCodeId: number
  referrerUserId: number
  refereeUserId: number
  rewardAmount: number
  createdAt: string
}

export interface UseReferralCodeRequest {
  code: string
}

export interface ReferralStatistics {
  totalReferrals: number
  totalEarnings: number
  availableUses: number
}

export interface InviteConfig {
  usage_limit: number
  referrer_reward: number
}

export interface InviteUser {
  id: number
  username: string
}

export interface InviteItem {
  referrer_id: number
  invitee_id: number
  reward_amount: string
  triggered_by: string
  invited_at: string
  status: 'pending' | 'paid'
  referrer: InviteUser
  invitee: InviteUser
}

export interface UserInviteListResponse {
  total: number
  totalreward_amount: number
  config: InviteConfig
  items: InviteItem[]
}

export interface UserInviteListParams {
  page: number
  limit: number
}
