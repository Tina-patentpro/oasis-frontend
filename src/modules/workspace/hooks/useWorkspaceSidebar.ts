import {
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'

import { projectService, sessionService } from '@/api/services'
import { useDynamicTabs, useProjects, useSessionManagement } from '@/hooks'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Project, Session } from '@/types/api'

import { useModelPreferenceStore } from '@/stores/useModelPreferenceStore'
import { useWorkspaceStore } from '../stores'
import type { OptimisticSessionsByFolder } from './sidebar/optimistic-session'
import { pruneProjectSessionCountOverrides } from './sidebar/project-state-cleanup'
import { useProjectSessionCountOverrides } from './sidebar/use-project-session-count-overrides'
import { useWorkspaceLaneLifecycle } from './sidebar/use-workspace-lane-lifecycle'
import { useSessionRemoteHandlers } from './sidebar/use-session-remote-handlers'
import { useChildProjectLoading } from './sidebar/use-child-project-loading'
import { useSessionPageLoading } from './sidebar/use-session-page-loading'
import {
  buildProjectsForDialogs,
  buildSelectedProjectView,
  useAssociateProjectDialogModel,
} from './sidebar/project-dialog-view'
import { useActiveProjectCache, useRootProjectLifecycle } from './sidebar/project-list-lifecycle'
import { useLegacyProjectLinkedSessions } from './sidebar/use-legacy-project-linked-sessions'

import {
  buildAvailableTabs,
  filterToolMetadataByModelVisibility,
  getProjectOrderUserKey,
  syncWorkspaceTabAndTool,
  useLeftSidebarProps,
  useProjectActions,
} from './sidebar'
import type { UseWorkspaceSidebarParams, UseWorkspaceSidebarResult } from './sidebar'
import { useWorkspaceProjectOrdering } from './sidebar/use-workspace-project-ordering'
import { useWorkspaceSessionClickHandler } from './sidebar/use-workspace-session-click-handler'
import { useWorkspaceSessionRefresh } from './sidebar/use-workspace-session-refresh'
import { useWorkspaceSidebarSessionViews } from './sidebar/use-workspace-sidebar-session-views'
import { HISTORY_PAGE_SIZE, PROJECT_PAGE_SIZE, PROJECT_SESSION_PAGE_SIZE, REGULAR_SESSION_REFRESH_INTERVAL_MS, SECONDARY_LANE_DELAY_MS, SPRINT_REFRESH_INTERVAL_MS, SPRINT_REFRESH_MAX_DURATION_MS, SPRINT_WEAK_SIGNAL_HITS_TO_STOP } from './sidebar/workspace-sidebar-constants'
import { isWorkspaceFastBootEnabled } from './workspace-env'

export type { ChatSessionSelectPayload } from './sidebar'

function setStateReducer<T>(state: T, action: SetStateAction<T>): T {
  if (typeof action === 'function') {
    return (action as (prev: T) => T)(state)
  }
  return action
}

export function useWorkspaceSidebar({
  notify,
  showConfirm,
  hideConfirm,
  quickCreateProjectDialog,
  sidebarWidth,
  onChatSessionSelect,
  onSessionActivated,
  loadSessionFiles,
  requestApiDetailLoad,
}: UseWorkspaceSidebarParams): UseWorkspaceSidebarResult {
  const fastBootEnabled = isWorkspaceFastBootEnabled()
  const [searchTerm, setSearchTerm] = useState('')
  const [projectStatusFilter, setProjectStatusFilter] = useState<'active' | 'archived'>('active')
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null)
  const tab = useWorkspaceStore((state) => state.tab)
  const setTab = useWorkspaceStore((state) => state.setTab)
  const tool = useWorkspaceStore((state) => state.tool)
  const setTool = useWorkspaceStore((state) => state.setTool)
  const managementTab = useWorkspaceStore((state) => state.managementTab)
  const setManagementTab = useWorkspaceStore((state) => state.setManagementTab)
  const showVersionInfo = useWorkspaceStore((state) => state.showVersionInfo)
  const setShowVersionInfo = useWorkspaceStore((state) => state.setShowVersionInfo)
  const selectedProjectId = useWorkspaceStore((state) => state.selectedProjectId)
  const setSelectedProjectId = useWorkspaceStore((state) => state.setSelectedProjectId)
  const selectedSessionId = useWorkspaceStore((state) => state.selectedSessionId)
  const setSelectedSessionId = useWorkspaceStore((state) => state.setSelectedSessionId)
  const projectOrderByUser = useWorkspaceStore((state) => state.projectOrderByUser)
  const setProjectOrderForUser = useWorkspaceStore((state) => state.setProjectOrderForUser)
  const clearProjectOrderForUser = useWorkspaceStore((state) => state.clearProjectOrderForUser)
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)
  const anonymousProjectOrderKey = getProjectOrderUserKey(null)
  const currentUserProjectOrderKey = getProjectOrderUserKey(currentUserId)
  const previousProjectOrderKeyRef = useRef(currentUserProjectOrderKey)
  const anonymousOrderChangedInSessionRef = useRef(false)
  const sessionClickSeqRef = useRef(0)
  const normalizedSearchTerm = searchTerm.trim()
  const historySearchKeyword = managementTab === 'history' ? normalizedSearchTerm : ''
  const projectSearchKeyword = managementTab === 'project' ? normalizedSearchTerm : ''
  const { tabs: dynamicTabs, toolMetadataByName, resolveToolName } = useDynamicTabs()
  const {
    projects: projectItems,
    pagination: projectPagination,
    isLoading: isProjectsLoading,
    nextPage: loadMoreProjectsPage,
    createProject: createProjectRequest,
    quickCreateProject: quickCreateProjectRequest,
    updateProject: updateProjectRequest,
    deleteProject: deleteProjectRequest,
    archiveProject: archiveProjectRequest,
    unarchiveProject: unarchiveProjectRequest,
    refresh: refreshProjects,
  } = useProjects({
    status: projectStatusFilter,
    parentId: 0,
    search: projectSearchKeyword || undefined,
    pageSize: PROJECT_PAGE_SIZE,
  })
  const [optimisticSessionsByFolder, dispatchOptimisticSessionsByFolder] = useReducer(
    setStateReducer<OptimisticSessionsByFolder>,
    {},
  )
  const setOptimisticSessionsByFolder = dispatchOptimisticSessionsByFolder
  const { legacyProjectLinkedSessions, setLegacyProjectLinkedSessions } =
    useLegacyProjectLinkedSessions({
      enabled: !fastBootEnabled,
      pageSize: PROJECT_SESSION_PAGE_SIZE,
      sessionApi: sessionService,
    })
  const [projectSessionCountOverrides, dispatchProjectSessionCountOverrides] = useReducer(
    setStateReducer<Record<number, number>>,
    {},
  )
  const setProjectSessionCountOverrides = dispatchProjectSessionCountOverrides

  const {
    ensureProjectSessionsLoaded,
    independentSessionPageState,
    independentSessions,
    independentSessionsSnapshotRef,
    loadIndependentSessionsPage,
    loadMoreIndependentSessions,
    loadMoreProjectSessions,
    loadProjectSessionsPage,
    projectSessionPageState,
    projectSessionsByProject,
    projectSessionsSnapshotRef,
    setIndependentSessionPageState,
    setIndependentSessions,
    setProjectSessionPageState,
    setProjectSessionsByProject,
  } = useSessionPageLoading({
    historyPageSize: HISTORY_PAGE_SIZE,
    historySearchKeyword,
    projectSessionPageSize: PROJECT_SESSION_PAGE_SIZE,
    sessionApi: sessionService,
    setProjectSessionCountOverrides,
  })

  const { projectsBaselineCount, rootProjects } = useRootProjectLifecycle({
    projectItems,
    projectPage: projectPagination.page,
    projectSearchKeyword,
    projectTotal: projectPagination.total,
  })

  const loadMoreProjects = useCallback(async () => {
    if (isProjectsLoading) {
      return
    }

    if (projectPagination.page >= projectPagination.totalPages) {
      return
    }

    await loadMoreProjectsPage()
  }, [
    isProjectsLoading,
    loadMoreProjectsPage,
    projectPagination.page,
    projectPagination.totalPages,
  ])

  useEffect(() => {
    if (managementTab !== 'history') {
      return
    }
    void loadIndependentSessionsPage(1, false)
  }, [historySearchKeyword, loadIndependentSessionsPage, managementTab])

  const { refreshSessions, trackSessionHint } = useWorkspaceSessionRefresh({
    dispatchOptimisticSessionsByFolder,
    getFolderSessionsSnapshotRefs: {
      independentSessionsSnapshotRef,
      projectSessionsSnapshotRef,
    },
    intervals: {
      regularRefreshIntervalMs: REGULAR_SESSION_REFRESH_INTERVAL_MS,
      sprintRefreshIntervalMs: SPRINT_REFRESH_INTERVAL_MS,
      sprintRefreshMaxDurationMs: SPRINT_REFRESH_MAX_DURATION_MS,
      sprintWeakSignalHitsToStop: SPRINT_WEAK_SIGNAL_HITS_TO_STOP,
    },
    loadIndependentSessionsPage,
    loadProjectSessionsPage,
    projectSessionPageState,
  })

  const { projectList, projectReorderEnabled, handleProjectReorder } = useWorkspaceProjectOrdering({
    anonymousOrderChangedInSessionRef,
    anonymousProjectOrderKey,
    clearProjectOrderForUser,
    currentUserProjectOrderKey,
    isProjectsLoading,
    previousProjectOrderKeyRef,
    projectOrderByUser,
    projectPaginationTotal: projectPagination.total,
    projectPaginationTotalPages: projectPagination.totalPages,
    projectSearchKeyword,
    projectSessionCountOverrides,
    projectStatusFilter,
    rootProjects,
    setProjectOrderForUser,
  })

  const {
    childProjectPaginationByParent,
    childProjectsByParent,
    ensureChildProjectsLoaded,
    loadMoreChildProjects,
  } = useChildProjectLoading({
    pageSize: PROJECT_PAGE_SIZE,
    projectApi: projectService,
    projectList,
    projectSearchKeyword,
    projectStatusFilter,
  })

  const activeProjectCache = useActiveProjectCache({
    projectList,
    projectSearchKeyword,
    projectStatusFilter,
  })

  const {
    filteredProjects,
    filteredProjectSessions,
    independentSessionPagination,
    projectListPagination,
    projectSessionPaginationByProject,
    sessionList,
    visibleIndependentSessions,
  } = useWorkspaceSidebarSessionViews({
    activeProjectCache,
    independentSessionPageState,
    independentSessions,
    isProjectsLoading,
    legacyProjectLinkedSessions,
    optimisticSessionsByFolder,
    projectList,
    projectPagination,
    projectSessionPageState,
    projectSessionsByProject,
    rootProjects,
    setOptimisticSessionsByFolder,
  })

  const handleProjectSelection = useCallback(
    (project: Project | null) => {
      setSelectedProjectId(project?.id ?? null)
    },
    [setSelectedProjectId],
  )

  const {
    handleAssociateProjectRemote,
    handleDeleteSessionRemote,
    handleDissociateProjectRemote,
    handleRenameSessionRemote,
  } = useSessionRemoteHandlers({
    activeProjectCache,
    independentSessionPageState,
    independentSessions,
    independentSessionsSnapshotRef,
    legacyProjectLinkedSessions,
    loadIndependentSessionsPage,
    loadProjectSessionsPage,
    projectList,
    projectSessionCountOverrides,
    projectSessionPageSize: PROJECT_SESSION_PAGE_SIZE,
    projectSessionPageState,
    projectSessionsByProject,
    projectSessionsSnapshotRef,
    refreshSessions,
    remoteApi: sessionService,
    setIndependentSessionPageState,
    setIndependentSessions,
    setLegacyProjectLinkedSessions,
    setProjectSessionCountOverrides,
    setProjectSessionPageState,
    setProjectSessionsByProject,
  })

  const { handleProjectArchiveToggle, handleProjectDelete } = useProjectActions({
    archiveProject: archiveProjectRequest,
    unarchiveProject: unarchiveProjectRequest,
    deleteProject: deleteProjectRequest,
    refreshSessions,
    notify,
    showConfirm,
    selectedProjectId,
    setSelectedProjectId,
  })

  const {
    sessionMenuOpen,
    setSessionMenuOpen,
    renamingSessionId,
    renameValue,
    setRenameValue,
    sessionMenuRefs,
    associateProjectDialogOpen,
    setAssociateProjectDialogOpen,
    currentSessionProjectId,
    currentSessionTitle,
    isAssociatingProject,
    handleRenameSession,
    confirmRename,
    cancelRename,
    handleAssociateProject,
    handleDissociateProject,
    handleProjectSelect,
    handleCreateNewProject,
    handleExportSession,
    handleDeleteSession,
  } = useSessionManagement(notify, showConfirm, hideConfirm, quickCreateProjectDialog.open, {
    onRenameSession: handleRenameSessionRemote,
    onDeleteSession: handleDeleteSessionRemote,
    onAssociateProject: handleAssociateProjectRemote,
    onDissociateProject: handleDissociateProjectRemote,
  })

  useEffect(() => {
    dispatchProjectSessionCountOverrides((prev) =>
      pruneProjectSessionCountOverrides(prev, projectList),
    )
  }, [projectList])

  const getProjectSessionCount = useCallback(
    (projectId: number) => projectService.getProjectSessionCount(projectId),
    [],
  )

  useProjectSessionCountOverrides({
    associateProjectDialogOpen,
    getProjectSessionCount,
    projectList,
    projectSessionCountOverrides,
    setProjectSessionCountOverrides,
  })

  const { groupVisibility, toolVisibility, modelVisibility } = useModelPreferenceStore()

  const availableTabs = useMemo(
    () => buildAvailableTabs(dynamicTabs, groupVisibility, toolVisibility),
    [dynamicTabs, groupVisibility, toolVisibility],
  )

  const filteredToolMetadataByName = useMemo(
    () => filterToolMetadataByModelVisibility(toolMetadataByName, modelVisibility),
    [modelVisibility, toolMetadataByName],
  )

  useWorkspaceLaneLifecycle({
    availableTabs,
    independentSessionPagination,
    isProjectsLoading,
    loadIndependentSessionsPage,
    loadProjectSessionsPage,
    managementTab,
    projectList,
    projectSessionPageState,
    secondaryLaneDelayMs: SECONDARY_LANE_DELAY_MS,
  })

  useEffect(() => {
    if (selectedProjectId === null) {
      return
    }
    if (isProjectsLoading) {
      return
    }
    // Removed aggressive clear of selectedProjectId.
    // projectList is paginated and filtered by status. If the user selects a project
    // and then changes the filter or pagination, the project may temporarily leave projectList.
    // Clearing selectedProjectId here breaks session context randomly.
    // Project deletion manually clears selectedProjectId in useProjectActions.
  }, [isProjectsLoading, selectedProjectId])

  const { handleSessionClick, cancelPendingSessionRestore } = useWorkspaceSessionClickHandler({
    availableTabs,
    filteredToolMetadataByName,
    loadSessionFiles,
    notify,
    onChatSessionSelect,
    onSessionActivated,
    projectList,
    requestApiDetailLoad,
    resolveToolName,
    sessionClickSeqRef,
    setPendingSessionId,
    setSelectedProjectId,
    setSelectedSessionId,
    tab,
    tool,
    toolMetadataByName,
  })

  const { convertedProject, selectedProjectIndex } = buildSelectedProjectView({
    projectList,
    selectedProjectId,
  })

  const projectsForDialogs = useMemo(() => {
    return buildProjectsForDialogs({
      activeProjectCache,
      projectList,
      projectSearchKeyword,
      projectStatusFilter,
    })
  }, [activeProjectCache, projectList, projectSearchKeyword, projectStatusFilter])

  useEffect(() => {
    syncWorkspaceTabAndTool({
      availableTabs,
      filteredToolMetadataByName,
      toolMetadataByName,
      tab,
      tool,
      setTab,
      setTool,
    })
  }, [availableTabs, filteredToolMetadataByName, setTab, setTool, tab, tool, toolMetadataByName])

  const leftSidebarProps = useLeftSidebarProps({
    sidebarWidth,
    tab,
    tabs: availableTabs,
    tool,
    managementTab,
    showVersionInfo,
    sessions: visibleIndependentSessions,
    projects: filteredProjects,
    selectedProjectId,
    selectedSessionId,
    pendingSessionId,
    projectSessions: filteredProjectSessions,
    projectSessionPaginationByProject,
    independentSessionPagination,
    hasIndependentSessionBaseline: independentSessionPagination.total > 0,
    projectsBaselineCount,
    searchTerm,
    onSearchTermChange: setSearchTerm,
    projectStatusFilter,
    onProjectStatusFilterChange: setProjectStatusFilter,
    projectReorderEnabled,
    projectListPagination,
    renamingSessionId,
    renameValue,
    sessionMenuOpen,
    sessionMenuRefs,
    onTabChange: (nextTab: string) => { cancelPendingSessionRestore(); setTab(nextTab) },
    onToolChange: (nextTool) => { cancelPendingSessionRestore(); setTool(nextTool) },
    onToolVersionChange: (ver: string) => {
      cancelPendingSessionRestore(); setTool({ ...tool, ver })
    },
    onManagementTabChange: setManagementTab,
    onVersionInfoToggle: () => setShowVersionInfo(!showVersionInfo),
    onRenameSession: handleRenameSession,
    onRenameValueChange: setRenameValue,
    onConfirmRename: confirmRename,
    onCancelRename: cancelRename,
    onSessionMenuToggle: setSessionMenuOpen,
    onAssociateProject: (session: Session) => {
      handleAssociateProject(session)
      setAssociateProjectDialogOpen(true)
    },
    onDissociateProject: handleDissociateProject,
    onExportSession: handleExportSession,
    onDeleteSession: handleDeleteSession,
    onSessionClick: handleSessionClick,
    onProjectUpdate: updateProjectRequest,
    onProjectArchiveToggle: handleProjectArchiveToggle,
    onProjectDelete: handleProjectDelete,
    onProjectSelect: handleProjectSelection,
    onProjectReorder: handleProjectReorder,
    onLoadMoreProjects: loadMoreProjects,
    onEnsureProjectSessionsLoaded: ensureProjectSessionsLoaded,
    onLoadMoreProjectSessions: loadMoreProjectSessions,
    childProjectsByParent,
    childProjectPaginationByParent,
    onEnsureChildProjectsLoaded: ensureChildProjectsLoaded,
    onLoadMoreChildProjects: loadMoreChildProjects,
    onLoadMoreIndependentSessions: loadMoreIndependentSessions,
    toolMetadataByName: filteredToolMetadataByName as unknown as Record<
      string,
      import('@/types/api').Tool | undefined
    >,
  })

  const associateProjectDialog = useAssociateProjectDialogModel({
    associateProjectDialogOpen,
    currentSessionProjectId,
    currentSessionTitle,
    ensureProjectSessionsLoaded,
    handleCreateNewProject,
    handleProjectSelect,
    isSubmitting: isAssociatingProject,
    setAssociateProjectDialogOpen,
    setManagementTab,
    setProjectStatusFilter,
    setSelectedProjectId,
  })

  return {
    leftSidebarProps,
    associateProjectDialog,
    projects: projectsForDialogs,
    sessions: sessionList,
    createProject: async ({ name, customerName, description }) =>
      createProjectRequest({ name, customerName, description }),
    quickCreateProject: async ({ name, customerName, description }) =>
      quickCreateProjectRequest({ name, customerName, description }),
    refreshProjects,
    refreshSessions,
    trackSessionHint,
    selectedProject: convertedProject,
    selectedProjectIndex,
    selectedProjectId,
    setSelectedProjectId,
  }
}
