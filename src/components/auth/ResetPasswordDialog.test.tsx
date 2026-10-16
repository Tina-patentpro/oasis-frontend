import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ResetPasswordDialog } from './ResetPasswordDialog'

describe('ResetPasswordDialog', () => {
  test('exposes dialog semantics and closes with Escape', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(<ResetPasswordDialog isOpen onClose={onClose} />)

    expect(screen.getByRole('dialog', { name: '重置密码' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: '关闭重置密码弹窗' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
