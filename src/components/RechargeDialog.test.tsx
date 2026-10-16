import React from 'react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { RechargeConfig } from '@/types/api'

import { RechargeDialog } from './RechargeDialog'

const mockGetRechargeConfig = jest.fn<() => Promise<RechargeConfig>>()

jest.mock('../constants', () => ({
  getRechargePackages: () => [
    {
      id: 'basic',
      name: '基础套餐',
      amount: 100,
      bonusAmount: 20,
      recommended: true,
      description: '适合小额测试',
    },
  ],
  validateCustomAmount: (amount: number) => Number.isFinite(amount) && amount >= 1,
  calculateTotalAmount: (pkg: { amount: number; bonusAmount: number }) =>
    pkg.amount + pkg.bonusAmount,
}))

jest.mock('@/api/services', () => ({
  billingService: {
    getRechargeConfig: () => mockGetRechargeConfig(),
  },
}))

function RechargeDialogHarness({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <RechargeDialog
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setIsOpen(false)
      }}
      onConfirm={jest.fn()}
      currentBalance={12.5}
      themeColor="#10b981"
    />
  )
}

describe('RechargeDialog', () => {
  beforeEach(() => {
    mockGetRechargeConfig.mockReset()
    mockGetRechargeConfig.mockResolvedValue({
      id: 1,
      min_amount: 1,
      max_amount: 10000,
      allow_decimal: 1,
      enable_bonus: 1,
      is_enabled: 1,
      min_bonus_eligible_amount: 100,
      rate: 20,
      updated_at: '2026-06-01T00:00:00.000Z',
    })
  })

  test('renders as an accessible recharge dialog and loads config', async () => {
    render(
      <RechargeDialog
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        currentBalance={12.5}
        themeColor="#10b981"
      />,
    )

    const dialog = screen.getByRole('dialog', { name: '账户充值' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('当前余额： ¥12.50')
    const firstPackageOption = screen.getAllByRole('radio')[0]
    expect(firstPackageOption.closest('label')).toHaveClass('focus-within:ring-2')
    expect(firstPackageOption.closest('label')).toHaveClass('focus-within:ring-emerald-400')
    await waitFor(() => {
      expect(mockGetRechargeConfig).toHaveBeenCalledTimes(1)
    })
  })

  test('closes with Escape and restores background scrolling', async () => {
    const onClose = jest.fn()
    const previousOverflow = document.body.style.overflow

    render(<RechargeDialogHarness onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: '账户充值' })
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '账户充值' })).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe(previousOverflow)
  })

  test('confirms a valid custom amount with calculated bonus', async () => {
    const user = userEvent.setup()
    const onConfirm = jest.fn()

    render(
      <RechargeDialog
        isOpen
        onClose={jest.fn()}
        onConfirm={onConfirm}
        currentBalance={12.5}
        themeColor="#10b981"
      />,
    )

    await user.click(screen.getByRole('button', { name: '自定义金额' }))
    const amountInput = screen.getByRole('textbox', { name: '自定义充值金额' })
    await user.clear(amountInput)
    await user.type(amountInput, '100')
    await user.click(screen.getByRole('button', { name: '确认充值 ¥120.00' }))

    expect(onConfirm).toHaveBeenCalledWith(100, 20)
  })

  test('shows retryable error when recharge config fails to load', async () => {
    const user = userEvent.setup()
    mockGetRechargeConfig.mockRejectedValueOnce(new Error('network error'))

    render(
      <RechargeDialog
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        currentBalance={12.5}
        themeColor="#10b981"
      />,
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('充值配置加载失败，请重试')

    await user.click(screen.getByRole('button', { name: '重试' }))

    await waitFor(() => {
      expect(mockGetRechargeConfig).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.queryByText('充值配置加载失败，请重试')).not.toBeInTheDocument()
    })
  })
})
