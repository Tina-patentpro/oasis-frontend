import type { Instruction } from '@/api/services/instruction.service'
import type {
  FileRecord,
  HistoryDataItem,
  Project,
  Session,
  WorkflowExecutionFile,
  WorkflowListItem,
} from '@/types/api'

export type DownloadExportType =
  | 'session'
  | 'project'
  | 'history'
  | 'files'
  | 'workflow'
  | 'instructions'

export interface DownloadFilesDialogProps {
  isOpen: boolean
  onClose: () => void
  onDownload?: (selectedFiles: Set<string>) => void
  themeColor: string
  backgroundColor: string
  sessionId?: number
  projectId?: number
  exportType?: DownloadExportType
  isLoading?: boolean
  data?: {
    sessions?: Session[]
    projects?: Project[]
    history?: HistoryDataItem[]
    files?: FileRecord[]
    generatedFiles?: WorkflowExecutionFile[]
    workflows?: WorkflowListItem[]
  }
}

export interface FileItem {
  id: string
  name: string
  type: string
  size?: number
  data?: Session | Project | HistoryDataItem | FileRecord | WorkflowExecutionFile | WorkflowListItem
}

export type InstructionList = Instruction[]
