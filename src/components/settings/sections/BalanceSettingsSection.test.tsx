import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { RechargeConfig, RechargePackage } from '@/types/api'

import { BalanceSettingsSection } from './BalanceSettingsSection'

const mockGetRechargeConfig = jest.fn<() => Promise<RechargeConfig>>()
const mockCreateOrder = jest.fn<() => Promise<{ code_url: string; out_trade_no: string }>>()
const mockSetAuthUser = jest.fn()

jest.mock('@/api/services/billing.service', () => ({
  billingService: {
    getRechargeConfig: () => mockGetRechargeConfig(),
    createOrder: () => mockCreateOrder(),
  },
}))

jest.mock('@/api/services', () => ({
  userService: {
    getCurrentUser: jest.fn(),
  },
}))

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { setUser: typeof mockSetAuthUser }) => unknown) =>
    selector({ setUser: mockSetAuthUser }),
}))

const rechargeConfig: RechargeConfig = {
  id: 1,
  min_amount: 1,
  max_amount: 10000,
  allow_decimal: 1,
  enable_bonus: 1,
  is_enabled: 1,
  min_bonus_eligible_amount: 100,
  rate: 20,
  updated_at: '2026-06-01T00:00:00.000Z',
}

const rechargePackage: RechargePackage = {
  id: 1,
  name: '基础套餐',
  recharge_amount: 100,
  bonus_amount: 20,
  is_recommended: 1,
  sort_order: 1,
  is_active: 1,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
  amount: 100,
  bonusAmount: 20,
  recommended: true,
  sortOrder: 1,
  description: '基础套餐',
}

describe('BalanceSettingsSection', () => {
  beforeEach(() => {
    mockGetRechargeConfig.mockReset()
    mockCreateOrder.mockReset()
    mockSetAuthUser.mockReset()
    mockGetRechargeConfig.mockResolvedValue(rechargeConfig)
  })

  test('keeps payment method choices visually disabled while an order is being created', async () => {
    const user = userEvent.setup()
    mockCreateOrder.mockReturnValue(new Promise(() => undefined))

    render(
      <BalanceSettingsSection
        themeColor="#10b981"
        userBalance={12.5}
        customRechargeAmount=""
        onCustomAmountChange={jest.fn()}
        rechargePackages={[rechargePackage]}
        isLoadingPackages={false}
        packagesError={null}
      />,
    )

    await waitFor(() => {
      expect(mockGetRechargeConfig).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getAllByRole('button', { name: /立即充值/ })[0])

    const alipayButton = screen.getByRole('button', { name: /支付宝/ })
    const wechatButton = screen.getByRole('button', { name: /微信支付/ })

    await waitFor(() => {
      expect(alipayButton).toBeDisabled()
      expect(wechatButton).toBeDisabled()
    })
    expect(alipayButton).toHaveClass('disabled:cursor-not-allowed')
    expect(alipayButton).toHaveClass('disabled:opacity-60')
    expect(wechatButton).toHaveClass('disabled:cursor-not-allowed')
    expect(wechatButton).toHaveClass('disabled:opacity-60')
  })

  test('announces package loading errors as alerts', () => {
    render(
      <BalanceSettingsSection
        themeColor="#10b981"
        userBalance={12.5}
        customRechargeAmount=""
        onCustomAmountChange={jest.fn()}
        rechargePackages={[]}
        isLoadingPackages={false}
        packagesError="套餐加载失败，请稍后重试"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('套餐加载失败，请稍后重试')
  })

  test('links custom amount validation errors to the amount field', async () => {
    render(
      <BalanceSettingsSection
        themeColor="#10b981"
        userBalance={12.5}
        customRechargeAmount="0"
        onCustomAmountChange={jest.fn()}
        rechargePackages={[rechargePackage]}
        isLoadingPackages={false}
        packagesError={null}
      />,
    )

    await waitFor(() => {
      expect(mockGetRechargeConfig).toHaveBeenCalledTimes(1)
    })

    const amountInput = screen.getByRole('textbox')
    const errorMessage = screen.getByText(/最低充值/)

    expect(amountInput).toHaveAttribute('aria-invalid', 'true')
    expect(amountInput).toHaveAttribute('aria-describedby', errorMessage.id)
  })

  test('announces order creation errors as alerts', async () => {
    const user = userEvent.setup()
    mockCreateOrder.mockRejectedValue(new Error('网络错误'))

    render(
      <BalanceSettingsSection
        themeColor="#10b981"
        userBalance={12.5}
        customRechargeAmount=""
        onCustomAmountChange={jest.fn()}
        rechargePackages={[rechargePackage]}
        isLoadingPackages={false}
        packagesError={null}
      />,
    )

    await waitFor(() => {
      expect(mockGetRechargeConfig).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getAllByRole('button', { name: /立即充值/ })[0])

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('创建订单失败')
    })
  })

  test('does not log payment response data when an Alipay URL is invalid', async () => {
    const user = userEvent.setup()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const response = {
      code_url: 'not-a-url',
      out_trade_no: 'secret-order-number',
    }
    mockCreateOrder.mockResolvedValue(response)

    render(
      <BalanceSettingsSection
        themeColor="#10b981"
        userBalance={12.5}
        customRechargeAmount=""
        onCustomAmountChange={jest.fn()}
        rechargePackages={[rechargePackage]}
        isLoadingPackages={false}
        packagesError={null}
      />,
    )

    await waitFor(() => expect(mockGetRechargeConfig).toHaveBeenCalledTimes(1))
    await user.click(screen.getAllByRole('button', { name: /立即充值/ })[0])

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('[billing] Alipay payment URL rejected')
    })
    expect(warnSpy).not.toHaveBeenCalledWith(expect.any(String), response)
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('secret-order-number')
  })

  test('announces successful payment handoff as a status update', async () => {
    const user = userEvent.setup()
    const openSpy = jest.spyOn(window, 'open').mockReturnValue(null)
    mockCreateOrder.mockResolvedValue({
      code_url: 'https://qr.alipay.com/test',
      out_trade_no: 'order-1',
    })

    render(
      <BalanceSettingsSection
        themeColor="#10b981"
        userBalance={12.5}
        customRechargeAmount=""
        onCustomAmountChange={jest.fn()}
        rechargePackages={[rechargePackage]}
        isLoadingPackages={false}
        packagesError={null}
      />,
    )

    await waitFor(() => {
      expect(mockGetRechargeConfig).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getByRole('button', { name: /立即充值/ }))

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        'https://qr.alipay.com/test',
        '_blank',
        'noopener,noreferrer',
      )
      expect(screen.getByRole('status')).toHaveTextContent('已尝试打开支付宝支付页面')
    })

    openSpy.mockRestore()
  })
})
