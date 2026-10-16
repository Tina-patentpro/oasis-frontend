import type { FC } from 'react'

import type { ReferralCode, ReferralRecord } from '../../../../types/common'

interface ReferralRewardCardProps {
  themeColor: string
  myReferralCode: ReferralCode | null
  referralRecords: ReferralRecord[]
  onCopyReferralCode: () => Promise<void>
  isGeneratingReferralCode: boolean
  onGenerateReferralCode: () => Promise<void>
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

export const ReferralRewardCard: FC<ReferralRewardCardProps> = ({
  themeColor,
  myReferralCode,
  referralRecords,
  onCopyReferralCode,
  isGeneratingReferralCode,
  onGenerateReferralCode,
  isLoading,
  error,
  onRetry,
}) => (
  <div className="border-t pt-6 space-y-6">
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-1">推荐奖励</h4>
      <p className="text-sm text-gray-500">分享您的推荐码获得奖励</p>
    </div>

    <div className="border-2 rounded-xl p-6" style={{ borderColor: `${themeColor}30` }}>
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">💰</span>
        <div className="flex-1">
          <h5 className="font-semibold text-gray-900 mb-1">我的推荐码</h5>
          <p className="text-sm text-gray-600">
            分享您的专属推荐码，每成功推荐一位好友即可获得奖励
          </p>
        </div>
      </div>

      {isLoading ? (
        <div
          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
          role="status"
        >
          正在加载推荐信息…
        </div>
      ) : error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100"
            onClick={onRetry}
          >
            重新加载
          </button>
        </div>
      ) : myReferralCode ? (
        <div className="space-y-4">
          <div
            className="rounded-lg p-4 border-2"
            style={{
              backgroundColor: `${themeColor}08`,
              borderColor: `${themeColor}30`,
              borderStyle: 'dashed',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">您的专属推荐码</div>
                <div className="text-3xl font-bold tracking-wider" style={{ color: themeColor }}>
                  {myReferralCode.code}
                </div>
              </div>
              <button
                type="button"
                onClick={onCopyReferralCode}
                className="rounded-lg border-2 px-4 py-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-md"
                style={{
                  borderColor: themeColor,
                  color: themeColor,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = `${themeColor}15`
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                📋 复制
              </button>
            </div>

            <div
              className="grid grid-cols-3 gap-3 pt-3 border-t"
              style={{ borderColor: `${themeColor}20` }}
            >
              <div>
                <div className="text-xs text-gray-500 mb-0.5">已使用次数</div>
                <div className="text-lg font-semibold" style={{ color: themeColor }}>
                  {myReferralCode.maxUses === 0
                    ? `${myReferralCode.usedCount}/不限`
                    : myReferralCode.maxUses === -1
                      ? '已停用'
                      : `${myReferralCode.usedCount}/${myReferralCode.maxUses}`}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">单次奖励</div>
                <div className="text-lg font-semibold text-emerald-600">
                  ¥{myReferralCode.rewardAmount}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">累计收益</div>
                <div className="text-lg font-semibold text-emerald-600">
                  ¥{myReferralCode.totalEarned}
                </div>
              </div>
            </div>
          </div>

          {referralRecords.length > 0 && (
            <div>
              <h6 className="text-sm font-medium text-gray-700 mb-2">推荐记录</h6>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        时间
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        类型
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        奖励
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {referralRecords.slice(0, 5).map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">{record.date}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              record.type === 'earned'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {record.type === 'earned' ? '推荐成功' : '使用推荐码'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-600">
                          +¥{record.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
          <p className="font-medium text-gray-700">当前账户暂未分配推荐码</p>
          <p className="mt-1">点击下方按钮，由系统为当前账户生成专属推荐码。</p>
          <button
            type="button"
            className="mt-3 rounded-lg px-4 py-2 font-medium text-white transition-[background-color,box-shadow,opacity] hover:shadow-md disabled:cursor-wait disabled:opacity-60"
            style={{ backgroundColor: themeColor }}
            disabled={isGeneratingReferralCode}
            onClick={() => void onGenerateReferralCode()}
          >
            {isGeneratingReferralCode ? '正在生成…' : '生成我的推荐码'}
          </button>
        </div>
      )}
    </div>

    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">💡</span>
        <div className="text-sm text-amber-800">
          <div className="font-medium mb-1">推荐规则</div>
          <ul className="list-disc list-inside space-y-1 text-amber-700">
            <li>每个推荐码有使用次数限制（由系统配置）</li>
            <li>每位新用户只能使用一次推荐码</li>
            <li>推荐奖励金额由系统配置决定</li>
            <li>奖励将自动发放到您的账户余额</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
)
