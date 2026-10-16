import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  FC,
  CSSProperties,
  KeyboardEvent,
  RefObject,
} from 'react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { useAsyncTaskStore } from '@/modules/workspace/stores'
import { ASYNC_TASK_CENTER_REMINDER_EVENT } from '@/modules/workspace/events/async-task-center-event'
import { Tooltip } from '@/components/ui'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { dialogVariants } from '@/utils/animations'
import type { Theme } from '@/types'

const AUTO_CLOSE_DELAY_MS = 15000

// The Icon Button that shows active task count
const AsyncTaskBell: FC<{
  activeCount: number
  themeColor: string
  onClick: () => void
  buttonRef: RefObject<HTMLButtonElement | null>
  isOpen: boolean
  panelId: string
  style?: CSSProperties
}> = ({ activeCount, themeColor, onClick, buttonRef, isOpen, panelId, style }) => {
  return (
    <Tooltip content={`异步任务 (${activeCount}个运行中)`} position="bottom">
      <motion.button
        ref={buttonRef}
        className="relative h-10 w-10 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-black/5"
        style={style}
        onClick={onClick}
        aria-label="异步任务"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          animate={activeCount > 0 ? { rotate: 360 } : {}}
          transition={activeCount > 0 ? { repeat: Infinity, ease: 'linear', duration: 4 } : {}}
        >
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
        </motion.svg>
        <AnimatePresence>
          {activeCount > 0 && (
            <motion.span
              className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
              style={{ backgroundColor: themeColor }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              {activeCount > 99 ? '99+' : activeCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </Tooltip>
  )
}

// The Dropdown Panel
const AsyncTaskPanel: FC<{ themeColor: string }> = ({ themeColor }) => {
  const { tasks, clearCompletedTasks, removeAsyncTask } = useAsyncTaskStore()
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const taskList = Object.values(tasks).sort((a, b) => b.createdAt - a.createdAt)
  const completedCount = taskList.filter((task) => task.status === 'completed').length
  const shouldShowClearConfirm = isClearConfirmOpen && completedCount > 0

  const requestClearCompletedTasks = () => {
    if (completedCount === 0) {
      return
    }

    setIsClearConfirmOpen(true)
  }

  const confirmClearCompletedTasks = () => {
    clearCompletedTasks()
    setIsClearConfirmOpen(false)
  }

  return (
    <motion.div
      className="flex max-h-[500px] w-[calc(100vw-1rem)] max-w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
      variants={dialogVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">异步任务中心</h3>
        <button
          type="button"
          onClick={requestClearCompletedTasks}
          className="text-xs text-gray-500 hover:text-gray-800"
        >
          清除已完成
        </button>
      </div>

      {shouldShowClearConfirm && (
        <div
          role="alertdialog"
          aria-label="确认清除已完成任务"
          className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p className="font-medium">确认清除已完成任务记录？</p>
          <p className="mt-1 text-xs text-red-600">
            将清除 {completedCount} 条已完成记录，运行中和失败的任务不会受影响。
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(false)}
              className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              取消
            </button>
            <button
              type="button"
              onClick={confirmClearCompletedTasks}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              确认清除
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {taskList.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">暂无异步任务</div>
        ) : (
          <div className="flex flex-col gap-2">
            {taskList.map((task) => {
              const isActive = task.status === 'running' || task.status === 'queued'
              const isError = task.status === 'failed'
              const stepText =
                task.currentStepName ||
                (isActive ? '等待状态确认' : isError ? '执行失败' : '已完成')
              const normalizedProgress = Math.min(100, Math.max(0, task.progressPercent))
              return (
                <div
                  key={task.taskKey}
                  className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className="text-sm font-medium text-gray-800 truncate pr-2"
                      title={task.apiName}
                    >
                      {task.apiName}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : isError
                            ? 'bg-red-50 text-red-600'
                            : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {isActive ? '进行中' : isError ? '失败' : '完成'}
                    </span>
                  </div>

                  {isError && task.error_message && (
                    <div className="text-xs text-red-500 mb-2 truncate" role="alert">
                      {task.error_message}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-label={`${task.apiName}进度`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={normalizedProgress}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: isError ? '#ef4444' : themeColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${normalizedProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {task.progressPercent > 0 ? `${task.progressPercent}%` : '--'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">{stepText}</div>

                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => removeAsyncTask(task.taskKey)}
                      className="mt-2 text-xs text-gray-500 hover:text-red-500 transition-colors block text-right w-full"
                    >
                      删除记录
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export const AsyncTaskMenu: FC<{
  currentTheme: Theme
  isDarkTheme: boolean
  headerBtnStyle: CSSProperties
}> = ({ currentTheme, isDarkTheme: _isDarkTheme, headerBtnStyle }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [openMode, setOpenMode] = useState<'auto' | 'manual' | null>(null)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openModeRef = useRef<'auto' | 'manual' | null>(null)
  const panelRef = useFocusTrap(isOpen && openMode === 'manual')

  const tasks = useAsyncTaskStore((state) => state.tasks)
  const activeCount = Object.values(tasks).filter(
    (t) => t.status === 'running' || t.status === 'queued',
  ).length

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }, [])

  const setMenuOpenMode = useCallback((mode: 'auto' | 'manual' | null) => {
    openModeRef.current = mode
    setOpenMode(mode)
  }, [])

  const closeMenu = useCallback(() => {
    clearAutoCloseTimer()
    setMenuOpenMode(null)
    setIsOpen(false)
  }, [clearAutoCloseTimer, setMenuOpenMode])

  const scheduleAutoClose = useCallback(() => {
    clearAutoCloseTimer()
    autoCloseTimerRef.current = setTimeout(() => {
      if (openModeRef.current === 'auto') {
        setMenuOpenMode(null)
        setIsOpen(false)
      }
    }, AUTO_CLOSE_DELAY_MS)
  }, [clearAutoCloseTimer, setMenuOpenMode])

  const handleToggle = useCallback(() => {
    clearAutoCloseTimer()
    const next = !isOpen
    setMenuOpenMode(next ? 'manual' : null)
    setIsOpen(next)
  }, [clearAutoCloseTimer, isOpen, setMenuOpenMode])

  const handleMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      closeMenu()
      buttonRef.current?.focus()
    },
    [closeMenu],
  )

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [closeMenu, isOpen])

  useEffect(() => {
    const handleReminder = () => {
      if (isOpen && openModeRef.current === 'manual') {
        return
      }

      setMenuOpenMode('auto')
      setIsOpen(true)
      scheduleAutoClose()
    }

    window.addEventListener(ASYNC_TASK_CENTER_REMINDER_EVENT, handleReminder)
    return () => {
      window.removeEventListener(ASYNC_TASK_CENTER_REMINDER_EVENT, handleReminder)
    }
  }, [isOpen, scheduleAutoClose, setMenuOpenMode])

  useEffect(() => {
    return () => {
      clearAutoCloseTimer()
    }
  }, [clearAutoCloseTimer])

  return (
    <div className="relative mr-2" ref={menuRef}>
      <AsyncTaskBell
        activeCount={activeCount}
        themeColor={currentTheme.primary}
        onClick={handleToggle}
        buttonRef={buttonRef}
        isOpen={isOpen}
        panelId={panelId}
        style={{ ...headerBtnStyle, '--chat-btn-hover-translate': '0px' } as CSSProperties}
      />

      <AnimatePresence>
        {isOpen && (
          <div
            id={panelId}
            ref={panelRef}
            className="fixed left-2 right-2 top-[88px] z-[60] sm:absolute sm:left-auto sm:right-0 sm:top-11"
            role="dialog"
            aria-label="后台任务中心"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
          >
            <AsyncTaskPanel themeColor={currentTheme.primary} />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
