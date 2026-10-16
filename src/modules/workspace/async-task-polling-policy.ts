import { ApiError } from '@/api/errors'

export const MAX_AGE_FOR_404_FAIL_MS = 30 * 60 * 1000
export const DAEMON_HEARTBEAT_INTERVAL_MS = 2_000
const DAEMON_HEARTBEAT_TTL_MS = 10_000

const NON_PROGRESS_STEP_NAMES = new Set(['请求排队中...', '等待状态确认'])

interface TaskProgressSnapshot {
  progressPercent?: number
  currentStepName?: string
}

export function isPendingStatusError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.statusCode !== 404) {
    return false
  }
  return /生成中|请等待|processing|pending/i.test(error.message || '')
}

export function isTransientPollingError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false
  }
  return (
    error.isNetworkError() ||
    error.statusCode === 502 ||
    error.statusCode === 503 ||
    error.statusCode === 504
  )
}

export function hasPersistedProgressEvidence(task?: TaskProgressSnapshot | null): boolean {
  if (!task) {
    return false
  }
  if (typeof task.progressPercent === 'number' && task.progressPercent > 0) {
    return true
  }
  const stepName = typeof task.currentStepName === 'string' ? task.currentStepName.trim() : ''
  return stepName.length > 0 && !NON_PROGRESS_STEP_NAMES.has(stepName)
}

export function hasFreshDaemonHeartbeat(heartbeatAt: number | null | undefined): boolean {
  return typeof heartbeatAt === 'number' && Date.now() - heartbeatAt <= DAEMON_HEARTBEAT_TTL_MS
}
