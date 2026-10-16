import { describe, expect, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'

import { AccessibleDialog } from './AccessibleDialog'

function DialogHarness() {
  const [isOpen, setIsOpen] = useState(false)
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        打开弹窗
      </button>
      <AccessibleDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        labelledBy="test-dialog-title"
        initialFocusRef={cancelRef}
        className="rounded bg-white p-4"
      >
        <h2 id="test-dialog-title">测试弹窗</h2>
        <button type="button" ref={cancelRef} onClick={() => setIsOpen(false)}>
          取消
        </button>
        <button type="button">确认</button>
      </AccessibleDialog>
    </div>
  )
}

function StackedDialogHarness() {
  const [firstOpen, setFirstOpen] = useState(false)
  const [secondOpen, setSecondOpen] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setFirstOpen(true)}>
        打开第一层
      </button>
      <button type="button" onClick={() => setSecondOpen(true)}>
        打开第二层
      </button>
      <AccessibleDialog
        isOpen={firstOpen}
        onClose={() => setFirstOpen(false)}
        label="第一层弹窗"
        className="rounded bg-white p-4"
      >
        <button type="button" onClick={() => setFirstOpen(false)}>
          关闭第一层
        </button>
      </AccessibleDialog>
      <AccessibleDialog
        isOpen={secondOpen}
        onClose={() => setSecondOpen(false)}
        label="第二层弹窗"
        className="rounded bg-white p-4"
      >
        <button type="button" onClick={() => setSecondOpen(false)}>
          关闭第二层
        </button>
      </AccessibleDialog>
    </div>
  )
}

describe('AccessibleDialog', () => {
  test('locks background page scrolling while the dialog is open and restores it after close', async () => {
    const user = userEvent.setup()
    const previousOverflow = document.body.style.overflow
    render(<DialogHarness />)

    await user.click(screen.getByRole('button', { name: '打开弹窗' }))
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    await user.click(screen.getByRole('button', { name: '取消' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '测试弹窗' })).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe(previousOverflow)
  })

  test('keeps background scrolling locked until every stacked dialog is closed', async () => {
    const user = userEvent.setup()
    const previousOverflow = document.body.style.overflow
    render(<StackedDialogHarness />)

    await user.click(screen.getByRole('button', { name: '打开第一层' }))
    await user.click(screen.getByRole('button', { name: '打开第二层' }))
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    await user.click(screen.getByRole('button', { name: '关闭第一层' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '第一层弹窗' })).not.toBeInTheDocument()
    })
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    await user.click(screen.getByRole('button', { name: '关闭第二层' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '第二层弹窗' })).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe(previousOverflow)
  })

  test('sets dialog semantics and moves focus to the requested element', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    await user.click(screen.getByRole('button', { name: '打开弹窗' }))

    expect(screen.getByRole('dialog', { name: '测试弹窗' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus()
  })

  test('keeps dialog content above the overlay so inner buttons stay clickable', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    await user.click(screen.getByRole('button', { name: '打开弹窗' }))

    const dialog = screen.getByRole('dialog', { name: '测试弹窗' })

    expect(dialog).toHaveClass('relative')
    expect(dialog).toHaveClass('z-10')
  })

  test('traps tab focus inside the dialog and closes with Escape', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)
    const opener = screen.getByRole('button', { name: '打开弹窗' })

    await user.click(opener)
    await user.tab()
    expect(screen.getByRole('button', { name: '确认' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '测试弹窗' })).not.toBeInTheDocument()
    })
    await waitFor(() => expect(opener).toHaveFocus())
  })
})
