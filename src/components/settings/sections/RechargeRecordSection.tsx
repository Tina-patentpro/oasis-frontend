import React, { useState, useEffect } from 'react'

import { billingService } from '@/api/services/billing.service'
import type { RechargeRecord } from '@/types/api'

import { SettingsSectionHeader } from '../common/SettingsSectionHeader'

interface RechargeRecordSectionProps {
  themeColor: string
}

export const RechargeRecordSection: React.FC<RechargeRecordSectionProps> = ({ themeColor }) => {
  const [records, setRecords] = useState<RechargeRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取充值记录
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await billingService.getRechargeList(page, limit)
        setRecords(response.items)
        setTotal(response.total)
      } catch (err) {
        console.error('获取充值记录失败:', err)
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
      <SettingsSectionHeader title="充值记录" description="查看您的账户充值明细" />

      <div>
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
            暂无充值记录
          </div>
        ) : (
          <>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      订单号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      支付时间
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      充值金额
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      赠送金额
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      总金额
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record, index) => {
                    return (
                      <tr key={`${record.order_no}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                          {record.order_no}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(record.pay_time).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          ¥{record.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-emerald-600">
                          {record.bonus_amount > 0 ? `+¥${record.bonus_amount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                          ¥{(record.amount + record.bonus_amount).toFixed(2)}
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

RechargeRecordSection.displayName = 'RechargeRecordSection'
