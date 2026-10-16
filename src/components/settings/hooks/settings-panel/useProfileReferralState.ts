import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'

import { referralService, userService } from '@/api/services'
import { useUIStore } from '@/stores/useUIStore'
import type { ReferralCode, ReferralRecord } from '../../../../types/common'
import { formatDateTime } from './helpers'

interface UserLike {
  avatarUrl?: string | null
}

interface UseProfileReferralStateArgs {
  user: UserLike | null
}

export function useProfileReferralState({ user }: UseProfileReferralStateArgs) {
  const hasUser = Boolean(user)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [myReferralCode, setMyReferralCode] = useState<ReferralCode | null>(null)
  const [referralRecords, setReferralRecords] = useState<ReferralRecord[]>([])
  const [isReferralLoading, setIsReferralLoading] = useState(hasUser)
  const [isGeneratingReferralCode, setIsGeneratingReferralCode] = useState(false)
  const [referralError, setReferralError] = useState<string | null>(null)
  const [referralReloadToken, setReferralReloadToken] = useState(0)
  const isGeneratingReferralCodeRef = useRef(false)
  const generationRequestIdRef = useRef(0)
  const isMountedRef = useRef(true)
  const avatarObjectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current)
        avatarObjectUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadUserDetailAndInvites = async () => {
      setMyReferralCode(null)
      setReferralRecords([])
      setIsReferralLoading(true)
      setReferralError(null)

      try {
        const detail = await userService.getUserDetail()
        if (cancelled || !detail.invite_code) {
          return
        }

        const inviteList = await userService.getUserInviteList({ page: 1, limit: 10 })
        if (cancelled || !inviteList) {
          return
        }

        setMyReferralCode({
          code: detail.invite_code,
          usedCount: inviteList.total,
          maxUses: inviteList.config.usage_limit,
          rewardAmount: inviteList.config.referrer_reward,
          totalEarned: inviteList.totalreward_amount,
          createdAt: '',
        })

        const records: ReferralRecord[] = inviteList.items.map((item) => {
          const parsedAmount = Number(item.reward_amount)
          return {
            id: String(item.invitee_id),
            date: formatDateTime(item.invited_at),
            type: item.status === 'paid' ? ('earned' as const) : ('used' as const),
            code: detail.invite_code,
            amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
          }
        })
        setReferralRecords(records)
      } catch (error) {
        console.warn('[settings] 获取用户详情和邀请列表失败', error)
        if (!cancelled) {
          setReferralError('推荐信息暂时无法加载，请稍后重试')
        }
      } finally {
        if (!cancelled) {
          setIsReferralLoading(false)
        }
      }
    }

    if (!hasUser) {
      generationRequestIdRef.current += 1
      isGeneratingReferralCodeRef.current = false
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current)
        avatarObjectUrlRef.current = null
      }
      setAvatarPreviewUrl('')
      setMyReferralCode(null)
      setReferralRecords([])
      setIsReferralLoading(false)
      setIsGeneratingReferralCode(false)
      setReferralError(null)
    } else {
      void loadUserDetailAndInvites()
    }

    return () => {
      cancelled = true
    }
  }, [hasUser, referralReloadToken])

  const retryReferralLoad = useCallback(() => {
    setReferralReloadToken((current) => current + 1)
  }, [])

  const handleAvatarChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      useUIStore.getState().showToast('请选择图片文件')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      useUIStore.getState().showToast('图片大小不能超过2MB')
      return
    }
    const url = URL.createObjectURL(file)
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current)
    }
    avatarObjectUrlRef.current = url
    setAvatarPreviewUrl(url)
  }, [])

  const handleCopyReferralCode = useCallback(async () => {
    if (!myReferralCode) return
    try {
      await navigator.clipboard.writeText(myReferralCode.code)
      useUIStore.getState().showToast('推荐码已复制到剪贴板！')
    } catch {
      useUIStore.getState().showToast('复制失败，请手动复制推荐码')
    }
  }, [myReferralCode])

  const handleGenerateReferralCode = useCallback(async () => {
    if (!hasUser || myReferralCode || isGeneratingReferralCodeRef.current) {
      return
    }

    const requestId = generationRequestIdRef.current + 1
    generationRequestIdRef.current = requestId
    isGeneratingReferralCodeRef.current = true
    setIsGeneratingReferralCode(true)
    try {
      const generated = await referralService.generateReferralCode()
      if (!isMountedRef.current || requestId !== generationRequestIdRef.current) {
        return
      }
      setMyReferralCode({
        code: generated.code,
        usedCount: 0,
        maxUses: generated.maxUses,
        rewardAmount: generated.rewardAmount,
        totalEarned: 0,
        createdAt: generated.createdAt,
      })
      useUIStore.getState().showToast('推荐码已生成')
    } catch (error) {
      if (!isMountedRef.current || requestId !== generationRequestIdRef.current) {
        return
      }
      console.error('[settings] 生成推荐码失败', error)
      useUIStore.getState().showToast('生成推荐码失败，请稍后重试')
    } finally {
      if (requestId === generationRequestIdRef.current) {
        isGeneratingReferralCodeRef.current = false
      }
      if (isMountedRef.current && requestId === generationRequestIdRef.current) {
        setIsGeneratingReferralCode(false)
      }
    }
  }, [hasUser, myReferralCode])

  return {
    avatarUrl: avatarPreviewUrl || user?.avatarUrl || '',
    handleAvatarChange,
    myReferralCode,
    handleCopyReferralCode,
    isGeneratingReferralCode,
    handleGenerateReferralCode,
    referralRecords,
    isReferralLoading,
    referralError,
    retryReferralLoad,
  }
}
