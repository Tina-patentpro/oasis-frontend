import React, { useState, useMemo, useEffect, useId, useCallback } from 'react'

import { getRechargePackages, calculateTotalAmount } from '../constants'
import { billingService } from '@/api/services'
import type { RechargeConfig } from '@/types/api'
import { validateRechargeAmountInput } from '@/utils/validators'
import { AccessibleDialog } from './ui/feedback/AccessibleDialog'

interface RechargeDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number, bonusAmount: number, packageId?: string) => void
  currentBalance: number
  themeColor: string
}

type RechargeMode = 'package' | 'custom'

export const RechargeDialog: React.FC<RechargeDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentBalance,
  themeColor,
}) => {
  const [mode, setMode] = useState<RechargeMode>('package')
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [customAmount, setCustomAmount] = useState<string>('0')
  const [amountError, setAmountError] = useState<string>('')
  const [rechargeConfig, setRechargeConfig] = useState<RechargeConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState('')
  const titleId = useId()
  const descriptionId = useId()

  // 获取充值套餐配置（从CMS）
  const packages = useMemo(() => getRechargePackages(), [])

  // 获取充值配置
  const loadRechargeConfig = useCallback(async () => {
    setConfigLoading(true)
    setConfigError('')
    setRechargeConfig(null)

    try {
      const config = await billingService.getRechargeConfig()
      setRechargeConfig(config)
    } catch (error) {
      console.error('[RechargeDialog] 获取充值配置失败:', error)
      setConfigError('充值配置加载失败，请重试')
    } finally {
      setConfigLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadRechargeConfig()
    }
  }, [isOpen, loadRechargeConfig])

  // 计算自定义充值的赠送金额
  const calculateCustomBonusAmount = (amount: number): number => {
    if (!rechargeConfig || rechargeConfig.enable_bonus === 0) {
      return 0
    }

    const minAmount = rechargeConfig.min_bonus_eligible_amount || 0

    // 检查是否达到最低赠送门槛
    if (amount < minAmount) {
      return 0
    }

    // 使用接口返回的 rate 字段计算赠送金额
    // rate 是百分比，例如 40 表示 40%
    const bonusRate = rechargeConfig.rate || 0
    return amount * (bonusRate / 100)
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setAmountError('')

    const validation = validateRechargeAmountInput(value, rechargeConfig)
    if (value && !validation.valid) {
      setAmountError(validation.error ?? '请输入有效的充值金额')
    }
  }

  const handleConfirm = () => {
    if (configLoading || configError) {
      return
    }

    if (mode === 'package') {
      const pkg = packages.find((p) => String(p.id) === selectedPackage)
      if (pkg) {
        onConfirm(pkg.amount, pkg.bonusAmount, selectedPackage)
        onClose()
      }
    } else {
      const amount = parseFloat(customAmount)
      const validation = validateRechargeAmountInput(customAmount, rechargeConfig)
      if (validation.valid) {
        const bonusAmount = calculateCustomBonusAmount(amount)
        onConfirm(amount, bonusAmount)
        onClose()
      } else {
        setAmountError(validation.error ?? '请输入有效的充值金额')
      }
    }
  }

  const selectedPkg = packages.find((p) => String(p.id) === selectedPackage)
  const customAmountNum = parseFloat(customAmount) || 0
  const isConfigUnavailable = configLoading || Boolean(configError)

  const previewAmount =
    mode === 'package'
      ? selectedPkg
        ? calculateTotalAmount(selectedPkg)
        : 0
      : customAmountNum + calculateCustomBonusAmount(customAmountNum)

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ backgroundColor: `${themeColor}10` }}>
        <h2 id={titleId} className="text-lg font-bold text-gray-900">
          账户充值
        </h2>
        <p id={descriptionId} className="text-sm text-gray-600 mt-1">
          当前余额：
          <span className="font-semibold text-emerald-600">¥{currentBalance.toFixed(2)}</span>
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="px-6 pt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('package')
            setCustomAmount('0')
            setAmountError('')
          }}
          className={`flex-1 rounded-lg px-4 py-2 font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform] ${
            mode === 'package'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          定额充值
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('custom')
            setCustomAmount('0')
            setAmountError('')
          }}
          className={`flex-1 rounded-lg px-4 py-2 font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform] ${
            mode === 'custom'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          自定义金额
        </button>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[300px]">
        {configError && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{configError}</span>
            <button
              type="button"
              onClick={() => void loadRechargeConfig()}
              disabled={configLoading}
              className="shrink-0 rounded-md border border-red-200 bg-white px-3 py-1 font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              重试
            </button>
          </div>
        )}
        {mode === 'package' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">选择充值套餐，享受额外赠送优惠</p>
            {packages.map((pkg) => (
              <label
                key={pkg.id}
                className={`block cursor-pointer rounded-lg border-2 p-4 transition-[background-color,border-color,color,box-shadow,opacity,transform] focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-400 focus-within:ring-offset-2 ${
                  selectedPackage === String(pkg.id)
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                } ${pkg.recommended ? 'relative' : ''}`}
              >
                {pkg.recommended && (
                  <span className="absolute -top-2 -right-2 px-2 py-1 bg-emerald-600 text-white text-xs rounded-full">
                    推荐
                  </span>
                )}
                <input
                  aria-label={`选择充值套餐 ${pkg.name}`}
                  type="radio"
                  name="package"
                  value={String(pkg.id)}
                  checked={selectedPackage === String(pkg.id)}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{pkg.name}</div>
                    {pkg.description && (
                      <div className="text-sm text-gray-600 mt-1">{pkg.description}</div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-emerald-600">¥{pkg.amount}</div>
                    {pkg.bonusAmount > 0 && (
                      <div className="text-sm text-gray-500">赠送 ¥{pkg.bonusAmount}</div>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              输入任意充值金额
              {rechargeConfig
                ? `（最低${rechargeConfig.min_amount}元，最高${rechargeConfig.max_amount}元）`
                : '（最低1元）'}
            </p>
            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                  ¥
                </span>
                <input
                  aria-label="自定义充值金额"
                  type="text"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-10 pr-4 py-3 text-2xl border-2 rounded-lg focus:outline-none focus:ring-2 ${
                    amountError
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-gray-200 focus:ring-emerald-400'
                  }`}
                />
              </div>
              {amountError && <p className="mt-2 text-sm text-red-600">{amountError}</p>}
              <p className="mt-2 text-xs text-gray-500">支持小数点后两位，例如：100.50</p>
            </div>

            {/* 快捷金额按钮 */}
            <div>
              <p className="text-sm text-gray-600 mb-2">快捷金额</p>
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 200, 500].map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    onClick={() => handleCustomAmountChange(amount.toString())}
                    className="px-3 py-2 border border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>
            </div>

            {/* 赠送提示 */}
            {customAmountNum > 0 && rechargeConfig && rechargeConfig.enable_bonus === 1 && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                {customAmountNum < rechargeConfig.min_bonus_eligible_amount ? (
                  <p className="text-sm text-emerald-800">
                    💡 充值满 ¥{rechargeConfig.min_bonus_eligible_amount} 可享受赠送优惠
                  </p>
                ) : (
                  (() => {
                    const bonusAmount = calculateCustomBonusAmount(customAmountNum)
                    const isValidBonus = bonusAmount > 0 && !isNaN(bonusAmount)
                    const bonusRate = rechargeConfig.rate || 0
                    return isValidBonus ? (
                      <p className="text-sm text-emerald-800">
                        🎁 赠送 ¥{bonusAmount.toFixed(2)}（赠送比例 {bonusRate}%）
                      </p>
                    ) : (
                      <p className="text-sm text-emerald-800">💡 输入有效金额查看赠送优惠</p>
                    )
                  })()
                )}
              </div>
            )}

            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">💡 提示：选择定额套餐可享受固定赠送优惠</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            充值后余额：
            <span className="ml-2 text-lg font-semibold text-emerald-600">
              ¥{(currentBalance + previewAmount).toFixed(2)}
            </span>
          </div>
          {mode === 'package' && selectedPkg && selectedPkg.bonusAmount > 0 && (
            <div className="text-sm text-gray-500">含赠送 ¥{selectedPkg.bonusAmount}</div>
          )}
          {mode === 'custom' &&
            (() => {
              const bonusAmount = calculateCustomBonusAmount(customAmountNum)
              const isValidBonus = bonusAmount > 0 && !isNaN(bonusAmount) && customAmountNum > 0
              return isValidBonus && rechargeConfig && rechargeConfig.enable_bonus === 1 ? (
                <div className="text-sm text-gray-500">含赠送 ¥{bonusAmount.toFixed(2)}</div>
              ) : null
            })()}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              isConfigUnavailable ||
              (mode === 'package'
                ? !selectedPackage
                : !customAmount ||
                  !!amountError ||
                  !validateRechargeAmountInput(customAmount, rechargeConfig).valid)
            }
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            确认充值 {previewAmount > 0 && `¥${previewAmount.toFixed(2)}`}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500 text-center">
          建议仅充值近期会使用的额度 · 开发票需求请联系客服
        </p>
      </div>
    </AccessibleDialog>
  )
}
