import type { Notification } from '@/types/api'

type TaskTerminalStatus = 'completed' | 'failed'

interface ParsedTaskStatusNotification {
  taskKey: string
  status: TaskTerminalStatus
  createdAtMs: number
  id: number
}

const TASK_KEY_WITH_LABEL_REGEX = /task[_-]?key(?:\s*为)?\s*[:：]\s*([A-Za-z0-9_-]+)/i
const TASK_ID_WITH_LABEL_REGEX = /task[_-]?id(?:\s*为)?\s*[:：]?\s*(task_[A-Za-z0-9_-]+)/i
const TASK_KEY_FALLBACK_REGEX = /\b(task_(?!id\b)[A-Za-z0-9_-]+)\b/i

const COMPLETED_PATTERNS: RegExp[] = [
  /任务已完成/i,
  /处理完成/i,
  /生成完成/i,
  /任务成功/i,
  /执行成功/i,
  /生成成功/i,
  /处理成功/i,
  /\b(completed|succeeded|success|done|finished)\b/i,
]

const FAILED_PATTERNS: RegExp[] = [
  /任务失败/i,
  /执行失败/i,
  /超时/i,
  /任务已取消/i,
  /执行已取消/i,
  /\b(failed|cancelled|timeout)\b/i,
]

const parseTimeMs = (value: string): number => {
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

const extractTaskKey = (text: string): string | null => {
  const labeledMatch = text.match(TASK_KEY_WITH_LABEL_REGEX)
  if (labeledMatch?.[1]) {
    return labeledMatch[1]
  }
  const taskIdMatch = text.match(TASK_ID_WITH_LABEL_REGEX)
  if (taskIdMatch?.[1]) {
    return taskIdMatch[1]
  }
  const fallbackMatch = text.match(TASK_KEY_FALLBACK_REGEX)
  if (fallbackMatch?.[1]) {
    return fallbackMatch[1]
  }
  return null
}

const parseStatus = (text: string): TaskTerminalStatus | null => {
  const hasCompleted = COMPLETED_PATTERNS.some((pattern) => pattern.test(text))
  const hasFailed = FAILED_PATTERNS.some((pattern) => pattern.test(text))

  if (hasCompleted && hasFailed) {
    return null
  }

  if (hasFailed) {
    return 'failed'
  }
  if (hasCompleted) {
    return 'completed'
  }
  return null
}

export const parseTaskStatusNotification = (
  notification: Notification,
): ParsedTaskStatusNotification | null => {
  const fullText = `${notification.title}\n${notification.message}`
  const taskKey = extractTaskKey(fullText)
  if (!taskKey) {
    return null
  }

  const status = parseStatus(fullText)
  if (!status) {
    return null
  }

  return {
    taskKey,
    status,
    createdAtMs: parseTimeMs(notification.createdAt),
    id: notification.id,
  }
}

export const buildLatestTaskStatusUpdates = (
  notifications: Notification[],
): Map<string, TaskTerminalStatus> => {
  const parsed = notifications
    .map((notification) => parseTaskStatusNotification(notification))
    .filter((item): item is ParsedTaskStatusNotification => item !== null)
    .sort((a, b) => {
      if (a.createdAtMs !== b.createdAtMs) {
        return a.createdAtMs - b.createdAtMs
      }
      return a.id - b.id
    })

  const updates = new Map<string, TaskTerminalStatus>()
  for (const item of parsed) {
    updates.set(item.taskKey, item.status)
  }

  return updates
}
