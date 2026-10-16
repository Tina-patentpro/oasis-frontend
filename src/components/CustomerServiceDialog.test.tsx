import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CustomerServiceDialog } from './CustomerServiceDialog'

describe('CustomerServiceDialog', () => {
  test('exposes a named dialog and closes from the explicit close button', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(<CustomerServiceDialog isOpen onClose={onClose} themeColor="#10b981" />)

    expect(screen.getByRole('dialog', { name: '联系客服' })).toHaveAttribute('aria-modal', 'true')

    await user.click(screen.getByRole('button', { name: '关闭客服窗口' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
