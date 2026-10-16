import { useCallback, useEffect, useRef, useState } from 'react'

import { isAbortLikeError } from '@/api/core/error-utils'
import { referralService } from '@/api/services/referral.service'
import { userService } from '@/api/services/user.service'
import { useUIStore } from '@/stores/useUIStore'
import type { UserDetail, UserInviteListResponse } from '@/types/api'

interface InviteItem {
  referrer_id: number
  invitee_id: number
  reward_amount: string
  triggered_by: string
  invited_at: string
  status: 'pending' | 'paid' | 'cancelled'
  referrer: {
    id: number
    username: string
  }
  invitee: {
    id: number
    username: string
  }
}

// Page-level orchestration remains in a single component pending section extraction.
// eslint-disable-next-line complexity
export const ProfileAndRewardPage = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [inviteData, setInviteData] = useState<UserInviteListResponse | null>(null)
  const [invitePage, setInvitePage] = useState(1)
  const [inviteLimit] = useState(10)
  const [isGeneratingInviteCode, setIsGeneratingInviteCode] = useState(false)
  const generateInviteCodeInFlightRef = useRef(false)

  // 获取用户详情和邀请列表
  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsLoading(true)
        setLoadError(null)

        // 并行获取用户详情和邀请列表
        const [userDetailResponse, inviteListResponse] = await Promise.all([
          userService.getUserDetail({ signal }),
          userService.getUserInviteList({ page: invitePage, limit: inviteLimit }, { signal }),
        ])
        if (signal?.aborted) {
          return
        }

        setUserDetail(userDetailResponse)
        setInviteData(inviteListResponse)
      } catch (error) {
        if (signal?.aborted || isAbortLikeError(error)) {
          return
        }
        setLoadError('加载失败，请检查网络后重试')
        useUIStore.getState().showToast('获取数据失败，请稍后重试')
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [invitePage, inviteLimit],
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchData(controller.signal)

    return () => {
      controller.abort()
    }
  }, [fetchData])

  // 复制邀请码
  const handleCopyInviteCode = useCallback(() => {
    if (!userDetail?.invite_code) return

    navigator.clipboard
      .writeText(userDetail.invite_code)
      .then(() => {
        useUIStore.getState().showToast('邀请码已复制到剪贴板！')
      })
      .catch(() => {
        useUIStore.getState().showToast('复制失败，请手动复制')
      })
  }, [userDetail])

  const handleGenerateInviteCode = useCallback(async () => {
    if (!userDetail || userDetail.invite_code?.trim() || generateInviteCodeInFlightRef.current) {
      return
    }

    generateInviteCodeInFlightRef.current = true
    setIsGeneratingInviteCode(true)
    try {
      const generated = await referralService.generateReferralCode()
      setUserDetail((current) =>
        current
          ? {
              ...current,
              invite_code: generated.code,
            }
          : current,
      )
      useUIStore.getState().showToast('邀请码已生成')
    } catch (error) {
      console.error('[ProfileAndRewardPage] 生成邀请码失败', error)
      useUIStore.getState().showToast('生成邀请码失败，请稍后重试')
    } finally {
      generateInviteCodeInFlightRef.current = false
      setIsGeneratingInviteCode(false)
    }
  }, [userDetail])

  // 格式化邀请次数限制显示
  const formatUsageLimit = useCallback((limit: number): string => {
    if (limit === 0) return '无限'
    if (limit === -1) return '禁止邀请'
    return limit.toString()
  }, [])

  // 格式化日期
  const formatDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  // 获取状态显示
  const getStatusDisplay = useCallback((status: string): { text: string; className: string } => {
    switch (status) {
      case 'paid':
        return { text: '已发放', className: 'bg-green-100 text-green-800' }
      case 'pending':
        return { text: '待发放', className: 'bg-yellow-100 text-yellow-800' }
      case 'cancelled':
        return { text: '已取消', className: 'bg-red-100 text-red-800' }
      default:
        return { text: status, className: 'bg-gray-100 text-gray-800' }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">正在加载…</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div
          role="alert"
          className="w-full max-w-md rounded-xl border border-red-100 bg-white p-6 text-center shadow-sm"
        >
          <h1 className="text-lg font-semibold text-gray-900">加载失败</h1>
          <p className="mt-2 text-sm text-gray-600">{loadError}</p>
          <button
            type="button"
            className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            onClick={() => {
              void fetchData()
            }}
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 用户信息卡片 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">个人信息</h2>

          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            {/* 头像 */}
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-200 md:h-32 md:w-32">
              {userDetail?.avatar ? (
                <img
                  src={userDetail.avatar}
                  alt="用户头像"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl text-gray-500">
                  {userDetail?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* 用户信息详情 */}
            <div className="flex-1 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-500">用户名</div>
                  <div className="text-lg font-medium text-gray-900">
                    {userDetail?.username || '-'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">手机号</div>
                  <div className="text-lg font-medium text-gray-900">
                    {userDetail?.phone || '-'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">邮箱</div>
                  <div className="text-lg font-medium text-gray-900">
                    {userDetail?.email || '-'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">余额</div>
                  <div className="text-lg font-medium text-gray-900">
                    ¥{userDetail?.balance?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>

              {/* 邀请码 */}
              <div className="rounded-lg bg-emerald-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">我的邀请码</div>
                    <div className="mt-1 text-2xl font-bold text-emerald-600">
                      {userDetail?.invite_code || '尚未生成'}
                    </div>
                  </div>
                  {userDetail?.invite_code ? (
                    <button
                      type="button"
                      onClick={handleCopyInviteCode}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      复制邀请码
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleGenerateInviteCode()}
                      disabled={isGeneratingInviteCode}
                      aria-busy={isGeneratingInviteCode}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isGeneratingInviteCode ? '正在生成…' : '生成邀请码'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 推荐奖励卡片 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">推荐奖励</h2>

          {/* 统计信息 */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="text-sm text-gray-600">邀请总人数</div>
              <div className="mt-2 text-3xl font-bold text-blue-600">{inviteData?.total || 0}</div>
            </div>

            <div className="rounded-lg bg-green-50 p-4">
              <div className="text-sm text-gray-600">累计获得奖励</div>
              <div className="mt-2 text-3xl font-bold text-green-600">
                ¥{inviteData?.totalreward_amount?.toFixed(2) || '0.00'}
              </div>
            </div>

            <div className="rounded-lg bg-purple-50 p-4">
              <div className="text-sm text-gray-600">每次邀请奖励</div>
              <div className="mt-2 text-3xl font-bold text-purple-600">
                ¥{inviteData?.config?.referrer_reward?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          {/* 配置信息 */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-gray-600">邀请次数限制</div>
                <div className="mt-1 text-lg font-medium text-gray-900">
                  {formatUsageLimit(inviteData?.config?.usage_limit || 0)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600">每次奖励金额</div>
                <div className="mt-1 text-lg font-medium text-gray-900">
                  ¥{inviteData?.config?.referrer_reward?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* 邀请列表 */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">邀请记录</h3>

            {inviteData?.items && inviteData.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        被邀请用户
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        邀请时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        奖励金额
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        触发方式
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {inviteData.items.map((item: InviteItem) => {
                      const status = getStatusDisplay(item.status)
                      return (
                        <tr key={item.invitee_id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.invitee.username}
                            </div>
                            <div className="text-xs text-gray-500">ID: {item.invitee_id}</div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                            {formatDate(item.invited_at)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-600">
                            +¥{parseFloat(item.reward_amount).toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                            {item.triggered_by === 'on_register' ? '注册时' : item.triggered_by}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status.className}`}
                            >
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <div className="text-gray-500">暂无邀请记录，快去邀请好友吧！</div>
              </div>
            )}

            {/* 分页 */}
            {inviteData && inviteData.items && inviteData.items.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">共 {inviteData.total} 条记录</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInvitePage((prev) => Math.max(1, prev - 1))}
                    disabled={invitePage === 1}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvitePage((prev) => prev + 1)}
                    disabled={invitePage * inviteLimit >= inviteData.total}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
