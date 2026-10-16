import { useMemo } from 'react'
import type { ComponentProps, MutableRefObject } from 'react'

import { LeftSidebar } from '@/components/workspace'
import type { Project, Session, Tool, UpdateProjectRequest } from '@/types/api'
import type { ManagementTab, Tab, ToolState } from '@/types'

interface UseLeftSidebarPropsParams {
  sidebarWidth: number
  tab: string
  tabs: Tab[]
  tool: ToolState
  managementTab: ManagementTab
  showVersionInfo: boolean
  sessions: Session[]
  projects: Project[]
  projectListPagination: {
    initialized: boolean
    isLoading: boolean
    hasMore: boolean
    loadedCount: number
    total: number
  }
  selectedProjectId: number | null
  selectedSessionId: number | null
  pendingSessionId: number | null
  projectSessions: Record<number, Session[]>
  projectSessionPaginationByProject: Record<
    number,
    {
      initialized: boolean
      isLoading: boolean
      isInitialLoading: boolean
      isRefreshing: boolean
      isLoadingMore: boolean
      hasMore: boolean
      loadedCount: number
      total: number
    }
  >
  childProjectsByParent: Record<number, Project[]>
  childProjectPaginationByParent: Record<
    number,
    {
      initialized: boolean
      isLoading: boolean
      hasMore: boolean
      loadedCount: number
      total: number
    }
  >
  independentSessionPagination: {
    initialized: boolean
    isLoading: boolean
    isInitialLoading: boolean
    isRefreshing: boolean
    isLoadingMore: boolean
    hasMore: boolean
    loadedCount: number
    total: number
  }
  hasIndependentSessionBaseline: boolean
  projectsBaselineCount: number
  searchTerm: string
  onSearchTermChange: (value: string) => void
  projectStatusFilter: 'active' | 'archived'
  onProjectStatusFilterChange: (value: 'active' | 'archived') => void
  projectReorderEnabled: boolean
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
  onConfirmRename: () => Promise<void>
  onCancelRename: () => void
  onSessionMenuToggle: (sessionId: number | null) => void
  onAssociateProject: (session: Session) => void
  onDissociateProject: (session: Session) => void
  onExportSession: (session: Session) => Promise<void>
  onDeleteSession: (session: Session) => void
  onSessionClick: (session: Session) => Promise<void>
  onLoadMoreIndependentSessions: () => Promise<void> | void
  onProjectUpdate: (projectId: number, updates: UpdateProjectRequest) => Promise<unknown>
  onProjectArchiveToggle: (project: Project) => Promise<void>
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

export function useLeftSidebarProps({
  sidebarWidth,
  tab,
  tabs,
  tool,
  managementTab,
  showVersionInfo,
  sessions,
  projects,
  projectListPagination,
  selectedProjectId,
  selectedSessionId,
  pendingSessionId,
  projectSessions,
  projectSessionPaginationByProject,
  childProjectsByParent,
  childProjectPaginationByParent,
  independentSessionPagination,
  hasIndependentSessionBaseline,
  projectsBaselineCount,
  searchTerm,
  onSearchTermChange,
  projectStatusFilter,
  onProjectStatusFilterChange,
  projectReorderEnabled,
  renamingSessionId,
  renameValue,
  sessionMenuOpen,
  sessionMenuRefs,
  onTabChange,
  onToolChange,
  onToolVersionChange,
  onManagementTabChange,
  onVersionInfoToggle,
  onRenameSession,
  onRenameValueChange,
  onConfirmRename,
  onCancelRename,
  onSessionMenuToggle,
  onAssociateProject,
  onDissociateProject,
  onExportSession,
  onDeleteSession,
  onSessionClick,
  onLoadMoreIndependentSessions,
  onProjectUpdate,
  onProjectArchiveToggle,
  onProjectDelete,
  onProjectSelect,
  onProjectReorder,
  onLoadMoreProjects,
  onEnsureProjectSessionsLoaded,
  onLoadMoreProjectSessions,
  onEnsureChildProjectsLoaded,
  onLoadMoreChildProjects,
  toolMetadataByName,
}: UseLeftSidebarPropsParams): ComponentProps<typeof LeftSidebar> {
  return useMemo(
    () => ({
      width: sidebarWidth,
      tab,
      tabs,
      tool,
      managementTab,
      showVersionInfo,
      sessions,
      projects,
      projectListPagination,
      selectedProjectId,
      selectedSessionId,
      pendingSessionId,
      projectSessions,
      projectSessionPaginationByProject,
      childProjectsByParent,
      childProjectPaginationByParent,
      independentSessionPagination,
      hasIndependentSessionBaseline,
      projectsBaselineCount,
      searchTerm,
      onSearchTermChange,
      projectStatusFilter,
      onProjectStatusFilterChange,
      projectReorderEnabled,
      renamingSessionId,
      renameValue,
      sessionMenuOpen,
      sessionMenuRefs,
      onTabChange,
      onToolChange,
      onToolVersionChange,
      onManagementTabChange,
      onVersionInfoToggle,
      onRenameSession,
      onRenameValueChange,
      onConfirmRename,
      onCancelRename,
      onSessionMenuToggle,
      onAssociateProject,
      onDissociateProject,
      onExportSession,
      onDeleteSession,
      onSessionClick,
      onLoadMoreIndependentSessions,
      onProjectUpdate,
      onProjectArchiveToggle,
      onProjectDelete,
      onProjectSelect,
      onProjectReorder,
      onLoadMoreProjects,
      onEnsureProjectSessionsLoaded,
      onLoadMoreProjectSessions,
      onEnsureChildProjectsLoaded,
      onLoadMoreChildProjects,
      toolMetadataByName,
    }),
    [
      hasIndependentSessionBaseline,
      managementTab,
      onAssociateProject,
      onDissociateProject,
      onCancelRename,
      onConfirmRename,
      onDeleteSession,
      onExportSession,
      onLoadMoreIndependentSessions,
      onManagementTabChange,
      onProjectArchiveToggle,
      onProjectDelete,
      onProjectReorder,
      onLoadMoreProjects,
      onEnsureProjectSessionsLoaded,
      onLoadMoreProjectSessions,
      onEnsureChildProjectsLoaded,
      onLoadMoreChildProjects,
      onProjectSelect,
      onProjectStatusFilterChange,
      onProjectUpdate,
      onRenameSession,
      onRenameValueChange,
      onSearchTermChange,
      onSessionClick,
      onSessionMenuToggle,
      onTabChange,
      onToolChange,
      onToolVersionChange,
      onVersionInfoToggle,
      projectSessions,
      projectSessionPaginationByProject,
      independentSessionPagination,
      projectReorderEnabled,
      projectListPagination,
      projectStatusFilter,
      projects,
      projectsBaselineCount,
      renameValue,
      renamingSessionId,
      searchTerm,
      selectedSessionId,
      pendingSessionId,
      selectedProjectId,
      sessionMenuOpen,
      sessionMenuRefs,
      childProjectsByParent,
      childProjectPaginationByParent,
      sessions,
      showVersionInfo,
      sidebarWidth,
      tab,
      tabs,
      tool,
      toolMetadataByName,
    ],
  )
}
