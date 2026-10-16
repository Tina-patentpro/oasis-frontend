import { AnimatePresence, motion } from '@/components/ui/motion'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useNotifications } from '@/hooks/useNotifications'
import { useThemeStore } from '@/stores/useThemeStore'
import type { Notification } from '@/types/api'

type NotificationContextValue = ReturnType<typeof useNotifications> & {
  dismissUnreadToasts: () => void
}

const TOAST_AUTO_CLOSE_MS = 30000

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

interface ToastProps {
  notification: Notification
  themeColor: string
  onClose: (id: number) => void
}

const Toast = ({ notification, themeColor, onClose }: ToastProps) => {
  const typeConfig = {
    info: { icon: 'ℹ️', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
    success: { icon: '✅', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
    warning: {
      icon: '⚠️',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
    },
    error: { icon: '❌', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  } as const

  const config = typeConfig[notification.type || 'info']
  const handleActionClick = useCallback(() => {
    notification.action?.handler()
    onClose(notification.id)
  }, [notification.action, notification.id, onClose])

  return (
    <motion.div
      className={`${config.bg} ${config.border} border rounded-2xl shadow-lg p-4 mb-3 min-w-[320px] max-w-[400px]`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${config.text} mb-1`}>{notification.title}</div>

          {notification.action && (
            <button
              type="button"
              onClick={handleActionClick}
              className="mt-2 text-sm font-medium hover:underline"
              style={{ color: themeColor }}
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <motion.button
          onClick={() => onClose(notification.id)}
          className="text-gray-500 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="关闭通知"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ✕
        </motion.button>
      </div>
    </motion.div>
  )
}

interface ToastContainerProps {
  themeColor: string
  notifications: Notification[]
  onClose: (id: number) => void
}

const ToastContainer = ({ themeColor, notifications, onClose }: ToastContainerProps) => {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-16 right-4 z-40 flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
            themeColor={themeColor}
            onClose={onClose}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const notificationState = useNotifications()
  const { currentTheme } = useThemeStore()
  const [dismissedToastIds, setDismissedToastIds] = useState<Set<number>>(() => new Set())
  const autoCloseTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const unreadNotificationIds = useMemo(
    () =>
      new Set(
        notificationState.notifications
          .filter((notification) => !notification.read)
          .map((notification) => notification.id),
      ),
    [notificationState.notifications],
  )
  const activeDismissedToastIds = useMemo(() => {
    const next = new Set<number>()

    dismissedToastIds.forEach((id) => {
      if (unreadNotificationIds.has(id)) {
        next.add(id)
      }
    })

    return next
  }, [dismissedToastIds, unreadNotificationIds])

  const clearAutoCloseTimer = useCallback((id: number) => {
    const timerId = autoCloseTimersRef.current.get(id)
    if (!timerId) {
      return
    }

    clearTimeout(timerId)
    autoCloseTimersRef.current.delete(id)
  }, [])

  const dismissToast = useCallback(
    (id: number) => {
      clearAutoCloseTimer(id)
      setDismissedToastIds((prev) => {
        if (prev.has(id)) {
          return prev
        }

        const next = new Set(prev)
        next.add(id)
        return next
      })
    },
    [clearAutoCloseTimer],
  )

  const dismissUnreadToasts = useCallback(() => {
    const unreadNotifications = notificationState.notifications.filter(
      (notification) => !notification.read,
    )
    if (unreadNotifications.length === 0) {
      return
    }

    unreadNotifications.forEach((notification) => {
      clearAutoCloseTimer(notification.id)
    })

    setDismissedToastIds((prev) => {
      const next = new Set(prev)
      let changed = false

      unreadNotifications.forEach((notification) => {
        if (!next.has(notification.id)) {
          next.add(notification.id)
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [clearAutoCloseTimer, notificationState.notifications])

  const toastNotifications = useMemo(
    () =>
      notificationState.notifications
        .filter(
          (notification) => !notification.read && !activeDismissedToastIds.has(notification.id),
        )
        .slice(0, 3),
    [activeDismissedToastIds, notificationState.notifications],
  )

  const handleToastClose = useCallback(
    (id: number) => {
      dismissToast(id)
      notificationState.markAsRead(id).catch((error) => {
        console.error('Failed to mark notification as read:', error)
      })
    },
    [dismissToast, notificationState],
  )

  useEffect(() => {
    const visibleToastIds = new Set(toastNotifications.map((notification) => notification.id))

    autoCloseTimersRef.current.forEach((_timerId, id) => {
      if (!visibleToastIds.has(id)) {
        clearAutoCloseTimer(id)
      }
    })

    toastNotifications.forEach((notification) => {
      if (autoCloseTimersRef.current.has(notification.id)) {
        return
      }

      const timerId = setTimeout(() => {
        dismissToast(notification.id)
      }, TOAST_AUTO_CLOSE_MS)

      autoCloseTimersRef.current.set(notification.id, timerId)
    })
  }, [clearAutoCloseTimer, dismissToast, toastNotifications])

  useEffect(() => {
    const timers = autoCloseTimersRef.current

    return () => {
      timers.forEach((timerId) => {
        clearTimeout(timerId)
      })
      timers.clear()
    }
  }, [])

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      ...notificationState,
      dismissUnreadToasts,
    }),
    [dismissUnreadToasts, notificationState],
  )

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <ToastContainer
        themeColor={currentTheme.primary}
        notifications={toastNotifications}
        onClose={handleToastClose}
      />
    </NotificationContext.Provider>
  )
}

export const useNotificationCenter = () => {
  const context = useContext(NotificationContext)

  if (!context) {
    throw new Error('useNotificationCenter must be used within NotificationProvider')
  }

  return context
}
