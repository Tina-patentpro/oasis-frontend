import JSZip from 'jszip'

import { getAccessToken } from '@/api/core/token-storage'
import { historyService } from '@/api/services'
import { buildFinalResult } from '@/modules/workspace/hooks/content-sections/async-result-hydrator'
import type { HistoryDataItem } from '@/types/api'

import { resolveDownloadUrl } from './download'
import {
  downloadBlob,
  ensureUniquePath,
  normalizeErrorMessage,
  sanitizeFileName,
  shouldAttachAuthorization,
} from './file-utils'

/** Backward-compatible alias kept for external callers (e.g. useSettingsPanelState). */
export const downloadBlobAsFile = downloadBlob

const GENERATED_FILES_DIR = '_generated-files'
const REPORT_PATH = '_metadata/generated-files-report.json'
const MAX_PAGES = 10000
const DEFAULT_HISTORY_PAGE_SIZE = 50
const DETAIL_CONCURRENCY = 4
const ATTACHMENT_CONCURRENCY = 3

interface AttachmentSource {
  recordId: string
  title: string
  type: string
  createdAt?: string
}

interface AttachmentCandidate {
  key: string
  rawUrl: string
  resolvedUrl: string
  fileName: string
  mimeType: string
  size?: number
  sources: AttachmentSource[]
}

interface DetailFailure {
  recordId: string
  title: string
  reason: string
}

interface AttachmentFailure {
  fileName: string
  downloadUrl: string
  sourceTitle: string
  sourceId: string
  reason: string
}

interface AttachmentSuccess {
  fileName: string
  downloadUrl: string
  zipPath: string
  sourceTitle: string
  sourceId: string
  size: number
  duplicateSources: AttachmentSource[]
}

export interface AugmentedUserDataExportResult {
  blob: Blob
  filename: string
  attachmentSummary: {
    discoveredCount: number
    addedCount: number
    failedCount: number
    skippedRecordCount: number
    reportPath?: string
  }
}

export interface UserDataExportProgress {
  stage:
    | 'fetching-base-zip'
    | 'loading-history'
    | 'loading-history-details'
    | 'collecting-attachments'
    | 'downloading-attachments'
    | 'building-final-zip'
    | 'triggering-download'
  message: string
  completed?: number
  total?: number
}

export async function buildAugmentedUserDataExportPackage(params: {
  baseZipBlob: Blob
  filename: string
  historyPageSize?: number
  onProgress?: (progress: UserDataExportProgress) => void
}): Promise<AugmentedUserDataExportResult> {
  const { baseZipBlob, filename, historyPageSize = DEFAULT_HISTORY_PAGE_SIZE, onProgress } = params
  onProgress?.({
    stage: 'loading-history',
    message: '正在读取历史记录…',
  })
  const historyItems = await loadAllHistoryItems(historyPageSize, onProgress)
  onProgress?.({
    stage: 'loading-history-details',
    message: `正在读取导出详情（0 / ${historyItems.length}）…`,
    completed: 0,
    total: historyItems.length,
  })
  const { details, detailFailures } = await loadHistoryDetails(historyItems, onProgress)
  onProgress?.({
    stage: 'collecting-attachments',
    message: '正在整理生成附件…',
  })
  const attachmentCandidates = collectAttachmentCandidates(details)
  onProgress?.({
    stage: 'collecting-attachments',
    message:
      attachmentCandidates.length > 0
        ? `已发现 ${attachmentCandidates.length} 个生成附件，正在准备打包…`
        : '未发现可补充的生成附件，正在整理导出包…',
    completed: attachmentCandidates.length,
    total: attachmentCandidates.length,
  })

  if (attachmentCandidates.length === 0 && detailFailures.length === 0) {
    return {
      blob: baseZipBlob,
      filename,
      attachmentSummary: {
        discoveredCount: 0,
        addedCount: 0,
        failedCount: 0,
        skippedRecordCount: 0,
      },
    }
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(baseZipBlob)
  } catch (error) {
    console.error('[user-data-export] 解析后端导出 ZIP 失败，回退为原始压缩包', error)
    return {
      blob: baseZipBlob,
      filename,
      attachmentSummary: {
        discoveredCount: attachmentCandidates.length,
        addedCount: 0,
        failedCount: attachmentCandidates.length,
        skippedRecordCount: detailFailures.length,
      },
    }
  }

  const usedPaths = new Set<string>()
  zip.forEach((relativePath) => {
    usedPaths.add(relativePath)
  })

  let processedAttachmentCount = 0
  const attachmentResults = await mapWithConcurrency(
    attachmentCandidates,
    ATTACHMENT_CONCURRENCY,
    async (candidate) => {
      const result = await downloadAttachment(candidate)
      processedAttachmentCount += 1
      onProgress?.({
        stage: 'downloading-attachments',
        message: `正在补充生成附件（${processedAttachmentCount} / ${attachmentCandidates.length}）…`,
        completed: processedAttachmentCount,
        total: attachmentCandidates.length,
      })
      return result
    },
  )

  const attachmentSuccesses: AttachmentSuccess[] = []
  const attachmentFailures: AttachmentFailure[] = []

  for (const result of attachmentResults) {
    if ('failure' in result) {
      attachmentFailures.push(result.failure)
      continue
    }

    const zipPath = createAttachmentZipPath(result.candidate, usedPaths)
    zip.file(zipPath, result.blob)

    attachmentSuccesses.push({
      fileName: result.candidate.fileName,
      downloadUrl: result.candidate.resolvedUrl,
      zipPath,
      sourceTitle: result.candidate.sources[0]?.title ?? '未知记录',
      sourceId: result.candidate.sources[0]?.recordId ?? '',
      size: result.blob.size,
      duplicateSources: result.candidate.sources.slice(1),
    })
  }

  const summary = {
    discoveredCount: attachmentCandidates.length,
    addedCount: attachmentSuccesses.length,
    failedCount: attachmentFailures.length,
    skippedRecordCount: detailFailures.length,
    reportPath:
      attachmentCandidates.length > 0 || detailFailures.length > 0 ? REPORT_PATH : undefined,
  }

  zip.file(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary,
        records: attachmentSuccesses,
        failures: attachmentFailures,
        skippedRecords: detailFailures,
      },
      null,
      2,
    ),
  )

  onProgress?.({
    stage: 'building-final-zip',
    message: '正在打包最终压缩包（0%）…',
    completed: 0,
    total: 100,
  })

  return {
    blob: await zip.generateAsync({ type: 'blob' }, (metadata) => {
      const percentage = Math.min(100, Math.max(0, Math.round(metadata.percent)))
      onProgress?.({
        stage: 'building-final-zip',
        message: `正在打包最终压缩包（${percentage}%）…`,
        completed: percentage,
        total: 100,
      })
    }),
    filename,
    attachmentSummary: summary,
  }
}

// downloadBlobAsFile is re-exported from ./file-utils via the alias at the top of this file.

async function loadAllHistoryItems(
  pageSize: number,
  onProgress?: (progress: UserDataExportProgress) => void,
): Promise<HistoryDataItem[]> {
  const itemsById = new Map<string, HistoryDataItem>()
  let currentPage = 1
  let totalPages = 1

  do {
    const response = await historyService.getHistoryData({
      page: currentPage,
      pageSize,
    })

    response.items.forEach((item) => {
      itemsById.set(item.id, item)
    })

    totalPages = Math.max(1, response.pagination.totalPages || 1)
    onProgress?.({
      stage: 'loading-history',
      message: `正在读取历史记录（第 ${Math.min(currentPage, totalPages)} / ${totalPages} 页）…`,
      completed: Math.min(currentPage, totalPages),
      total: totalPages,
    })
    currentPage += 1
  } while (currentPage <= totalPages && currentPage <= MAX_PAGES)

  return Array.from(itemsById.values())
}

async function loadHistoryDetails(
  items: HistoryDataItem[],
  onProgress?: (progress: UserDataExportProgress) => void,
): Promise<{
  details: HistoryDataItem[]
  detailFailures: DetailFailure[]
}> {
  let resolvedCount = 0
  const detailResults = await mapWithConcurrency(items, DETAIL_CONCURRENCY, async (item) => {
    try {
      const result = {
        detail: await historyService.getHistoryDataItem(item.id),
      }
      resolvedCount += 1
      onProgress?.({
        stage: 'loading-history-details',
        message: `正在读取导出详情（${resolvedCount} / ${items.length}）…`,
        completed: resolvedCount,
        total: items.length,
      })
      return result
    } catch (error) {
      resolvedCount += 1
      onProgress?.({
        stage: 'loading-history-details',
        message: `正在读取导出详情（${resolvedCount} / ${items.length}）…`,
        completed: resolvedCount,
        total: items.length,
      })
      return {
        detail: null as HistoryDataItem | null,
        failure: {
          recordId: item.id,
          title: item.title,
          reason: normalizeErrorMessage(error),
        } satisfies DetailFailure,
      }
    }
  })

  const details: HistoryDataItem[] = []
  const detailFailures: DetailFailure[] = []

  detailResults.forEach((result) => {
    if (result.detail) {
      details.push(result.detail)
      return
    }
    if ('failure' in result && result.failure) {
      detailFailures.push(result.failure)
    }
  })

  return {
    details,
    detailFailures,
  }
}

function collectAttachmentCandidates(details: HistoryDataItem[]): AttachmentCandidate[] {
  const candidates = new Map<string, AttachmentCandidate>()

  details.forEach((detail) => {
    const files =
      buildFinalResult({
        answerText: '',
        fileOutput: detail.file_output,
        fileUrl: detail.file_url,
        sessionId: normalizeSessionId(detail.id),
      })?.files ?? []

    files.forEach((file, index) => {
      const rawUrl = typeof file.url === 'string' ? file.url.trim() : ''
      if (!rawUrl) {
        return
      }

      const resolvedUrl = resolveDownloadUrl(rawUrl)
      const source: AttachmentSource = {
        recordId: detail.id,
        title: detail.title || `记录_${detail.id}`,
        type: detail.type || 'workflow',
        createdAt: detail.createdAt,
      }

      const existing = candidates.get(resolvedUrl)
      if (existing) {
        appendSourceIfMissing(existing.sources, source)
        return
      }

      candidates.set(resolvedUrl, {
        key: resolvedUrl,
        rawUrl,
        resolvedUrl,
        fileName: sanitizeFileName(file.fileName || `generated-file-${detail.id}-${index + 1}`),
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size,
        sources: [source],
      })
    })
  })

  return Array.from(candidates.values())
}

async function downloadAttachment(candidate: AttachmentCandidate): Promise<
  | {
      candidate: AttachmentCandidate
      blob: Blob
    }
  | {
      failure: AttachmentFailure
    }
> {
  try {
    const blob = await fetchAttachmentBlob(candidate)
    return {
      candidate,
      blob,
    }
  } catch (error) {
    return {
      failure: {
        fileName: candidate.fileName,
        downloadUrl: candidate.resolvedUrl,
        sourceTitle: candidate.sources[0]?.title ?? '未知记录',
        sourceId: candidate.sources[0]?.recordId ?? '',
        reason: normalizeErrorMessage(error),
      },
    }
  }
}

async function fetchAttachmentBlob(candidate: AttachmentCandidate): Promise<Blob> {
  const headers = new Headers()
  const token = getAccessToken()

  if (token && shouldAttachAuthorization(candidate.rawUrl, candidate.resolvedUrl)) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(candidate.resolvedUrl, {
    headers,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim())
  }

  return response.blob()
}

// shouldAttachAuthorization, isAbsoluteUrl — imported from ./file-utils

function normalizeSessionId(value: string): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function appendSourceIfMissing(target: AttachmentSource[], next: AttachmentSource): void {
  const exists = target.some(
    (item) =>
      item.recordId === next.recordId && item.title === next.title && item.type === next.type,
  )
  if (!exists) {
    target.push(next)
  }
}

function createAttachmentZipPath(candidate: AttachmentCandidate, usedPaths: Set<string>): string {
  const primarySource = candidate.sources[0]
  const sourceDirName = sanitizeFileName(
    `${primarySource?.title || '记录'}_${primarySource?.recordId || 'unknown'}`,
    'record',
  )
  const desiredPath = `${GENERATED_FILES_DIR}/${sourceDirName}/${sanitizeFileName(
    candidate.fileName,
    'generated-file',
  )}`

  return ensureUniquePath(desiredPath, usedPaths)
}

// ensureUniqueZipPath, sanitizeZipSegment, normalizeErrorMessage — imported from ./file-utils

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const results = new Array<R>(items.length)
  let nextIndex = 0

  const runWorker = async () => {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= items.length) {
        return
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()))

  return results
}
