import type { CSSProperties, MutableRefObject } from 'react'
import type { Project, Session, Tool, UpdateProjectRequest } from '@/types/api'
import type { Tab, ToolState, ManagementTab } from '../../../types'

export interface ProjectSessionPagination {
  initialized: boolean
  isLoading: boolean
  isInitialLoading: boolean
  isRefreshing: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadedCount: number
  total: number
}

export interface ProjectListPagination {
  initialized: boolean
  isLoading: boolean
  hasMore: boolean
  loadedCount: number
  total: number
}

// ========== ToolGroupSection Props ==========

/** Props for ToolGroupSection component */
export interface ToolGroupSectionProps {
  tab: string
  tabs: Tab[]
  tool: ToolState
  currentTab: Tab | undefined
  showVersionInfo: boolean
  modelVersions: Array<{
    id: string
    name: string
    description?: string
    is_async?: number
    apiEndpoint?: string
  }>
  selectedVersionValue: string
  activeToolMetadata: Tool | undefined
  toolMetadataByName: Record<string, Tool | undefined>
  makePillStyle: (active: boolean) => CSSProperties
  onTabChange: (tab: string) => void
  onToolChange: (tool: ToolState) => void
  onToolVersionChange: (version: string) => void
  onVersionInfoToggle: () => void
}

// ========== ManagementSection Props ==========

/** Props for ManagementSection component (combines session history + project management) */
export interface ManagementSectionProps {
  // Tab state
  managementTab: ManagementTab
  onManagementTabChange: (tab: ManagementTab) => void

  // Search
  searchTerm: string
  onSearchTermChange: (value: string) => void

  // Session history props
  sessions: Session[]
  independentSessionPagination: ProjectSessionPagination
  hasIndependentSessionBaseline: boolean

  // Project props
  projects: Project[]
  projectListPagination: ProjectListPagination
  projectSessions: Record<number, Session[]>
  projectSessionPaginationByProject: Record<number, ProjectSessionPagination>
  childProjectsByParent: Record<number, Project[]>
  childProjectPaginationByParent: Record<number, ProjectListPagination>
  selectedProjectId: number | null
  projectStatusFilter: 'active' | 'archived'
  projectsBaselineCount: number
  projectReorderEnabled: boolean
  onProjectStatusFilterChange: (value: 'active' | 'archived') => void
  onProjectUpdate: (projectId: number, updates: UpdateProjectRequest) => Promise<unknown>
  onProjectArchiveToggle: (project: Project) => void
  onProjectDelete: (project: Project) => void
  onProjectSelect: (project: Project | null) => void
  onProjectReorder: (
    sourceProjectId: number,
    targetProjectId: number,
    position?: 'before' | 'after',
  ) => void
  onLoadMoreProjects: () => Promise<void> | void
  onEnsureProjectSessionsLoaded: (projectId: number) => Promise<void> | void
  onLoadMoreProjectSessions: (projectId: number) => Promise<void> | void
  onEnsureChildProjectsLoaded: (parentId: number) => Promise<void> | void
  onLoadMoreChildProjects: (parentId: number) => Promise<void> | void

  // Session actions (shared by both tabs)
  renamingSessionId: number | null
  renameValue: string
  sessionMenuOpen: number | null
  sessionMenuRefs: MutableRefObject<
    Record<number, { btnRef: HTMLButtonElement | null; menuRef: HTMLDivElement | null }>
  >
  onRenameSession: (session: Session) => void
  onRenameValueChange: (value: string) => void
  onConfirmRename: () => void
  onCancelRename: () => void
  onSessionMenuToggle: (sessionId: number | null) => void
  onAssociateProject: (session: Session) => void
  onDissociateProject: (session: Session) => void
  onExportSession: (session: Session) => void
  onDeleteSession: (session: Session) => void
  onSessionClick?: (session: Session) => void
  onLoadMoreIndependentSessions: () => Promise<void> | void

  // Styling
  makePillStyle: (active: boolean) => CSSProperties
}

// ========== LeftSidebar Props ==========

/** Main LeftSidebar component props (external interface) */
export interface LeftSidebarProps {
  width: number
  tab: string
  tabs: Tab[]
  tool: ToolState
  managementTab: ManagementTab
  showVersionInfo: boolean
  sessions: Session[]
  projects: Project[]
  projectListPagination: ProjectListPagination
  selectedProjectId: number | null
  selectedSessionId: number | null
  pendingSessionId?: number | null
  projectSessions: Record<number, Session[]>
  projectSessionPaginationByProject: Record<number, ProjectSessionPagination>
  childProjectsByParent: Record<number, Project[]>
  childProjectPaginationByParent: Record<number, ProjectListPagination>
  independentSessionPagination: ProjectSessionPagination
  hasIndependentSessionBaseline: boolean
  projectsBaselineCount: number
  searchTerm: string
  onSearchTermChange: (value: string) => void
  projectStatusFilter: 'active' | 'archived'
  projectReorderEnabled: boolean
  onProjectStatusFilterChange: (value: 'active' | 'archived') => void
  renamingSessionId: number | null
  renameValue: string
  sessionMenuOpen: number | null
  sessionMenuRefs: MutableRefObject<
    Record<number, { btnRef: HTMLButtonElement | null; menuRef: HTMLDivElement | null }>
  >
  onTabChange: (tab: string) => void
  onToolChange: (tool: ToolState) => void
  onToolVersionChange: (version: string) => void
  onManagementTabChange: (tab: ManagementTab) => void
  onVersionInfoToggle: () => void
  onRenameSession: (session: Session) => void
  onRenameValueChange: (value: string) => void
  onConfirmRename: () => void
  onCancelRename: () => void
  onSessionMenuToggle: (sessionId: number | null) => void
  onAssociateProject: (session: Session) => void
  onDissociateProject: (session: Session) => void
  onExportSession: (session: Session) => void
  onDeleteSession: (session: Session) => void
  onSessionClick?: (session: Session) => void
  onLoadMoreIndependentSessions: () => Promise<void> | void
  onProjectUpdate: (projectId: number, updates: UpdateProjectRequest) => Promise<unknown>
  onProjectArchiveToggle: (project: Project) => void
  onProjectDelete: (project: Project) => void
  onProjectSelect: (project: Project | null) => void
  onProjectReorder: (
    sourceProjectId: number,
    targetProjectId: number,
    position?: 'before' | 'after',
  ) => void
  onLoadMoreProjects: () => Promise<void> | void
  onEnsureProjectSessionsLoaded: (projectId: number) => Promise<void> | void
  onLoadMoreProjectSessions: (projectId: number) => Promise<void> | void
  onEnsureChildProjectsLoaded: (parentId: number) => Promise<void> | void
  onLoadMoreChildProjects: (parentId: number) => Promise<void> | void
  toolMetadataByName: Record<string, Tool | undefined>
}
