import type { ChangeEvent, RefObject } from 'react'

import type { ReferralCode, ReferralRecord } from '../../../../types/common'

export interface ProfileSettingsSectionProps {
  themeColor: string
  avatarUrl: string
  fileInputRef: RefObject<HTMLInputElement | null>
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
  myReferralCode: ReferralCode | null
  onCopyReferralCode: () => Promise<void>
  isGeneratingReferralCode: boolean
  onGenerateReferralCode: () => Promise<void>
  referralRecords: ReferralRecord[]
  isReferralLoading: boolean
  referralError: string | null
  onRetryReferral: () => void
}

export interface ProfileFormData {
  username: string
  phone: string
  email: string
  avatar: string
}

export interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
