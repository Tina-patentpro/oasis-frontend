import React, { useState, useEffect } from 'react'

import { billingService } from '@/api/services/billing.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUIStore } from '@/stores/useUIStore'
import type { UserRunningRecord } from '@/types/api'

import { SettingsSectionHeader } from '../common/SettingsSectionHeader'

interface UsageSettingsSectionProps {
  themeColor: string
}

export const UsageSettingsSection: React.FC<UsageSettingsSectionProps> = ({ themeColor }) => {
  const user = useAuthStore((state) => state.user)
  const [records, setRecords] = useState<UserRunningRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 构建导出URL
  const exportUrl = user?.id ? `/recharge/exportrunningwater?uid=${user.id}` : '#'

  // 获取流水记录
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await billingService.getRunningWaterList({ page, limit })
        setRecords(response.items)
        setTotal(response.total)
      } catch (err) {
        console.error('获取使用记录失败:', err)
        setError('加载失败，请稍后重试')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecords()
  }, [page, limit])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <SettingsSectionHeader title="使用记录" description="查看您的账户交易明细" />

      <div>
        <div className="flex items-center justify-end mb-3">
          <a
            href={exportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium transition-colors inline-flex items-center gap-1"
            style={{ color: themeColor }}
            onMouseEnter={(event) => {
              event.currentTarget.style.opacity = '0.8'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.opacity = '1'
            }}
            onClick={(e) => {
              if (!user?.id) {
                e.preventDefault()
                useUIStore.getState().showToast('请先登录')
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            导出记录
          </a>
        </div>

        {isLoading ? (
          <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            正在加载…
          </div>
        ) : error ? (
          <div
            className="border border-red-200 rounded-lg bg-red-50 p-4 text-sm text-red-600"
            role="alert"
          >
            {error}
          </div>
        ) : records.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            暂无使用记录
          </div>
        ) : (
          <>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">金额</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">余额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record, index) => {
                    return (
                      <tr key={`${record.create_time}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(record.create_time).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{record.type}</td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-medium ${
                            record.pm === 1 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {record.pm === 1 ? '+' : '-'}
                          {record.money.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {record.balance.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  共 {total} 条记录，第 {page} / {totalPages} 页
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: page < totalPages ? themeColor : undefined,
                      color: page < totalPages ? 'white' : undefined,
                      borderColor: page < totalPages ? themeColor : undefined,
                    }}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

UsageSettingsSection.displayName = 'UsageSettingsSection'
