import type { Theme } from '@/types'
import type { FileUrl, Project, Session, WorkflowExecutionFile, WorkflowStep } from '@/types/api'
import type { LayoutMode } from '@/types/workspace'

import type { SessionTrackingHint } from './sidebar/optimistic-session'
import type {
  InputSectionProps,
  OutputSectionProps,
} from './content-sections/use-workspace-section-props'

export interface UseWorkspaceContentSectionsParams {
  notify: (message: string) => void
  openDownloadDialog: (options?: { exportType?: string }) => void
  openHistoryDialog: (options?: { projectId?: number; type?: string; title?: string }) => void
  openLocalHistoryDialog: (options?: {
    projectId?: number
    title?: string
    sessions?: Session[]
  }) => void
  setHistoryConfirmCallback: (
    callback: (data: string[], rawItems?: Record<string, unknown>[]) => void,
  ) => void
  openQuickCreateProject: () => void
  onSessionTrackingHint?: (hint: SessionTrackingHint) => void | Promise<void>
  currentTheme: Theme
  appliedLayout: 'horizontal' | 'vertical' | 'contrast'
  layoutMode: LayoutMode
  setLayoutMode: (mode: LayoutMode) => void
  projects: Project[]
  sessions: Session[]
  selectedProjectId: number | null
  setSelectedProjectId: (id: number | null) => void
}

export interface UseWorkspaceContentSectionsResult {
  inputSectionProps: InputSectionProps
  outputSectionProps: OutputSectionProps
  workflowSteps: WorkflowStep[]
  downloadableFiles: WorkflowExecutionFile[]
  requestApiDetailLoad: () => void
  shortcuts: {
    generate: () => void
    copyInput: () => void
    undoInputs: () => void
    setLayoutMode: (mode: LayoutMode) => void
  }
  loadSessionFiles: (params: {
    fileUrl?: FileUrl
    fileOutput?: Array<Record<string, unknown>>
    sessionId: number
  }) => void
  isAsync: boolean
}
