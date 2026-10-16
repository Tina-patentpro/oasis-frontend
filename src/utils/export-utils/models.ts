import type { HistoryDataItem, Project, Session } from '@/types/api'

import type { DownloadOptions } from '../download'
import { EXPORT_FORMATS } from '../download'

export interface ExportItem {
  id: string
  name: string
  type: 'session' | 'project' | 'history'
  data?: Session | Project | HistoryDataItem
  filePath?: string
}

export interface ExportOptions extends DownloadOptions {
  format?: keyof typeof EXPORT_FORMATS | 'zip'
  includeAttachments?: boolean
  compress?: boolean
  metadata?: Record<string, unknown>
}

export interface ExportTask {
  id: string
  items: ExportItem[]
  options: ExportOptions
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  result?: {
    downloadUrl?: string
    filename?: string
    size?: number
    reportPath?: string
    attachmentSummary?: {
      addedCount: number
      failedCount: number
    }
  }
}

export type ArchiveEntry = {
  path: string
  content: string | Blob | ArrayBuffer | Uint8Array
}

export const ARCHIVE_DIR = {
  sessions: 'sessions',
  projects: 'projects',
  history: 'history',
  attachments: '_generated-files',
  metadata: '_metadata',
} as const
