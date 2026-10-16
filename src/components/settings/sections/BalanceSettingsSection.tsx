import { useState, useEffect, useCallback } from 'react'
import { useId, type FC } from 'react'

import type { RechargePackage, RechargeConfig } from '@/types/api'
import { billingService } from '@/api/services/billing.service'
import { userService } from '@/api/services'
import { useAuthStore } from '@/stores/useAuthStore'

import { SettingsSectionHeader } from '../common/SettingsSectionHeader'
import { WeChatPayDialog } from '../WeChatPayDialog'

interface BalanceSettingsSectionProps {
  themeColor: string
  userBalance: number
  customRechargeAmount: string
  onCustomAmountChange: (value: string) => void
  rechargePackages: RechargePackage[]
  isLoadingPackages: boolean
  packagesError: string | null
}

export const BalanceSettingsSection: FC<BalanceSettingsSectionProps> = ({
  themeColor,
  userBalance,
  customRechargeAmount,
  onCustomAmountChange,
  rechargePackages,
  isLoadingPackages,
  packagesError,
}) => {
  const setAuthUser = useAuthStore((state) => state.setUser)
  const [paymentMethod, setPaymentMethod] = useState<'alipay' | 'wechat'>('alipay')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payCodeUrl, setPayCodeUrl] = useState('')
  const [payAmount, setPayAmount] = useState(0)
  const [payOutTradeNo, setPayOutTradeNo] = useState('')
  const [rechargeConfig, setRechargeConfig] = useState<RechargeConfig | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  // 获取充值配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoadingConfig(true)
        const config = await billingService.getRechargeConfig()
        setRechargeConfig(config)
      } catch (error) {
        console.error('获取充值配置失败:', error)
      } finally {
        setIsLoadingConfig(false)
      }
    }

    fetchConfig()
  }, [])

  const customAmountId = useId()
  const customAmountNumber = parseFloat(customRechargeAmount) || 0

  // 根据配置验证金额
  const validateCustomAmount = () => {
    if (!rechargeConfig) return { valid: false, error: '配置正在加载…' }
    if (!customRechargeAmount || Number.isNaN(customAmountNumber))
      return { valid: false, error: '' }

    // 检查是否允许小数
    if (
      rechargeConfig.allow_decimal === 0 &&
      customAmountNumber !== Math.floor(customAmountNumber)
    ) {
      return { valid: false, error: '请输入整数金额' }
    }

    // 检查最小金额
    if (customAmountNumber < rechargeConfig.min_amount) {
      return { valid: false, error: `最低充值${rechargeConfig.min_amount}元` }
    }

    // 检查最大金额
    if (customAmountNumber > rechargeConfig.max_amount) {
      return { valid: false, error: `最高充值${rechargeConfig.max_amount}元` }
    }

    return { valid: true, error: '' }
  }

  const validation = validateCustomAmount()
  const customAmountHasError = Boolean(validation.error && customRechargeAmount)
  const customAmountFeedbackId = `${customAmountId}-feedback`
  const canSubmitCustom = validation.valid

  // 根据配置计算赠送金额
  const calculateBonus = () => {
    if (!rechargeConfig || rechargeConfig.enable_bonus === 0) return 0
    if (!customAmountNumber || customAmountNumber < rechargeConfig.min_bonus_eligible_amount)
      return 0

    // 使用接口返回的 rate 字段计算赠送金额
    // rate 是百分比，例如 40 表示 40%
    const bonusRate = rechargeConfig.rate || 0
    return customAmountNumber * (bonusRate / 100)
  }

  const bonusAmount = calculateBonus()
  const customBonusAmount = (isNaN(bonusAmount) ? 0 : bonusAmount).toFixed(2)
  const customBonusRate =
    bonusAmount > 0 && customAmountNumber > 0 ? bonusAmount / customAmountNumber : 0
  const paymentOptions: Array<{ value: 'alipay' | 'wechat'; label: string; hint: string }> = [
    { value: 'alipay', label: '支付宝', hint: '支持扫码 / H5 支付' },
    { value: 'wechat', label: '微信支付', hint: '微信内完成支付流程' },
  ]

  const handlePaymentSuccess = useCallback(() => {
    setErrorMessage(null)
    setStatusMessage('支付成功，正在同步最新余额…')

    void (async () => {
      try {
        const latestUser = await userService.getCurrentUser()
        setAuthUser(latestUser)
        setStatusMessage('支付成功，余额已更新')
      } catch (error) {
        console.error('[billing] 支付成功后同步余额失败:', error)
        setStatusMessage('支付成功，余额同步稍有延迟，请稍后刷新')
      }
    })()
  }, [setAuthUser])

  const handleCreateOrder = async (amount: number, bonusAmount: number) => {
    setIsProcessing(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const type = paymentMethod === 'wechat' ? 1 : 2
      const response = await billingService.createOrder({
        amount,
        bonus_amount: bonusAmount,
        type,
      })

      if (paymentMethod === 'wechat') {
        setPayCodeUrl(response.code_url)
        setPayAmount(amount)
        setPayOutTradeNo(response.out_trade_no)
        setPayDialogOpen(true)
      } else {
        // 支付宝支付处理
        const ALLOWED_PAYMENT_DOMAINS = ['qr.alipay.com', 'wx.tenpay.com', 'wxpay.com']
        if (response.code_url) {
          try {
            const url = new URL(response.code_url)
            if (
              url.protocol === 'https:' &&
              ALLOWED_PAYMENT_DOMAINS.some(
                (d) => url.hostname === d || url.hostname.endsWith('.' + d),
              )
            ) {
              window.open(response.code_url, '_blank', 'noopener,noreferrer')
              setStatusMessage('已尝试打开支付宝支付页面，请在新窗口完成支付')
            } else {
              setErrorMessage('支付链接无效，请使用微信支付或联系客服')
              console.warn('[billing] Alipay payment URL rejected')
            }
          } catch {
            // Invalid URL, don't open
            setErrorMessage('支付宝支付暂未完全集成，请使用微信支付')
            console.warn('[billing] Alipay payment URL rejected')
          }
        } else {
          setErrorMessage('支付宝支付暂未完全集成，请使用微信支付')
          console.warn('[billing] Alipay payment URL rejected')
        }
      }
    } catch (error) {
      console.error('[创建订单] 错误详情:', error)
      setErrorMessage(`创建订单失败: ${error instanceof Error ? error.message : '请稍后重试'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const renderPackages = () => {
    if (isLoadingPackages) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="animate-pulse rounded-xl border border-gray-200 bg-gray-100/60 p-4"
            >
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="mt-4 h-6 w-32 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-24 rounded bg-gray-200" />
              <div className="mt-5 h-9 w-full rounded-lg bg-gray-200" />
            </div>
          ))}
        </div>
      )
    }

    if (packagesError) {
      return (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          role="alert"
        >
          {packagesError}
        </div>
      )
    }

    if (!rechargePackages || !rechargePackages.length) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
          暂无可用充值套餐，请稍后再试或联系管理员。
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rechargePackages.map((pkg) => {
          const highlight = pkg.is_recommended === 1 || pkg.bonus_amount > 0
          return (
            <div
              key={pkg.id}
              className="group rounded-xl border-2 p-4 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg"
              style={
                highlight
                  ? {
                      borderColor: themeColor,
                      backgroundColor: `${themeColor}08`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                <span style={{ color: themeColor }}>💎 {pkg.name}</span>
                {pkg.is_recommended === 1 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">推荐</span>
                )}
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-900">¥{pkg.recharge_amount}</div>
              {pkg.bonus_amount > 0 ? (
                <div className="mt-1 text-sm" style={{ color: themeColor }}>
                  赠送 ¥{pkg.bonus_amount.toFixed(2)}
                </div>
              ) : (
                <div className="mt-1 h-5" />
              )}
              <button
                type="button"
                className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: themeColor }}
                onClick={() => handleCreateOrder(pkg.recharge_amount, pkg.bonus_amount)}
                disabled={isProcessing}
              >
                {isProcessing ? '处理中…' : '立即充值'}
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsSectionHeader title="充值/余额" description="管理您的账户余额和充值记录" />

      <div
        className="rounded-2xl border p-6"
        style={{
          background: `linear-gradient(to bottom right, ${themeColor}10, ${themeColor}20)`,
          borderColor: `${themeColor}40`,
        }}
      >
        <div className="text-sm" style={{ color: themeColor }}>
          当前余额
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="text-4xl font-bold"
            style={{ color: themeColor, filter: 'brightness(0.7)' }}
          >
            {userBalance.toFixed(2)}
          </span>
          <span className="text-lg" style={{ color: themeColor }}>
            元
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">支付方式</h4>
            <p className="text-xs text-gray-500 mt-1">选择当前充值所使用的支付渠道。</p>
          </div>
          <div className="flex gap-2 rounded-lg bg-white p-1 shadow-inner">
            {paymentOptions.map((option) => {
              const isActive = option.value === paymentMethod
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`flex flex-col rounded-md px-3 py-2 text-xs transition-[background-color,border-color,color,box-shadow,opacity,transform] disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive ? 'text-white shadow' : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={{
                    backgroundColor: isActive ? themeColor : 'transparent',
                    minWidth: '110px',
                  }}
                  onClick={() => setPaymentMethod(option.value)}
                  aria-pressed={isActive}
                  disabled={isProcessing}
                >
                  <span className="font-medium">{option.label}</span>
                  <span
                    className={`mt-1 leading-snug ${isActive ? 'text-white/80' : 'text-gray-500'}`}
                  >
                    {option.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-4 text-lg font-semibold text-gray-900">充值套餐</h4>
        {renderPackages()}
      </div>

      {rechargeConfig && rechargeConfig.is_enabled === 1 && (
        <div>
          <h4 className="mb-4 text-lg font-semibold text-gray-900">自定义金额</h4>
          <div className="rounded-xl border-2 border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="flex-1">
                  <label
                    className="mb-2 block text-sm font-medium text-gray-700"
                    htmlFor={customAmountId}
                  >
                    充值金额（元）
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ¥
                    </span>
                    <input
                      id={customAmountId}
                      type="text"
                      placeholder={
                        rechargeConfig
                          ? `${rechargeConfig.min_amount} - ${rechargeConfig.max_amount}`
                          : '0.00'
                      }
                      value={customRechargeAmount}
                      onChange={(event) => onCustomAmountChange(event.target.value)}
                      aria-invalid={customAmountHasError || undefined}
                      aria-describedby={customAmountFeedbackId}
                      className={`w-full rounded-lg border-2 py-2.5 pl-8 pr-3 text-base focus:outline-none focus:ring-2 ${
                        customAmountHasError
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'
                      }`}
                      disabled={isLoadingConfig || !rechargeConfig}
                    />
                  </div>
                  {customAmountHasError ? (
                    <p id={customAmountFeedbackId} className="mt-1.5 text-xs text-red-600">
                      {validation.error}
                    </p>
                  ) : (
                    <p id={customAmountFeedbackId} className="mt-1.5 text-xs text-gray-500">
                      {rechargeConfig
                        ? `${rechargeConfig.allow_decimal === 0 ? '仅支持整数，' : ''}最低${rechargeConfig.min_amount}元，最高${rechargeConfig.max_amount}元`
                        : '正在加载…'}
                    </p>
                  )}
                </div>

                <div className="flex-1">
                  <p className="mb-2 text-sm font-medium text-gray-700">赠送金额</p>
                  <div
                    className="flex items-center justify-between rounded-lg border-2 px-4 py-2.5"
                    style={{
                      backgroundColor: `${themeColor}08`,
                      borderColor: `${themeColor}30`,
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>🎁</span>
                      <span>
                        {customBonusRate > 0
                          ? `赠送 ${(customBonusRate * 100).toFixed(0)}%`
                          : rechargeConfig?.enable_bonus === 1
                            ? `赠送比例 ${rechargeConfig.rate}%`
                            : '暂不赠送'}
                      </span>
                    </div>
                    <div className="text-lg font-bold" style={{ color: themeColor }}>
                      ¥{customBonusAmount}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {rechargeConfig && rechargeConfig.enable_bonus === 1
                      ? `充值满 ¥${rechargeConfig.min_bonus_eligible_amount} 可享受赠送优惠（赠送比例 ${rechargeConfig.rate}%）`
                      : '当前未开启赠送优惠'}
                  </p>
                </div>

                <div className="flex flex-1 items-end justify-center">
                  <button
                    type="button"
                    className="w-full rounded-lg px-8 py-2.5 text-base font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                    style={{ backgroundColor: themeColor }}
                    onClick={() =>
                      handleCreateOrder(customAmountNumber, parseFloat(customBonusAmount))
                    }
                    disabled={!canSubmitCustom || isProcessing}
                  >
                    {isProcessing ? '处理中…' : '立即充值'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800">
                <div className="font-medium mb-1">使用说明</div>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>余额可用于生成各类文档与工作流任务。</li>
                  <li>不同文档类型消耗额度不同，可在使用记录中查看明细。</li>
                  <li>充值后永久有效，如需发票请联系企业服务人员。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {!errorMessage && statusMessage && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          role="status"
        >
          {statusMessage}
        </div>
      )}

      <WeChatPayDialog
        isOpen={payDialogOpen}
        onClose={() => setPayDialogOpen(false)}
        codeUrl={payCodeUrl}
        amount={payAmount}
        outTradeNo={payOutTradeNo}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}

BalanceSettingsSection.displayName = 'BalanceSettingsSection'
