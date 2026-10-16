import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { Notification } from '@/types/api'

import { NotificationProvider, useNotificationCenter } from './NotificationProvider'

const mockUseNotifications = jest.fn()
const mockMarkAsRead = jest.fn<(id: number) => Promise<void>>()
const mockRefetch = jest.fn<() => Promise<void>>()

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: (...args: unknown[]) => mockUseNotifications(...args),
}))

jest.mock('@/stores/useThemeStore', () => ({
  useThemeStore: (selector?: (state: { currentTheme: { primary: string } }) => unknown) => {
    const state = {
      currentTheme: { primary: '#10b981' },
    }

    return typeof selector === 'function' ? selector(state) : state
  },
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
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      layout: _layout,
      variants: _variants,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children: React.ReactNode
      initial?: unknown
      animate?: unknown
      exit?: unknown
      layout?: unknown
      variants?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

type MockNotificationState = {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  pageSize: number
  total: number
  filter: 'all' | 'unread'
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: number) => Promise<void>
  clearAll: () => Promise<void>
  setFilter: (filter: 'all' | 'unread') => void
  setPage: (page: number) => void
  startRealTime: () => void
  stopRealTime: () => void
  isRealTimeActive: boolean
}

function createNotification(id: number, title: string): Notification {
  return {
    id,
    title,
    message: `${title} 的正文`,
    read: false,
    createdAt: '2026-04-01T10:00:00.000Z',
    type: 'info',
  }
}

function createNotificationState(notifications: Notification[]): MockNotificationState {
  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    total: notifications.length,
    filter: 'all',
    refetch: mockRefetch,
    loadMore: jest.fn(async () => {}),
    markAsRead: mockMarkAsRead,
    markAllAsRead: jest.fn(async () => {}),
    deleteNotification: jest.fn(async () => {}),
    clearAll: jest.fn(async () => {}),
    setFilter: jest.fn(),
    setPage: jest.fn(),
    startRealTime: jest.fn(),
    stopRealTime: jest.fn(),
    isRealTimeActive: false,
  }
}

let mockNotificationState: MockNotificationState = createNotificationState([])

const ConsumerProbe = () => {
  const context = useNotificationCenter() as ReturnType<typeof useNotificationCenter> & {
    dismissUnreadToasts?: () => void
  }

  return (
    <div>
      <span data-testid="unread-count">{context.unreadCount}</span>
      <button type="button" onClick={() => context.dismissUnreadToasts?.()}>
        dismiss unread toasts
      </button>
    </div>
  )
}

const renderProvider = () =>
  render(
    <NotificationProvider>
      <ConsumerProbe />
    </NotificationProvider>,
  )

describe('NotificationProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockMarkAsRead.mockReset()
    mockMarkAsRead.mockResolvedValue(undefined)
    mockRefetch.mockReset()
    mockRefetch.mockResolvedValue(undefined)
    mockNotificationState = createNotificationState([])
    mockUseNotifications.mockImplementation(() => mockNotificationState)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  test('auto closes unread toast after 30 seconds without marking it read', () => {
    mockNotificationState = createNotificationState([createNotification(1, '通知一')])

    renderProvider()

    expect(screen.queryByText('通知一')).not.toBeNull()
    expect(screen.getByTestId('unread-count').textContent).toBe('1')

    act(() => {
      jest.advanceTimersByTime(30000)
    })

    expect(screen.queryByText('通知一')).toBeNull()
    expect(screen.getByTestId('unread-count').textContent).toBe('1')
    expect(mockMarkAsRead).not.toHaveBeenCalled()
  })

  test('keeps an auto-dismissed toast hidden after notifications refresh', () => {
    mockNotificationState = createNotificationState([createNotification(1, '通知一')])

    const view = renderProvider()

    act(() => {
      jest.advanceTimersByTime(30000)
    })

    expect(screen.queryByText('通知一')).toBeNull()

    mockNotificationState = createNotificationState([createNotification(1, '通知一')])
    view.rerender(
      <NotificationProvider>
        <ConsumerProbe />
      </NotificationProvider>,
    )

    expect(screen.queryByText('通知一')).toBeNull()
  })

  test('dismissUnreadToasts hides all unread toasts in the current session without changing unread count', () => {
    mockNotificationState = createNotificationState([
      createNotification(1, '通知一'),
      createNotification(2, '通知二'),
      createNotification(3, '通知三'),
      createNotification(4, '通知四'),
    ])

    renderProvider()

    expect(screen.queryByText('通知一')).not.toBeNull()
    expect(screen.queryByText('通知二')).not.toBeNull()
    expect(screen.queryByText('通知三')).not.toBeNull()
    expect(screen.queryByText('通知四')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'dismiss unread toasts' }))

    expect(screen.queryByText('通知一')).toBeNull()
    expect(screen.queryByText('通知二')).toBeNull()
    expect(screen.queryByText('通知三')).toBeNull()
    expect(screen.queryByText('通知四')).toBeNull()
    expect(screen.getByTestId('unread-count').textContent).toBe('4')
  })

  test('manual close keeps the existing mark-as-read behavior', () => {
    mockNotificationState = createNotificationState([createNotification(1, '通知一')])

    renderProvider()

    fireEvent.click(screen.getByRole('button', { name: '关闭通知' }))

    expect(mockMarkAsRead).toHaveBeenCalledWith(1)
  })

  test('clicking the toast action runs the action and then marks the notification as read', () => {
    const callOrder: string[] = []
    const actionHandler = jest.fn(() => {
      callOrder.push('action')
    })

    mockMarkAsRead.mockImplementation(async (id: number) => {
      callOrder.push(`mark:${id}`)
    })

    mockNotificationState = createNotificationState([
      {
        ...createNotification(1, '通知一'),
        action: {
          label: '立即查看',
          handler: actionHandler,
        },
      },
    ])

    renderProvider()

    fireEvent.click(screen.getByRole('button', { name: '立即查看' }))

    expect(actionHandler).toHaveBeenCalledTimes(1)
    expect(mockMarkAsRead).toHaveBeenCalledWith(1)
    expect(callOrder).toEqual(['action', 'mark:1'])
  })

  test('toast action dismisses the toast immediately even if mark-as-read is still pending', () => {
    let resolveMarkAsRead: (() => void) | null = null

    mockMarkAsRead.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveMarkAsRead = resolve
        }),
    )

    mockNotificationState = createNotificationState([
      {
        ...createNotification(1, '通知一'),
        action: {
          label: '立即查看',
          handler: jest.fn(),
        },
      },
    ])

    renderProvider()

    fireEvent.click(screen.getByRole('button', { name: '立即查看' }))

    expect(mockMarkAsRead).toHaveBeenCalledWith(1)
    expect(screen.queryByText('通知一')).toBeNull()

    // @ts-expect-error resolveMarkAsRead inferred as never due to jest.fn generic mismatch
    resolveMarkAsRead?.()
  })

  test('cleans up auto-close timers on unmount', () => {
    mockNotificationState = createNotificationState([createNotification(1, '通知一')])

    const view = renderProvider()

    expect(jest.getTimerCount()).toBe(1)

    view.unmount()

    expect(jest.getTimerCount()).toBe(0)
  })
})
