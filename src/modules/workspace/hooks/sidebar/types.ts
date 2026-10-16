import type { ComponentProps } from 'react'

import { LeftSidebar } from '@/components/workspace'
import type { ChatTabKey } from '@/types'
import type { Project, Session, SessionDetail } from '@/types/api'
import type { SessionTrackingHint } from './optimistic-session'
import type { ChatSessionRestoreResult } from './session-surface'

import type { DialogController } from '../useWorkspaceDialogs'

export interface ChatSessionSelectPayload {
  tab: ChatTabKey
  project: Project | null
  session: Session
  detail: SessionDetail
  restoredProjectId: number | null
}

export type ChatSessionSelectHandler = (
  payload: ChatSessionSelectPayload,
) => ChatSessionRestoreResult

export interface UseWorkspaceSidebarParams {
  notify: (message: string) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
  hideConfirm: () => void
  quickCreateProjectDialog: DialogController
  sidebarWidth: number
  onChatSessionSelect?: ChatSessionSelectHandler
  onSessionActivated?: (surface: 'chat' | 'workflow') => void
  loadSessionFiles?: (params: {
    fileUrl?: string | string[]
    fileOutput?: Array<Record<string, unknown>>
    sessionId: number
  }) => void
  requestApiDetailLoad?: () => void
}

export interface AssociateProjectDialog {
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

export interface UseWorkspaceSidebarResult {
  leftSidebarProps: ComponentProps<typeof LeftSidebar>
  associateProjectDialog: AssociateProjectDialog
  projects: Project[]
  sessions: Session[]
  createProject: (payload: {
    name: string
    customerName?: string
    description?: string
  }) => Promise<Project | null>
  quickCreateProject: (payload: {
    name: string
    customerName: string
    description?: string
  }) => Promise<Project | null>
  refreshProjects: () => Promise<void>
  refreshSessions: () => Promise<void>
  trackSessionHint: (hint: SessionTrackingHint) => Promise<void> | void
  selectedProject: Project | null
  selectedProjectIndex: number
  selectedProjectId: number | null
  setSelectedProjectId: (id: number | null) => void
}

export type ProjectSessionsMap = Record<number, Session[]>
