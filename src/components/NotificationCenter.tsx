import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  forwardRef,
  useCallback,
  memo,
  useMemo,
  useEffect,
  useRef,
  useState,
  type FC,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'

import type { Notification } from '@/types/api'
import { useNotificationCenter } from '@/app/providers/NotificationProvider'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { ComponentErrorBoundary } from './error-boundaries'

import { dialogVariants } from '../utils/animations'

import { Tooltip } from './ui'

interface NotificationCenterProps {
  id?: string
  themeColor: string
  onClose?: () => void
}

// 类型配置常量
const TYPE_CONFIG = {
  info: { icon: 'ℹ️', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  success: {
    icon: '✅',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
  },
  warning: {
    icon: '⚠️',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
  },
  error: { icon: '❌', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
} as const

// ==================== Notification Bell Icon Component ====================
interface NotificationBellProps {
  unreadCount: number
  onClick: () => void
  themeColor: string
  'aria-expanded'?: boolean
  'aria-controls'?: string
  className?: string
  style?: CSSProperties
}

const NotificationBellComponent = forwardRef<HTMLButtonElement, NotificationBellProps>(
  ({ unreadCount, onClick, themeColor, className, style, ...ariaProps }, ref) => {
    const tooltipLabel = useMemo(
      () => (unreadCount > 0 ? `通知中心（${unreadCount} 条未读）` : '通知中心'),
      [unreadCount],
    )
    const { dismissUnreadToasts, refetch } = useNotificationCenter()

    const handleClick = useCallback(() => {
      dismissUnreadToasts()
      refetch()
      onClick()
    }, [dismissUnreadToasts, onClick, refetch])

    return (
      <Tooltip content={tooltipLabel} inlineChild>
        <motion.button
          type="button"
          ref={ref}
          className={`relative h-10 w-10 rounded-full border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400 ${className ?? ''}`}
          style={style}
          onClick={handleClick}
          aria-label={`通知中心${unreadCount > 0 ? `（${unreadCount} 条未读）` : ''}`}
          aria-haspopup="dialog"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          {...ariaProps}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
                style={{ backgroundColor: themeColor }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </Tooltip>
    )
  },
)

NotificationBellComponent.displayName = 'NotificationBell'

export const NotificationBell = memo(NotificationBellComponent)

// ==================== Notification Item Component ====================
interface NotificationItemProps {
  notification: Notification
  themeColor: string
  onMarkAsRead: (id: number) => void
  onDelete: (id: number) => void
}

const NotificationItemComponent: FC<NotificationItemProps> = ({
  notification,
  themeColor,
  onMarkAsRead,
  onDelete,
}) => {
  const config = TYPE_CONFIG[notification.type || 'info']
  const [isExpanded, setIsExpanded] = useState(false)

  const markNotificationAsReadSafely = useCallback(
    (id: number) => {
      Promise.resolve(onMarkAsRead(id)).catch((error) => {
        console.error('Failed to mark notification as read:', error)
      })
    },
    [onMarkAsRead],
  )

  const handleMarkAsRead = useCallback(() => {
    markNotificationAsReadSafely(notification.id)
  }, [markNotificationAsReadSafely, notification.id])

  const handleDelete = useCallback(() => {
    onDelete(notification.id)
  }, [notification.id, onDelete])

  const handleActionClick = useCallback(() => {
    notification.action?.handler()
    if (!notification.read) {
      markNotificationAsReadSafely(notification.id)
    }
  }, [markNotificationAsReadSafely, notification.action, notification.id, notification.read])

  return (
    <div className="px-5 py-4 hover:bg-gray-50 transition-colors border-b">
      <div className="flex items-start gap-3">
        <div className="text-xl flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`font-medium ${config.text}`}>{notification.title}</h4>
            {!notification.read && (
              <div
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                style={{ backgroundColor: themeColor }}
              />
            )}
          </div>
          <p
            className={`text-sm text-gray-600 leading-relaxed mb-2 ${
              !isExpanded ? 'line-clamp-2' : ''
            }`}
          >
            {notification.message}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {new Date(notification.createdAt).toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
              >
                {isExpanded ? '收起' : '详情'}
              </button>
              {!notification.read && (
                <button
                  type="button"
                  onClick={handleMarkAsRead}
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  标为已读
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-gray-600 hover:text-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
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
      </div>
    </div>
  )
}

const NotificationItem = memo(NotificationItemComponent)

// ==================== Main Notification Center Component ====================
const NotificationCenterContent: FC<NotificationCenterProps> = ({ id, themeColor, onClose }) => {
  const context = useNotificationCenter()
  const panelRef = useFocusTrap(true)

  const {
    notifications,
    unreadCount,
    loading,
    error,
    filter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    setFilter,
    refetch,
  } = context

  // 首次打开时，如果数据为空且未加载中，重新获取数据
  const hasOpened = useRef(false)
  useEffect(() => {
    if (!hasOpened.current && notifications.length === 0 && !loading) {
      hasOpened.current = true
      refetch()
    }
  }, [notifications.length, loading, refetch])

  const handleSetFilterAll = useCallback(() => {
    setFilter('all')
  }, [setFilter])

  const handleSetFilterUnread = useCallback(() => {
    setFilter('unread')
  }, [setFilter])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose?.()
      }
    },
    [onClose],
  )

  const shouldShowEmpty = !notifications || notifications.length === 0

  return (
    <motion.div
      id={id}
      ref={panelRef}
      className="flex max-h-[600px] w-[calc(100vw-1rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      variants={dialogVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="dialog"
      aria-label="通知中心"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">通知中心</h3>
          <span className="text-xs text-gray-500">({unreadCount} 条未读)</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-5 py-3 border-b flex gap-2">
        <motion.button
          type="button"
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={filter === 'all' ? { backgroundColor: themeColor } : {}}
          onClick={handleSetFilterAll}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          全部
        </motion.button>
        <motion.button
          type="button"
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'unread' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={filter === 'unread' ? { backgroundColor: themeColor } : {}}
          onClick={handleSetFilterUnread}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          未读
        </motion.button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-sm">{error}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* Notification List - 简化版本 */}
      <div className="flex-1 overflow-y-auto">
        {shouldShowEmpty ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg
              viewBox="0 0 24 24"
              width="48"
              height="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mb-3"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="text-sm">{filter === 'unread' ? '没有未读通知' : '暂无通知'}</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification, index) => {
              return (
                <NotificationItem
                  key={notification.id || index}
                  notification={notification}
                  themeColor={themeColor}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {notifications && notifications.length > 0 && (
        <div className="px-5 py-3 border-t bg-gray-50 flex gap-3">
          <motion.button
            type="button"
            onClick={markAllAsRead}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            全部标为已读
          </motion.button>
          <motion.button
            type="button"
            onClick={clearAll}
            className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            清空所有
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

// ==================== Error Boundary Wrapper ====================
export const NotificationCenter: FC<NotificationCenterProps> = (props) => {
  return (
    <ComponentErrorBoundary componentName="NotificationCenter">
      <NotificationCenterContent {...props} />
    </ComponentErrorBoundary>
  )
}
