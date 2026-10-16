import { sessionService } from '@/api/services'
import type { AsyncTaskStatus } from '@/modules/workspace/stores'

const SESSION_ARCHIVE_CLOCK_SKEW_MS = 30 * 1000
const SESSION_ARCHIVE_FUTURE_TOLERANCE_MS = 2 * 60 * 1000

function hasResultEvidence(session: {
  answer_text?: string
  file_url?: unknown
  file_output?: Array<Record<string, unknown>>
}): boolean {
  return Boolean(
    session.answer_text?.trim() ||
      session.file_url ||
      (Array.isArray(session.file_output) && session.file_output.length > 0),
  )
}

export function isRecentArchiveForTask(
  task: AsyncTaskStatus,
  session: {
    title?: string
    toolType?: string
    api_name?: string
    createdAt?: string
    answer_text?: string
    file_url?: unknown
    file_output?: Array<Record<string, unknown>>
  },
  nowMs = Date.now(),
): boolean {
  if (!hasResultEvidence(session)) {
    return false
  }

  const createdAtMs = Date.parse(session.createdAt ?? '')
  if (!Number.isFinite(createdAtMs)) {
    return false
  }

  if (
    createdAtMs < task.createdAt - SESSION_ARCHIVE_CLOCK_SKEW_MS ||
    createdAtMs > nowMs + SESSION_ARCHIVE_FUTURE_TOLERANCE_MS
  ) {
    return false
  }

  const taskApiName = task.apiName.trim()
  const sessionApiName = (session.api_name ?? '').trim()
  if (sessionApiName) {
    return Boolean(taskApiName) && sessionApiName === taskApiName
  }

  const taskToolName = (task.toolName ?? '').trim()
  const sessionToolType = (session.toolType ?? '').trim()
  if (sessionToolType) {
    return Boolean(taskToolName) && sessionToolType === taskToolName
  }

  const taskName = taskToolName || taskApiName
  const sessionTitle = (session.title ?? '').trim()
  if (!taskName || !sessionTitle) {
    return false
  }

  return sessionTitle === taskName || sessionTitle.startsWith(`${taskName}-`)
}

export async function hasRecentSavedSessionForTask(task: AsyncTaskStatus): Promise<boolean> {
  try {
    const response = await sessionService.getSessions(
      {
        type: task.folderId > 0 ? 'projectLinked' : 'independent',
        projectId: task.folderId > 0 ? task.folderId : undefined,
        page: 1,
        pageSize: 10,
        scanMode: 'fast',
        cacheMode: 'bypass',
      },
      {},
    )

    return response.items.some((session) => isRecentArchiveForTask(task, session))
  } catch (error) {
    console.warn('[AsyncTaskArchive] Failed to reconcile saved session for async task:', error)
    return false
  }
}
