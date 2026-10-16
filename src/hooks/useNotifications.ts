import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAbortLikeError } from '@/api/core/error-utils'
import { notificationService } from '@/api/services/notification.service'
import { useUIStore } from '@/stores/useUIStore'
import { useAuthStore, selectIsAuthenticated } from '@/stores/useAuthStore'
import type { Notification } from '@/types/api'
import { useAsyncTaskStore } from '@/modules/workspace/stores'

import { buildLatestTaskStatusUpdates } from './notification-task-sync'

interface UseNotificationsOptions {
  enableRealTime?: boolean
  pollingInterval?: number
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  pageSize: number
  total: number
  filter: 'all' | 'unread'

  // Actions
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: number) => Promise<void>
  clearAll: () => Promise<void>
  setFilter: (filter: 'all' | 'unread') => void
  setPage: (page: number) => void

  // Real-time
  startRealTime: () => void
  stopRealTime: () => void
  isRealTimeActive: boolean
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const enableRealTime = options.enableRealTime ?? true
  const pollingInterval = options.pollingInterval ?? 30000

  const showToast = useUIStore((state) => state.showToast)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)
  // 添加定时器引用
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)

  const reconcileAsyncTasksByNotifications = useCallback((items: Notification[]) => {
    const updates = buildLatestTaskStatusUpdates(items)
    if (updates.size === 0) {
      return
    }

    const updateTaskProgress = useAsyncTaskStore.getState().updateTaskProgress
    for (const [taskKey, status] of updates) {
      const currentTask = useAsyncTaskStore.getState().tasks[taskKey]
      if (!currentTask) {
        continue
      }

      if (status === 'completed') {
        if (
          currentTask.status === 'completed' &&
          currentTask.progressPercent >= 100 &&
          !currentTask.error_message
        ) {
          continue
        }

        updateTaskProgress(taskKey, {
          status: 'completed',
          progressPercent: 100,
          currentStepName: '已完成（通知确认）',
          error_message: undefined,
        })
        continue
      }

      if (currentTask.status === 'completed' || currentTask.status === 'failed') {
        continue
      }

      updateTaskProgress(taskKey, {
        status: 'failed',
        currentStepName: currentTask.currentStepName || '执行失败（通知确认）',
        error_message: currentTask.error_message || '任务执行失败（通知确认）',
      })
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (page = 1, append = false) => {
      const controller = new AbortController()
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
      }
      fetchControllerRef.current = controller

      try {
        setLoading(true)
        setError(null)

        const params: {
          page: number
          pageSize: number
          read?: boolean
        } = {
          page,
          pageSize,
        }

        if (filter === 'unread') {
          params.read = false
        }

        const response = await notificationService.getNotifications(params, {
          signal: controller.signal,
        })
        if (controller.signal.aborted) {
          return
        }

        if (append) {
          setNotifications((prev) => {
            const newList = [...prev, ...response.items]

            return newList
          })
        } else {
          setNotifications(response.items)
        }

        reconcileAsyncTasksByNotifications(response.items)

        setCurrentPage(response.pagination.page)
        setTotalPages(response.pagination.totalPages)
        setTotal(response.pagination.total)

        // Update unread count
        if (page === 1) {
          const unreadResponse = await notificationService.getUnreadCount({
            signal: controller.signal,
          })
          if (controller.signal.aborted) {
            return
          }

          setUnreadCount(unreadResponse.count)
        }
      } catch (err) {
        if (controller.signal.aborted || isAbortLikeError(err)) {
          return
        }
        const errorMessage = err instanceof Error ? err.message : '获取通知失败'
        setError(errorMessage)
        showToast(errorMessage)
      } finally {
        if (fetchControllerRef.current === controller) {
          setLoading(false)
        }
      }
    },
    [filter, pageSize, reconcileAsyncTasksByNotifications, showToast],
  )

  // Mark as read
  const markAsRead = useCallback(
    async (id: number) => {
      try {
        // 调用API标记为已读
        await notificationService.markAsRead(id)

        // 更新本地状态
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification,
          ),
        )

        setUnreadCount((prev) => Math.max(0, prev - 1))
        showToast('已标记为已读')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '标记失败'
        showToast(errorMessage)
      }
    },
    [showToast],
  )

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)

      if (unreadIds.length === 0) {
        showToast('没有未读通知')
        return
      }

      // 调用API标记所有为已读
      await notificationService.markAllAsRead()

      // 更新本地状态
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))

      setUnreadCount(0)
      showToast('已全部标记为已读')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '标记失败'
      showToast(errorMessage)
    }
  }, [notifications, showToast])

  // Delete notification
  const deleteNotification = useCallback(
    async (id: number) => {
      try {
        const deletedNotification = notifications.find((n) => n.id === id)

        // 调用API删除通知
        await notificationService.deleteNotification(id)

        // 更新本地状态
        setNotifications((prev) => prev.filter((n) => n.id !== id))

        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }

        showToast('通知已删除')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '删除失败'
        showToast(errorMessage)
      }
    },
    [notifications, showToast],
  )

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      // 调用API清空所有通知
      await notificationService.clearAllNotifications()

      // 更新本地状态
      setNotifications([])
      setUnreadCount(0)
      showToast('已清空所有通知')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清空失败'
      showToast(errorMessage)
    }
  }, [showToast])

  // Load more
  const loadMore = useCallback(async () => {
    if (currentPage < totalPages && !loading) {
      await fetchNotifications(currentPage + 1, true)
    }
  }, [currentPage, totalPages, loading, fetchNotifications])

  // Refetch
  const refetch = useCallback(async () => {
    await fetchNotifications(1, false)
  }, [fetchNotifications])

  const startRealTime = useCallback(() => {
    if (enableRealTime && !pollTimerRef.current) {
      // 立即获取一次数据
      fetchNotifications(1, false)

      // 然后按配置间隔获取一次
      pollTimerRef.current = setInterval(() => {
        fetchNotifications(1, false)
      }, pollingInterval) as unknown as NodeJS.Timeout

      setIsRealTimeActive(true)
    }
  }, [enableRealTime, fetchNotifications, pollingInterval])

  const stopRealTime = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
      setIsRealTimeActive(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || enableRealTime) {
      return
    }

    fetchNotifications(1, false)
  }, [enableRealTime, fetchNotifications, isAuthenticated])

  // 初始化时启动轮询，组件卸载时停止
  useEffect(() => {
    if (enableRealTime && isAuthenticated) {
      startRealTime()
    }

    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
        fetchControllerRef.current = null
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [enableRealTime, isAuthenticated, startRealTime])

  return useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      currentPage,
      totalPages,
      pageSize,
      total,
      filter,

      refetch,
      loadMore,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
      setFilter,
      setPage: setCurrentPage,

      startRealTime,
      stopRealTime,
      isRealTimeActive,
    }),
    [
      clearAll,
      currentPage,
      deleteNotification,
      error,
      filter,
      isRealTimeActive,
      loadMore,
      loading,
      markAllAsRead,
      markAsRead,
      notifications,
      pageSize,
      refetch,
      startRealTime,
      stopRealTime,
      total,
      totalPages,
      unreadCount,
    ],
  )
}
