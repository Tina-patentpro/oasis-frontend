import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { billingService } from '@/api/services/billing.service'

import { WeChatPayDialog } from './WeChatPayDialog'

jest.mock('@/api/services/billing.service', () => ({
  billingService: {
    queryOrderStatus: jest.fn(),
  },
}))

describe('WeChatPayDialog accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('exposes dialog semantics and a named close button', async () => {
    render(
      <WeChatPayDialog
        isOpen
        onClose={jest.fn()}
        codeUrl="weixin://pay/test"
        amount={99}
        outTradeNo=""
      />,
    )

    expect(screen.getByRole('dialog', { name: '微信支付' })).toHaveAttribute('aria-modal', 'true')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '关闭微信支付弹窗' })).toHaveFocus()
    })
  })

  test('closes the pending payment dialog with Escape', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <WeChatPayDialog
        isOpen
        onClose={onClose}
        codeUrl="weixin://pay/test"
        amount={99}
        outTradeNo=""
      />,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('verifies payment status instead of reporting success from the manual button', async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    const onClose = jest.fn()
    const queryOrderStatus = billingService.queryOrderStatus as jest.MockedFunction<
      typeof billingService.queryOrderStatus
    >
    queryOrderStatus.mockResolvedValue({ data: 0 })

    render(
      <WeChatPayDialog
        isOpen
        onClose={onClose}
        codeUrl="weixin://pay/test"
        amount={99}
        outTradeNo="order-1"
        onSuccess={onSuccess}
      />,
    )

    await user.click(screen.getByRole('button', { name: '我已完成支付' }))

    await waitFor(() => expect(queryOrderStatus).toHaveBeenCalledWith('order-1'))
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('restarts polling when the dialog is reopened for another order', async () => {
    const user = userEvent.setup()
    const queryOrderStatus = billingService.queryOrderStatus as jest.MockedFunction<
      typeof billingService.queryOrderStatus
    >
    queryOrderStatus.mockResolvedValue({ data: 0 })

    const { rerender } = render(
      <WeChatPayDialog
        isOpen
        onClose={jest.fn()}
        codeUrl="weixin://pay/order-1"
        amount={99}
        outTradeNo="order-1"
      />,
    )

    await waitFor(() => expect(queryOrderStatus).toHaveBeenCalledWith('order-1'))
    await user.click(screen.getByRole('button', { name: '取消' }))

    rerender(
      <WeChatPayDialog
        isOpen={false}
        onClose={jest.fn()}
        codeUrl="weixin://pay/order-1"
        amount={99}
        outTradeNo="order-1"
      />,
    )
    rerender(
      <WeChatPayDialog
        isOpen
        onClose={jest.fn()}
        codeUrl="weixin://pay/order-2"
        amount={199}
        outTradeNo="order-2"
      />,
    )

    await waitFor(() => expect(queryOrderStatus).toHaveBeenCalledWith('order-2'))
  })

  test('coalesces manual verification with an in-flight automatic status check', async () => {
    const user = userEvent.setup()
    const queryOrderStatus = billingService.queryOrderStatus as jest.MockedFunction<
      typeof billingService.queryOrderStatus
    >
    let resolveStatus: ((value: { data: 0 }) => void) | undefined
    queryOrderStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStatus = resolve
        }),
    )

    render(
      <WeChatPayDialog
        isOpen
        onClose={jest.fn()}
        codeUrl="weixin://pay/test"
        amount={99}
        outTradeNo="order-in-flight"
        onSuccess={jest.fn()}
      />,
    )

    await waitFor(() => expect(queryOrderStatus).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: '我已完成支付' }))
    await user.click(screen.getByRole('button', { name: '我已完成支付' }))

    expect(queryOrderStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveStatus?.({ data: 0 })
      await Promise.resolve()
    })
  })
})
