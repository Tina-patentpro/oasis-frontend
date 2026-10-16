import type { ComponentProps, MouseEvent, RefObject, TouchEvent } from 'react'

import type { ChatPanel } from '@/components/ChatPanel'
import type {
  InputSection,
  LeftSidebar,
  NavigationBar,
  OutputSection,
} from '@/components/workspace'
import type { Theme } from '@/types'
import type {
  Project,
  Session,
  WorkflowExecutionFile,
  WorkflowListItem,
  WorkflowStep,
} from '@/types/api'

import type { ChatMode } from '../stores'

import type {
  DialogController,
  HistoryDialogController,
  SettingsDialogController,
} from './useWorkspaceDialogs'

export interface HistoryWorkflowItem {
  id: number
  api_name: string
  user_id: number
  folder_id: number
  created_at: string
  inputs?: Record<string, unknown>
  response?: unknown
}

export interface UseWorkspaceLayoutParams {
  notify: (message: string) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
  hideConfirm: () => void
  historyDialog: HistoryDialogController
  downloadDialog: {
    isOpen: boolean
    open: (options?: { exportType?: string }) => void
    close: () => void
    options: { exportType?: string } | null
  }
  settingsDialog: SettingsDialogController
  releaseNotesDialog: DialogController
  helpDialog: DialogController
  rewardSuggestionDialog: DialogController
  customerServiceDialog: DialogController
  quickCreateProjectDialog: DialogController
  localHistoryDialog: DialogController & {
    open: (options?: { projectId?: number; title?: string; sessions?: Session[] }) => void
    setOpen: (open: boolean) => void
    options: {
      projectId?: number
      title?: string
      sessions?: Session[]
    } | null
  }
}

export interface WorkspaceLayoutResult {
  navigationBarProps: ComponentProps<typeof NavigationBar>
  leftSidebarProps: ComponentProps<typeof LeftSidebar>
  inputSectionProps: ComponentProps<typeof InputSection>
  outputSectionProps: ComponentProps<typeof OutputSection>
  workflowSteps: WorkflowStep[]
  downloadableFiles: WorkflowExecutionFile[]
  layoutRef: RefObject<HTMLDivElement | null>
  middleRef: RefObject<HTMLDivElement | null>
  appliedLayout: 'horizontal' | 'vertical' | 'contrast'
  isCompact: boolean
  showSidebar: boolean
  currentTheme: Theme
  chat: {
    isOpen: boolean
    mode: ChatMode
    width: number
    startResize: (event: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>) => void
    keyboardResize: (delta: number) => void
    panelProps: ComponentProps<typeof ChatPanel>
  }
  projects: Project[]
  sessions: Session[]
  workflows: WorkflowListItem[]
  selectedProject: Project | null
  selectedProjectIndex: number
  handleQuickCreateProjectConfirm: (projectName: string, projectDescription: string) => void
  downloadDialog: {
    isOpen: boolean
    open: (options?: { exportType?: string }) => void
    close: () => void
    options: { exportType?: string } | null
  }
  associateProjectDialog: {
    isOpen: boolean
    open: () => void
    close: () => void
    currentSessionTitle: string
    mode: 'associate' | 'transfer'
    excludeProjectId: number | null
    isSubmitting: boolean
    onCreateNewProject: () => void
    onProjectSelect: (project: Project) => Promise<void>
  }
  historyDialog: HistoryDialogController
  localHistoryDialog: DialogController & {
    open: (options?: { projectId?: number; title?: string; sessions?: Session[] }) => void
    setOpen: (open: boolean) => void
    options: {
      projectId?: number
      title?: string
      sessions?: Session[]
    } | null
  }
  shortcuts: {
    generate: () => void
    copyInput: () => void
    undoInputs: () => void
    setLayoutMode: (mode: import('@/types/workspace').LayoutMode) => void
  }
  handleHistoryDataConfirm: (data: string[], rawItems?: unknown[]) => void
  isAsync: boolean
}
