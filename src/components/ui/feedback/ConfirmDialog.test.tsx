import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { ConfirmDialog } from './ConfirmDialog'

function ConfirmDialogHarness({ onCancel }: { onCancel: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        触发按钮
      </button>
      <ConfirmDialog
        isOpen={isOpen}
        title="删除项目"
        message="删除后无法恢复。"
        onConfirm={jest.fn()}
        onCancel={() => {
          onCancel()
          setIsOpen(false)
        }}
        danger
      />
    </div>
  )
}

describe('ConfirmDialog', () => {
  test('uses accessible modal behaviour and restores focus when closed with Escape', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()
    const previousOverflow = document.body.style.overflow

    render(<ConfirmDialogHarness onCancel={onCancel} />)

    const opener = screen.getByRole('button', { name: '触发按钮' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: '删除项目' })
    const cancelButton = screen.getByRole('button', { name: '取消' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('删除后无法恢复。')
    expect(document.body).toHaveStyle({ overflow: 'hidden' })
    await waitFor(() => expect(cancelButton).toHaveFocus())

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '删除项目' })).not.toBeInTheDocument()
    })
    await waitFor(() => expect(opener).toHaveFocus())
    expect(document.body.style.overflow).toBe(previousOverflow)
  })

  test('keeps ids unique when more than one confirmation dialog is rendered', () => {
    render(
      <>
        <ConfirmDialog
          isOpen
          title="第一个确认"
          message="第一条说明"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
        <ConfirmDialog
          isOpen
          title="第二个确认"
          message="第二条说明"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </>,
    )

    const firstDialog = screen.getByRole('dialog', { name: '第一个确认' })
    const secondDialog = screen.getByRole('dialog', { name: '第二个确认' })

    expect(firstDialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(secondDialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(firstDialog.getAttribute('aria-labelledby')).not.toBe(
      secondDialog.getAttribute('aria-labelledby'),
    )
    expect(firstDialog.getAttribute('aria-describedby')).not.toBe(
      secondDialog.getAttribute('aria-describedby'),
    )
  })
})
