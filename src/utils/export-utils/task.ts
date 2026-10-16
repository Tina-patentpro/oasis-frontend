import type { DownloadProgress } from '../download'
import { EXPORT_FORMATS } from '../download'

import type { ExportItem, ExportOptions, ExportTask } from './models'

export function createExportTask(
  type: string,
  items: ExportItem[],
  options: ExportOptions,
): ExportTask {
  return {
    id: createExportTaskId(type),
    items,
    options,
    status: 'pending',
    progress: 0,
  }
}

export function createProgressCallback(
  taskId: string,
  onProgress?: (taskId: string, progress: DownloadProgress) => void,
) {
  return (progress: DownloadProgress) => {
    onProgress?.(taskId, progress)
  }
}

export function resolveFormat(options: ExportOptions): keyof typeof EXPORT_FORMATS | 'zip' {
  const format = options.format ?? 'json'
  if (format === 'zip') {
    return 'zip'
  }
  return EXPORT_FORMATS[format] ? format : 'json'
}

export function createTaskProgressReporter(
  task: ExportTask,
  original?: (progress: DownloadProgress) => void,
) {
  return (progress: DownloadProgress) => {
    task.progress = Math.max(0, Math.min(100, progress.percentage))
    original?.(progress)
  }
}

function createExportTaskId(type: string): string {
  return `export_${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}
