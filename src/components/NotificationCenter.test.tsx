import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import userEvent from '@testing-library/user-event'

import type { Notification } from '@/types/api'

import { NotificationBell, NotificationCenter } from './NotificationCenter'

const mockUseNotificationCenter = jest.fn()
const mockDismissUnreadToasts = jest.fn()
const mockRefetch = jest.fn()
const mockMarkAsRead = jest.fn<(id: number) => Promise<void>>()

jest.mock('@/app/providers/NotificationProvider', () => ({
  useNotificationCenter: () => mockUseNotificationCenter(),
}))

jest.mock('./error-boundaries', () => ({
  ComponentErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('./ui', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/components/ui/motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    button: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      children: React.ReactNode
      whileHover?: unknown
      whileTap?: unknown
    }) => <button {...props}>{children}</button>,
    span: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & {
      children: React.ReactNode
      initial?: unknown
      animate?: unknown
      exit?: unknown
      transition?: unknown
    }) => <span {...props}>{children}</span>,
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      variants: _variants,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children: React.ReactNode
      initial?: unknown
      animate?: unknown
      exit?: unknown
      variants?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

describe('NotificationBell', () => {
  beforeEach(() => {
    mockDismissUnreadToasts.mockReset()
    mockRefetch.mockReset()
    mockMarkAsRead.mockReset()
    mockMarkAsRead.mockResolvedValue(undefined)
    mockUseNotificationCenter.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      filter: 'all',
      markAsRead: mockMarkAsRead,
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      clearAll: jest.fn(),
      setFilter: jest.fn(),
      dismissUnreadToasts: mockDismissUnreadToasts,
      refetch: mockRefetch,
    })
  })

  test('clicking the bell dismisses unread toasts before refetching and toggling the panel', async () => {
    const callOrder: string[] = []
    const user = userEvent.setup()
    const handleToggle = jest.fn(() => {
      callOrder.push('toggle')
    })

    mockDismissUnreadToasts.mockImplementation(() => {
      callOrder.push('dismiss')
    })
    mockRefetch.mockImplementation(() => {
      callOrder.push('refetch')
      return Promise.resolve()
    })

    render(<NotificationBell unreadCount={2} onClick={handleToggle} themeColor="#10b981" />)

    const trigger = screen.getByRole('button', { name: '通知中心（2 条未读）' })
    expect(trigger).toHaveAttribute('type', 'button')
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

    await user.click(trigger)

    expect(mockDismissUnreadToasts).toHaveBeenCalledTimes(1)
    expect(mockRefetch).toHaveBeenCalledTimes(1)
    expect(handleToggle).toHaveBeenCalledTimes(1)
    expect(callOrder).toEqual(['dismiss', 'refetch', 'toggle'])
  })
})

describe('NotificationCenter', () => {
  beforeEach(() => {
    mockDismissUnreadToasts.mockReset()
    mockRefetch.mockReset()
    mockMarkAsRead.mockReset()
    mockMarkAsRead.mockResolvedValue(undefined)
  })

  test('clicking a notification action runs the action and marks an unread item as read', async () => {
    const callOrder: string[] = []
    const user = userEvent.setup()
    const actionHandler = jest.fn(() => {
      callOrder.push('action')
    })

    mockMarkAsRead.mockImplementation(async (id: number) => {
      callOrder.push(`mark:${id}`)
    })

    const notifications: Notification[] = [
      {
        id: 1,
        title: '通知一',
        message: '通知内容',
        read: false,
        createdAt: '2026-04-01T10:00:00.000Z',
        type: 'info',
        action: {
          label: '查看详情',
          handler: actionHandler,
        },
      },
    ]

    mockUseNotificationCenter.mockReturnValue({
      notifications,
      unreadCount: 1,
      loading: false,
      error: null,
      filter: 'all',
      markAsRead: mockMarkAsRead,
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      clearAll: jest.fn(),
      setFilter: jest.fn(),
      dismissUnreadToasts: mockDismissUnreadToasts,
      refetch: mockRefetch,
    })

    render(<NotificationCenter themeColor="#10b981" />)

    expect(screen.getByRole('button', { name: '全部' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '未读' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '详情' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '标为已读' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '删除' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '查看详情' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '全部标为已读' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '清空所有' })).toHaveAttribute('type', 'button')

    await user.click(screen.getByRole('button', { name: '查看详情' }))

    expect(actionHandler).toHaveBeenCalledTimes(1)
    expect(mockMarkAsRead).toHaveBeenCalledWith(1)
    expect(callOrder).toEqual(['action', 'mark:1'])
  })

  test('logs a readable error when marking an action notification as read fails', async () => {
    const user = userEvent.setup()
    const actionHandler = jest.fn()
    const markAsReadError = new Error('network failed')
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    mockMarkAsRead.mockRejectedValueOnce(markAsReadError)

    const notifications: Notification[] = [
      {
        id: 1,
        title: '通知一',
        message: '通知内容',
        read: false,
        createdAt: '2026-04-01T10:00:00.000Z',
        type: 'info',
        action: {
          label: '查看详情',
          handler: actionHandler,
        },
      },
    ]

    mockUseNotificationCenter.mockReturnValue({
      notifications,
      unreadCount: 1,
      loading: false,
      error: null,
      filter: 'all',
      markAsRead: mockMarkAsRead,
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      clearAll: jest.fn(),
      setFilter: jest.fn(),
      dismissUnreadToasts: mockDismissUnreadToasts,
      refetch: mockRefetch,
    })

    render(<NotificationCenter themeColor="#10b981" />)

    await user.click(screen.getByRole('button', { name: '查看详情' }))

    expect(actionHandler).toHaveBeenCalledTimes(1)
    expect(mockMarkAsRead).toHaveBeenCalledWith(1)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to mark notification as read:',
        markAsReadError,
      )
    })

    consoleErrorSpy.mockRestore()
  })

  test('exposes a single non-modal dialog landmark and closes from Escape', async () => {
    const user = userEvent.setup()
    const handleClose = jest.fn()

    mockUseNotificationCenter.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      filter: 'all',
      markAsRead: mockMarkAsRead,
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      clearAll: jest.fn(),
      setFilter: jest.fn(),
      dismissUnreadToasts: mockDismissUnreadToasts,
      refetch: mockRefetch,
    })

    render(
      <>
        <NotificationCenter
          id="notification-center-panel"
          themeColor="#10b981"
          onClose={handleClose}
        />
        <button type="button">外部操作</button>
      </>,
    )

    const dialog = screen.getByRole('dialog', { name: '通知中心' })
    expect(screen.getAllByRole('dialog', { name: '通知中心' })).toHaveLength(1)
    expect(dialog).toHaveAttribute('id', 'notification-center-panel')
    expect(dialog).not.toHaveAttribute('aria-modal')
    await waitFor(() => expect(screen.getByRole('button', { name: '全部' })).toHaveFocus())

    screen.getByRole('button', { name: '未读' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: '全部' })).toHaveFocus()
    expect(screen.getByRole('button', { name: '外部操作' })).not.toHaveFocus()

    screen.getByRole('button', { name: '全部' }).focus()
    await user.keyboard('{Escape}')

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
