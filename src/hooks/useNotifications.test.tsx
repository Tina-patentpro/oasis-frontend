import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { Notification } from '@/types/api'

import { useNotifications } from './useNotifications'

let mockIsAuthenticated = false
const mockShowToast = jest.fn()
const mockUpdateTaskProgress = jest.fn()

interface MockNotificationsResponse {
  items: Notification[]
  pagination: {
    page: number
    totalPages: number
    total: number
  }
}

const mockGetNotifications = jest.fn<(...args: unknown[]) => Promise<MockNotificationsResponse>>()
const mockGetUnreadCount = jest.fn<(...args: unknown[]) => Promise<{ count: number }>>()

jest.mock('@/stores/useAuthStore', () => ({
  selectIsAuthenticated: (state: { isAuthenticated: boolean }) => state.isAuthenticated,
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}))

jest.mock('@/stores/useUIStore', () => ({
  useUIStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}))

jest.mock('@/modules/workspace/stores', () => ({
  useAsyncTaskStore: {
    getState: () => ({
      tasks: {},
      updateTaskProgress: mockUpdateTaskProgress,
    }),
  },
}))

jest.mock('@/api/services/notification.service', () => ({
  notificationService: {
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
  },
}))

describe('useNotifications', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockIsAuthenticated = false
    mockShowToast.mockReset()
    mockUpdateTaskProgress.mockReset()
    mockGetNotifications.mockReset()
    mockGetUnreadCount.mockReset()
    mockGetNotifications.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        totalPages: 1,
        total: 0,
      },
    })
    mockGetUnreadCount.mockResolvedValue({ count: 0 })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  test('returns the same object reference across unrelated rerenders', () => {
    const { result, rerender } = renderHook(() => useNotifications())

    const firstResult = result.current

    rerender()

    expect(result.current).toBe(firstResult)
  })

  test('fetches notifications once on authenticated mount before polling interval elapses', async () => {
    mockIsAuthenticated = true

    renderHook(() => useNotifications({ pollingInterval: 30000 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockGetUnreadCount).toHaveBeenCalledTimes(1)
    expect(mockGetNotifications).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(29999)
      await Promise.resolve()
    })

    expect(mockGetNotifications).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(1)
      await Promise.resolve()
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockGetNotifications).toHaveBeenCalledTimes(2)
  })
})
