import React, { useState, useEffect } from 'react'

import { billingService } from '@/api/services/billing.service'
import type { RunningWaterRecord } from '@/types/api'

import { SettingsSectionHeader } from '../common/SettingsSectionHeader'

type RunningWaterType = 'consumption' | 'topup' | 'give' | 'refund' | ''

interface RunningWaterSectionProps {
  themeColor: string
}

export const RunningWaterSection: React.FC<RunningWaterSectionProps> = ({ themeColor }) => {
  const [records, setRecords] = useState<RunningWaterRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<RunningWaterType>('')

  // 获取流水记录
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await billingService.getRunningWaterList({
          page,
          limit,
          type: selectedType || undefined,
        })
        setRecords(response.items)
        setTotal(response.total)
      } catch (err) {
        console.error('获取流水记录失败:', err)
        setError('加载失败，请稍后重试')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecords()
  }, [page, limit, selectedType])

  const totalPages = Math.ceil(total / limit)

  // 类型筛选选项
  const typeOptions = [
    { value: '' as RunningWaterType, label: '全部' },
    { value: 'consumption' as RunningWaterType, label: '消费' },
    { value: 'topup' as RunningWaterType, label: '充值' },
    { value: 'give' as RunningWaterType, label: '赠送' },
    { value: 'refund' as RunningWaterType, label: '退费' },
  ]

  const handleTypeChange = (newType: RunningWaterType) => {
    setSelectedType(newType)
    setPage(1) // 重置到第一页
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SettingsSectionHeader title="流水记录" description="查看账户详细收支明细" />
        <div className="flex gap-2">
          {typeOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => handleTypeChange(option.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedType === option.value
                  ? 'text-white'
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              style={{
                backgroundColor: selectedType === option.value ? themeColor : undefined,
                borderColor: selectedType === option.value ? themeColor : undefined,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
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
          暂无流水记录
        </div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">标题</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">类型</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">金额</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    变化后的余额
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(record.create_time).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.type}</td>
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
                ))}
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
  )
}

RunningWaterSection.displayName = 'RunningWaterSection'
