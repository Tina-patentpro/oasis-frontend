import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { QuickCreateProjectDialog } from './QuickCreateProjectDialog'

describe('QuickCreateProjectDialog', () => {
  test('announces validation errors and focuses the invalid field', async () => {
    const user = userEvent.setup()
    const onConfirm = jest.fn<(projectName: string, customerName: string) => void>()

    render(
      <QuickCreateProjectDialog
        isOpen
        onClose={jest.fn()}
        onConfirm={onConfirm}
        themeColor="#10b981"
      />,
    )

    await user.click(screen.getByRole('button', { name: '创建项目' }))

    const projectNameInput = screen.getByLabelText(/项目名称/)
    await waitFor(() => expect(projectNameInput).toHaveFocus())
    expect(projectNameInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('项目名称不能为空')

    await user.type(projectNameInput, '智能机器人导航系统')
    await user.click(screen.getByRole('button', { name: '创建项目' }))

    const customerInput = screen.getByLabelText(/客户/)
    await waitFor(() => expect(customerInput).toHaveFocus())
    expect(customerInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('客户名称不能为空')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('disables submit while project creation is pending', async () => {
    const user = userEvent.setup()
    let resolveConfirm: () => void = () => undefined
    const onConfirm = jest.fn<(projectName: string, customerName: string) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve
        }),
    )
    const onClose = jest.fn()

    render(
      <QuickCreateProjectDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        themeColor="#10b981"
      />,
    )

    await user.type(screen.getByLabelText(/项目名称/), '智能机器人导航系统')
    await user.type(screen.getByLabelText(/客户/), '星矩机器人')

    const submitButton = screen.getByRole('button', { name: '创建项目' })
    await user.click(submitButton)

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent('创建中')

    await user.click(submitButton)

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()

    resolveConfirm()

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
