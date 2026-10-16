import React from 'react'

import '@testing-library/jest-dom'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { historyService } from '@/api/services'
import type { HistoryDataItem, PaginatedResponse } from '@/types/api'

import { HistoryDataDialog } from './HistoryDataDialog'

jest.mock('@/components/ui/motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}))

jest.mock('@/api/services', () => ({
  historyService: {
    getHistoryData: jest.fn(),
  },
}))

const getHistoryDataMock = historyService.getHistoryData as jest.MockedFunction<
  typeof historyService.getHistoryData
>

const historyItem: HistoryDataItem = {
  id: 'history-1',
  title: '资料A',
  content: '历史资料内容',
  date: '2026-05-27',
  type: 'workflow',
  tags: [],
  read: false,
  createdAt: '2026-05-27T00:00:00.000Z',
  updatedAt: '2026-05-27T00:00:00.000Z',
}

function paginated(items: HistoryDataItem[]): PaginatedResponse<HistoryDataItem> {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: 10,
      total: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    },
  }
}

function renderDialog() {
  return render(
    <HistoryDataDialog isOpen onClose={jest.fn()} onConfirm={jest.fn()} themeColor="#10b981" />,
  )
}

function HistoryDataDialogHarness({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <HistoryDataDialog
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setIsOpen(false)
      }}
      onConfirm={jest.fn()}
      themeColor="#10b981"
    />
  )
}

describe('HistoryDataDialog', () => {
  beforeEach(() => {
    getHistoryDataMock.mockReset()
  })

  test('renders as an accessible modal and keeps keyboard focus inside', () => {
    const onClose = jest.fn()
    getHistoryDataMock.mockResolvedValue(paginated([]))

    render(
      <HistoryDataDialog isOpen onClose={onClose} onConfirm={jest.fn()} themeColor="#10b981" />,
    )

    const dialog = screen.getByRole('dialog', { name: '历史资料' })

    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const enabledButtons = within(dialog)
      .getAllByRole('button')
      .filter((button) => !button.hasAttribute('disabled'))
    const firstButton = enabledButtons[0]
    const lastButton = enabledButtons[enabledButtons.length - 1]

    lastButton.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })

    expect(firstButton).toHaveFocus()

    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  test('locks background scrolling while open and restores it after Escape closes the dialog', async () => {
    const onClose = jest.fn()
    const previousOverflow = document.body.style.overflow
    getHistoryDataMock.mockResolvedValue(paginated([]))

    render(<HistoryDataDialogHarness onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: '历史资料' })
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '历史资料' })).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe(previousOverflow)
  })

  test('keeps the dialog scrollable on short screens', () => {
    getHistoryDataMock.mockResolvedValue(paginated([]))

    renderDialog()

    const dialog = screen.getByRole('dialog', { name: '历史资料' })
    const listRegion = screen.getByRole('region', { name: '历史资料列表' })

    expect(dialog).toHaveClass('max-h-[calc(100dvh-2rem)]')
    expect(dialog).toHaveClass('overflow-hidden')
    expect(dialog).toHaveClass('flex')
    expect(dialog).toHaveClass('flex-col')
    expect(listRegion).toHaveClass('min-h-0')
    expect(listRegion).toHaveClass('flex-1')
    expect(listRegion).toHaveClass('overflow-y-auto')
  })

  test('uses safe button types and visible keyboard focus styles', () => {
    getHistoryDataMock.mockResolvedValue(paginated([]))

    renderDialog()

    const closeButton = screen.getByRole('button', { name: '关闭历史资料弹窗' })
    const cancelButton = screen.getByRole('button', { name: '取消' })
    const importButton = screen.getByRole('button', { name: '导入所选' })

    expect(closeButton).toHaveAttribute('type', 'button')
    expect(cancelButton).toHaveAttribute('type', 'button')
    expect(importButton).toHaveAttribute('type', 'button')
    expect(closeButton).toHaveClass('focus-visible:ring-2')
    expect(cancelButton).toHaveClass('focus-visible:ring-2')
    expect(importButton).toHaveClass('focus-visible:ring-2')
  })

  test('loads history data within the fixed project scope when provided', async () => {
    getHistoryDataMock.mockResolvedValue(paginated([]))

    render(
      <HistoryDataDialog
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        themeColor="#10b981"
        fixedProjectId={77}
        titleOverride="读取项目历史资料：工学键盘"
      />,
    )

    expect(screen.getByRole('dialog', { name: '读取项目历史资料：工学键盘' })).toBeInTheDocument()

    await waitFor(() => {
      expect(getHistoryDataMock).toHaveBeenCalledWith(expect.objectContaining({ projectId: 77 }))
    })
  })

  test('shows loading status and labels history checkboxes clearly', async () => {
    let resolveData: (value: PaginatedResponse<HistoryDataItem>) => void = () => undefined
    getHistoryDataMock.mockReturnValue(
      new Promise<PaginatedResponse<HistoryDataItem>>((resolve) => {
        resolveData = resolve
      }),
    )

    renderDialog()

    expect(screen.getByRole('status')).toHaveTextContent('正在加载历史资料')

    await act(async () => {
      resolveData(paginated([historyItem]))
    })

    expect(await screen.findByText('资料A')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '全选当前页历史资料' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '选择历史资料：资料A' })).toBeInTheDocument()
  })

  test('allows selecting a history item by clicking its title area', async () => {
    const user = userEvent.setup()
    getHistoryDataMock.mockResolvedValue(paginated([historyItem]))

    renderDialog()

    const checkbox = await screen.findByRole('checkbox', { name: '选择历史资料：资料A' })

    expect(checkbox).not.toBeChecked()

    await user.click(screen.getByText('资料A'))

    expect(checkbox).toBeChecked()
    expect(screen.getByRole('button', { name: '导入所选' })).toBeEnabled()
  })

  test('shows a retry action after loading fails', async () => {
    const user = userEvent.setup()
    getHistoryDataMock
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce(paginated([historyItem]))

    renderDialog()

    expect(await screen.findByRole('alert')).toHaveTextContent('历史资料加载失败，请稍后重试。')

    await user.click(screen.getByRole('button', { name: '重试加载历史资料' }))

    await waitFor(() => {
      expect(getHistoryDataMock).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('资料A')).toBeInTheDocument()
  })
})
