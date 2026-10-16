import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { StrictMode, type PropsWithChildren } from 'react'

jest.mock('@/api/services', () => ({
  referralService: {
    generateReferralCode: jest.fn(),
  },
  userService: {
    getUserDetail: jest.fn(),
    getUserInviteList: jest.fn(),
  },
}))

import { referralService, userService } from '@/api/services'
import { useUIStore } from '@/stores/useUIStore'

import { useProfileReferralState } from './useProfileReferralState'

const getUserDetail = userService.getUserDetail as jest.MockedFunction<
  typeof userService.getUserDetail
>
const getUserInviteList = userService.getUserInviteList as jest.MockedFunction<
  typeof userService.getUserInviteList
>
const generateReferralCode = referralService.generateReferralCode as jest.MockedFunction<
  typeof referralService.generateReferralCode
>
let avatarObjectUrlSequence = 0

beforeEach(() => {
  jest.clearAllMocks()
  useUIStore.setState({ toast: null })
  avatarObjectUrlSequence = 0
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: jest.fn(() => `blob:avatar-${++avatarObjectUrlSequence}`),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: jest.fn(),
  })
})

describe('useProfileReferralState', () => {
  test('revokes the previous generated avatar URL when it is replaced', () => {
    getUserDetail.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useProfileReferralState({ user: { avatarUrl: null } }))

    act(() => {
      result.current.handleAvatarChange({
        target: { files: [new File(['first'], 'first.png', { type: 'image/png' })] },
      } as never)
    })
    const firstPreviewUrl = result.current.avatarUrl
    act(() => {
      result.current.handleAvatarChange({
        target: { files: [new File(['second'], 'second.png', { type: 'image/png' })] },
      } as never)
    })
    const secondPreviewUrl = result.current.avatarUrl

    expect(firstPreviewUrl).toMatch(/^blob:avatar-/)
    expect(secondPreviewUrl).toMatch(/^blob:avatar-/)
    expect(secondPreviewUrl).not.toBe(firstPreviewUrl)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstPreviewUrl)
  })

  test('revokes the generated avatar URL on unmount', () => {
    getUserDetail.mockReturnValue(new Promise(() => undefined))
    const { result, unmount } = renderHook(() =>
      useProfileReferralState({ user: { avatarUrl: 'https://cdn.example.com/avatar.png' } }),
    )

    act(() => {
      result.current.handleAvatarChange({
        target: { files: [new File(['avatar'], 'avatar.png', { type: 'image/png' })] },
      } as never)
    })
    const generatedPreviewUrl = result.current.avatarUrl
    unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(generatedPreviewUrl)
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('https://cdn.example.com/avatar.png')
  })

  test('never exposes demo referral data while real account data is loading', () => {
    getUserDetail.mockReturnValue(new Promise(() => undefined))

    const { result } = renderHook(() => useProfileReferralState({ user: { avatarUrl: null } }))

    expect(result.current.myReferralCode).toBeNull()
    expect(result.current.referralRecords).toEqual([])
    expect(result.current.isReferralLoading).toBe(true)
    expect(result.current.referralError).toBeNull()
  })

  test('keeps the backend usage-limit semantics and sanitizes invalid reward amounts', async () => {
    getUserDetail.mockResolvedValue({ invite_code: 'REAL2026' } as any)
    getUserInviteList.mockResolvedValue({
      total: 1,
      totalreward_amount: 12,
      config: { usage_limit: 0, referrer_reward: 12 },
      items: [
        {
          invited_at: '2026-07-10T08:00:00.000Z',
          status: 'paid',
          reward_amount: 'not-a-number',
        },
      ],
    } as any)

    const { result } = renderHook(() => useProfileReferralState({ user: { avatarUrl: null } }))

    await waitFor(() => expect(result.current.myReferralCode?.code).toBe('REAL2026'))
    expect(result.current.myReferralCode?.maxUses).toBe(0)
    expect(result.current.referralRecords[0]?.amount).toBe(0)
  })

  test('keeps the referral state empty when the backend has not assigned a code', async () => {
    getUserDetail.mockResolvedValue({ invite_code: '' } as any)

    const { result } = renderHook(() => useProfileReferralState({ user: { avatarUrl: null } }))

    await waitFor(() => expect(getUserDetail).toHaveBeenCalledTimes(1))
    expect(result.current.myReferralCode).toBeNull()
    expect(result.current.referralRecords).toEqual([])
    expect(getUserInviteList).not.toHaveBeenCalled()
  })

  test('reports clipboard failure instead of claiming that the code was copied', async () => {
    const showToast = jest.fn()
    useUIStore.setState({ showToast } as any)
    getUserDetail.mockResolvedValue({ invite_code: 'REAL2026' } as any)
    getUserInviteList.mockResolvedValue({
      total: 0,
      totalreward_amount: 0,
      config: { usage_limit: 10, referrer_reward: 12 },
      items: [],
    } as any)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn(() => {
          throw new Error('denied')
        }),
      },
    })

    const { result } = renderHook(() => useProfileReferralState({ user: { avatarUrl: null } }))
    await waitFor(() => expect(result.current.myReferralCode?.code).toBe('REAL2026'))

    await act(async () => {
      try {
        await result.current.handleCopyReferralCode()
      } catch {
        // The pre-fix implementation lets this error escape; the assertions below stay red.
      }
    })

    expect(showToast).toHaveBeenCalledWith('复制失败，请手动复制推荐码')
    expect(showToast).not.toHaveBeenCalledWith('推荐码已复制到剪贴板！')
  })

  test('distinguishes a loading failure from an account with no referral code', async () => {
    getUserDetail.mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useProfileReferralState({ user: { avatarUrl: null } }))

    await waitFor(() => expect(result.current.isReferralLoading).toBe(false))
    expect(result.current.referralError).toBe('推荐信息暂时无法加载，请稍后重试')
    expect(result.current.myReferralCode).toBeNull()
  })

  test('clears account referral data when the authenticated user disappears', async () => {
    getUserDetail.mockResolvedValue({ invite_code: 'REAL2026' } as any)
    getUserInviteList.mockResolvedValue({
      total: 0,
      totalreward_amount: 0,
      config: { usage_limit: 10, referrer_reward: 12 },
      items: [],
    } as any)

    const { result, rerender } = renderHook(({ user }) => useProfileReferralState({ user }), {
      initialProps: { user: { avatarUrl: null } as { avatarUrl: string | null } | null },
    })
    await waitFor(() => expect(result.current.myReferralCode?.code).toBe('REAL2026'))

    rerender({ user: null })

    await waitFor(() => expect(result.current.myReferralCode).toBeNull())
    expect(result.current.referralRecords).toEqual([])
  })

  test('generates a missing referral code through the documented backend endpoint', async () => {
    const showToast = jest.fn()
    useUIStore.setState({ showToast } as any)
    getUserDetail.mockResolvedValue({ invite_code: '' } as any)
    generateReferralCode.mockResolvedValue({
      code: 'REF123ABC',
      maxUses: 10,
      rewardAmount: 50,
      createdAt: '2026-07-11',
    })

    const { result } = renderHook(() => useProfileReferralState({ user: { avatarUrl: null } }))
    await waitFor(() => expect(result.current.isReferralLoading).toBe(false))

    await act(async () => {
      await result.current.handleGenerateReferralCode()
    })

    expect(generateReferralCode).toHaveBeenCalledTimes(1)
    expect(result.current.myReferralCode).toEqual({
      code: 'REF123ABC',
      usedCount: 0,
      maxUses: 10,
      rewardAmount: 50,
      totalEarned: 0,
      createdAt: '2026-07-11',
    })
    expect(showToast).toHaveBeenCalledWith('推荐码已生成')
  })

  test('generates a missing referral code after the development StrictMode effect replay', async () => {
    getUserDetail.mockResolvedValue({ invite_code: '' } as any)
    generateReferralCode.mockResolvedValue({
      code: 'STRICT2026',
      maxUses: 10,
      rewardAmount: 50,
      createdAt: '2026-07-11',
    })
    const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>

    const { result } = renderHook(() => useProfileReferralState({ user: { avatarUrl: null } }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isReferralLoading).toBe(false))

    await act(async () => {
      await result.current.handleGenerateReferralCode()
    })

    expect(result.current.myReferralCode?.code).toBe('STRICT2026')
  })

  test('keeps the empty state and reports a backend generation failure', async () => {
    const showToast = jest.fn()
    useUIStore.setState({ showToast } as any)
    getUserDetail.mockResolvedValue({ invite_code: '' } as any)
    generateReferralCode.mockRejectedValue(new Error('server error'))

    const { result } = renderHook(() => useProfileReferralState({ user: { avatarUrl: null } }))
    await waitFor(() => expect(result.current.isReferralLoading).toBe(false))

    await act(async () => {
      await result.current.handleGenerateReferralCode()
    })

    expect(result.current.myReferralCode).toBeNull()
    expect(showToast).toHaveBeenCalledWith('生成推荐码失败，请稍后重试')
  })

  test('ignores an in-flight generation result after the authenticated user disappears', async () => {
    const showToast = jest.fn()
    let resolveGeneration!: (
      value: Awaited<ReturnType<typeof referralService.generateReferralCode>>,
    ) => void
    useUIStore.setState({ showToast } as any)
    getUserDetail.mockResolvedValue({ invite_code: '' } as any)
    generateReferralCode.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve
        }),
    )

    const { result, rerender } = renderHook(({ user }) => useProfileReferralState({ user }), {
      initialProps: { user: { avatarUrl: null } as { avatarUrl: string | null } | null },
    })
    await waitFor(() => expect(result.current.isReferralLoading).toBe(false))

    let generationPromise: Promise<void> | undefined
    act(() => {
      generationPromise = result.current.handleGenerateReferralCode()
    })
    await waitFor(() => expect(result.current.isGeneratingReferralCode).toBe(true))

    rerender({ user: null })
    await act(async () => {
      resolveGeneration({
        code: 'STALECODE',
        maxUses: 10,
        rewardAmount: 50,
        createdAt: '2026-07-11',
      })
      await generationPromise
    })

    expect(result.current.myReferralCode).toBeNull()
    expect(showToast).not.toHaveBeenCalledWith('推荐码已生成')
  })
})
