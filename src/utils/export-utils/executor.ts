import JSZip from 'jszip'

import { createTimestampedFileName } from '../download'
import { EXPORT_FORMATS } from '../download'
import type { DownloadProgress } from '../download'

import { convertToFormat } from './formatters'
import type { ArchiveEntry, ExportTask } from './models'
import { ARCHIVE_DIR } from './models'
import { createTaskProgressReporter } from './task'

const GENERATED_FILES_REPORT_PATH = `${ARCHIVE_DIR.metadata}/generated-files-report.json`

export async function executeExportTask(
  task: ExportTask,
  format: keyof typeof EXPORT_FORMATS | 'zip',
  baseName: string,
  summary: Record<string, unknown>,
  buildEntries: () => ArchiveEntry[] | Promise<ArchiveEntry[]>,
): Promise<void> {
  const progressReporter = createTaskProgressReporter(task, task.options.onProgress)
  task.status = 'processing'
  task.progress = 0

  const payload = task.options.metadata ? { ...summary, metadata: task.options.metadata } : summary

  try {
    const useCompression = task.options.compress || format === 'zip'
    const resolvedFormat = useCompression ? 'zip' : format

    progressReporter({
      loaded: 0,
      total: 100,
      percentage: 0,
      status: 'loading',
    })

    if (resolvedFormat === 'json') {
      const filename = createTimestampedFileName(baseName, 'json')
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      triggerBlobDownload(blob, filename)
      task.result = {
        filename,
        size: blob.size,
      }
      task.status = 'completed'
    } else if (resolvedFormat === 'zip') {
      const entries = await buildEntries()
      const result = await downloadCompressedPackage(baseName, payload, entries, progressReporter)
      task.result = result
      task.status = 'completed'
    } else {
      const converted = await convertToFormat(payload, resolvedFormat)
      triggerBlobDownload(converted.blob, converted.filename)
      task.result = {
        filename: converted.filename,
        size: converted.blob.size,
      }
      task.status = 'completed'
    }

    progressReporter({
      loaded: 100,
      total: 100,
      percentage: 100,
      status: 'success',
    })
    task.progress = 100
  } catch (error) {
    const message = error instanceof Error ? error.message : '导出失败，请稍后重试'
    task.status = 'failed'
    task.error = message
    progressReporter({
      loaded: 0,
      total: 0,
      percentage: 0,
      status: 'error',
      error: message,
    })
  }
}

async function downloadCompressedPackage(
  baseName: string,
  summary: Record<string, unknown>,
  entries: ArchiveEntry[],
  onProgress?: (progress: DownloadProgress) => void,
): Promise<{
  filename: string
  size: number
  reportPath?: string
  attachmentSummary?: {
    addedCount: number
    failedCount: number
  }
}> {
  const zip = new JSZip()

  const metadataPayload = {
    ...summary,
    generatedAt: new Date().toISOString(),
  }

  zip.file(`${ARCHIVE_DIR.metadata}/summary.json`, JSON.stringify(metadataPayload, null, 2))

  entries.forEach((entry) => {
    zip.file(entry.path, entry.content)
  })

  const filename = createTimestampedFileName(baseName, 'zip')
  const attachmentReport = extractAttachmentReport(entries)

  const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    const percent = Math.min(100, Math.max(0, Math.round(metadata.percent)))
    onProgress?.({
      loaded: percent,
      total: 100,
      percentage: percent,
      status: 'loading',
    })
  })

  triggerBlobDownload(blob, filename)

  return {
    filename,
    size: blob.size,
    reportPath: attachmentReport?.reportPath,
    attachmentSummary: attachmentReport?.attachmentSummary,
  }
}

function extractAttachmentReport(entries: ArchiveEntry[]): {
  reportPath: string
  attachmentSummary: {
    addedCount: number
    failedCount: number
  }
} | null {
  const reportEntry = entries.find((entry) => entry.path === GENERATED_FILES_REPORT_PATH)
  if (!reportEntry || typeof reportEntry.content !== 'string') {
    return null
  }

  try {
    const parsed = JSON.parse(reportEntry.content) as {
      summary?: { addedCount?: number; failedCount?: number }
    }

    return {
      reportPath: GENERATED_FILES_REPORT_PATH,
      attachmentSummary: {
        addedCount: Number(parsed.summary?.addedCount ?? 0),
        failedCount: Number(parsed.summary?.failedCount ?? 0),
      },
    }
  } catch {
    return null
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
