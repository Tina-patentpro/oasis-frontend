import { getAccessToken } from '@/api/core/token-storage'
import { buildFinalResult } from '@/modules/workspace/hooks/content-sections/async-result-hydrator'
import type { HistoryDataItem, Project, Session, WorkflowExecutionFile } from '@/types/api'

import { resolveDownloadUrl } from '../download'
import {
  ensureUniquePath,
  normalizeErrorMessage,
  sanitizeFileName,
  shouldAttachAuthorization,
} from '../file-utils'

import type { ArchiveEntry } from './models'
import { ARCHIVE_DIR } from './models'

const GENERATED_FILES_REPORT_PATH = `${ARCHIVE_DIR.metadata}/generated-files-report.json`

interface SessionAttachmentSuccess {
  fileName: string
  downloadUrl: string
  zipPath: string
  sourceTitle: string
  sourceId: string
  size: number
}

interface SessionAttachmentFailure {
  fileName: string
  downloadUrl: string
  sourceTitle: string
  sourceId: string
  reason: string
}

export async function buildSessionEntries(
  sessions: Session[],
  includeAttachments?: boolean,
): Promise<ArchiveEntry[]> {
  const entries: ArchiveEntry[] = []
  const usedPaths = new Set<string>()
  const attachmentSuccesses: SessionAttachmentSuccess[] = []
  const attachmentFailures: SessionAttachmentFailure[] = []

  for (const [index, session] of sessions.entries()) {
    const safeName = sanitizeFileName(session.title, `session_${index + 1}`)
    const fileName = `${ARCHIVE_DIR.sessions}/${safeName}.json`
    const payload: Record<string, unknown> = {
      ...session,
    }

    if (!includeAttachments) {
      delete payload['attachments']
    }

    entries.push({
      path: fileName,
      content: JSON.stringify(payload, null, 2),
    })
    usedPaths.add(fileName)

    if (includeAttachments) {
      const attachmentResult = await buildSessionAttachmentEntries(session, safeName, usedPaths)
      entries.push(...attachmentResult.entries)
      attachmentSuccesses.push(...attachmentResult.successes)
      attachmentFailures.push(...attachmentResult.failures)
    }
  }

  if (attachmentFailures.length > 0) {
    entries.push({
      path: GENERATED_FILES_REPORT_PATH,
      content: JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          summary: {
            discoveredCount: attachmentSuccesses.length + attachmentFailures.length,
            addedCount: attachmentSuccesses.length,
            failedCount: attachmentFailures.length,
          },
          records: attachmentSuccesses,
          failures: attachmentFailures,
        },
        null,
        2,
      ),
    })
  }

  return entries
}

export function buildProjectEntries(
  projects: Project[],
  includeAttachments?: boolean,
): ArchiveEntry[] {
  return projects.map((project, index) => {
    const safeName = sanitizeFileName(project.name, `project_${index + 1}`)
    const fileName = `${ARCHIVE_DIR.projects}/${safeName}.json`
    const payload: Record<string, unknown> = {
      ...project,
    }

    if (!includeAttachments) {
      delete payload['files']
      delete payload['assets']
    }

    return {
      path: fileName,
      content: JSON.stringify(payload, null, 2),
    }
  })
}

export function buildHistoryEntries(historyItems: HistoryDataItem[]): ArchiveEntry[] {
  return historyItems.map((item, index) => {
    const safeName = sanitizeFileName(item.title, `history_${index + 1}`)
    const fileName = `${ARCHIVE_DIR.history}/${safeName}.json`

    return {
      path: fileName,
      content: JSON.stringify(item, null, 2),
    }
  })
}

// sanitizeFileName — imported from ../file-utils

async function buildSessionAttachmentEntries(
  session: Session,
  safeSessionName: string,
  usedPaths: Set<string>,
): Promise<{
  entries: ArchiveEntry[]
  successes: SessionAttachmentSuccess[]
  failures: SessionAttachmentFailure[]
}> {
  const files =
    buildFinalResult({
      answerText: session.answer_text,
      fileOutput: session.file_output,
      fileUrl: session.file_url,
      sessionId: session.id,
    })?.files ?? []

  const entries: ArchiveEntry[] = []
  const successes: SessionAttachmentSuccess[] = []
  const failures: SessionAttachmentFailure[] = []

  for (const [index, file] of files.entries()) {
    const rawUrl = typeof file.url === 'string' ? file.url.trim() : ''
    if (!rawUrl) {
      continue
    }

    const fileName = sanitizeFileName(file.fileName, `generated-file-${index + 1}`)
    const resolvedUrl = resolveDownloadUrl(rawUrl)
    try {
      const blob = await fetchAttachmentBlob(file, resolvedUrl)
      const zipPath = ensureUniquePath(
        `${ARCHIVE_DIR.attachments}/${safeSessionName}_${session.id}/${fileName}`,
        usedPaths,
      )
      entries.push({
        path: zipPath,
        content: blob,
      })
      successes.push({
        fileName,
        downloadUrl: resolvedUrl,
        zipPath,
        sourceTitle: session.title || `session_${session.id}`,
        sourceId: String(session.id),
        size: blob.size,
      })
    } catch (error) {
      failures.push({
        fileName,
        downloadUrl: resolvedUrl,
        sourceTitle: session.title || `session_${session.id}`,
        sourceId: String(session.id),
        reason: normalizeErrorMessage(error),
      })
    }
  }

  return {
    entries,
    successes,
    failures,
  }
}

async function fetchAttachmentBlob(
  file: WorkflowExecutionFile,
  resolvedUrl?: string,
): Promise<Blob> {
  const rawUrl = typeof file.url === 'string' ? file.url.trim() : ''
  if (!rawUrl) {
    throw new Error('缺少可下载地址')
  }

  const targetUrl = resolvedUrl || resolveDownloadUrl(rawUrl)
  const headers = new Headers()
  const token = getAccessToken()

  if (token && shouldAttachAuthorization(rawUrl, targetUrl)) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(targetUrl, {
    headers,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim())
  }

  return response.blob()
}

// shouldAttachAuthorization, isAbsoluteUrl, ensureUniqueArchivePath, normalizeErrorMessage
// — all imported from ../file-utils
