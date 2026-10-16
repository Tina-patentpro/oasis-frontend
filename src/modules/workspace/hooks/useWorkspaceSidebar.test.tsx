import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { Project, Session } from '@/types/api'
import type { UseWorkspaceSidebarParams } from './sidebar'

const mockUseDynamicTabs = jest.fn()
const mockUseProjects = jest.fn()
const mockUseSessionManagement = jest.fn()
const mockUseAuthStore = jest.fn()
const mockUseModelPreferenceStore = jest.fn()
const mockUseWorkspaceStore = jest.fn()
const mockIsWorkspaceFastBootEnabled = jest.fn()
const mockUseLegacyProjectLinkedSessions = jest.fn()
const mockUseSessionPageLoading = jest.fn()
const mockUseRootProjectLifecycle = jest.fn()
const mockUseWorkspaceSessionRefresh = jest.fn()
const mockUseWorkspaceProjectOrdering = jest.fn()
const mockUseChildProjectLoading = jest.fn()
const mockUseActiveProjectCache = jest.fn()
const mockUseWorkspaceSidebarSessionViews = jest.fn()
const mockUseSessionRemoteHandlers = jest.fn()
const mockUseProjectActions = jest.fn()
const mockUseProjectSessionCountOverrides = jest.fn()
const mockUseWorkspaceLaneLifecycle = jest.fn()
const mockBuildAvailableTabs = jest.fn()
const mockFilterToolMetadataByModelVisibility = jest.fn()
const mockGetProjectOrderUserKey = jest.fn()
const mockSyncWorkspaceTabAndTool = jest.fn()
const mockUseLeftSidebarProps = jest.fn()
const mockUseWorkspaceSessionClickHandler = jest.fn()
const mockBuildSelectedProjectView = jest.fn()
const mockBuildProjectsForDialogs = jest.fn()
const mockUseAssociateProjectDialogModel = jest.fn()

jest.mock('@/api/services', () => ({
  projectService: {
    getProjectSessionCount: jest.fn(),
  },
  sessionService: {},
}))

jest.mock('@/hooks', () => ({
  useDynamicTabs: (...args: unknown[]) => mockUseDynamicTabs(...args),
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
  useSessionManagement: (...args: unknown[]) => mockUseSessionManagement(...args),
}))

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => mockUseAuthStore(selector),
}))

jest.mock('@/stores/useModelPreferenceStore', () => ({
  useModelPreferenceStore: () => mockUseModelPreferenceStore(),
}))

jest.mock('../stores', () => ({
  useWorkspaceStore: (selector: (state: unknown) => unknown) => mockUseWorkspaceStore(selector),
}))

jest.mock('./workspace-env', () => ({
  isWorkspaceFastBootEnabled: () => mockIsWorkspaceFastBootEnabled(),
}))

jest.mock('./sidebar/use-legacy-project-linked-sessions', () => ({
  useLegacyProjectLinkedSessions: (...args: unknown[]) =>
    mockUseLegacyProjectLinkedSessions(...args),
}))

jest.mock('./sidebar/use-session-page-loading', () => ({
  useSessionPageLoading: (...args: unknown[]) => mockUseSessionPageLoading(...args),
}))

jest.mock('./sidebar/project-list-lifecycle', () => ({
  useRootProjectLifecycle: (...args: unknown[]) => mockUseRootProjectLifecycle(...args),
  useActiveProjectCache: (...args: unknown[]) => mockUseActiveProjectCache(...args),
}))

jest.mock('./sidebar/use-workspace-session-refresh', () => ({
  useWorkspaceSessionRefresh: (...args: unknown[]) => mockUseWorkspaceSessionRefresh(...args),
}))

jest.mock('./sidebar/use-workspace-project-ordering', () => ({
  useWorkspaceProjectOrdering: (...args: unknown[]) => mockUseWorkspaceProjectOrdering(...args),
}))

jest.mock('./sidebar/use-child-project-loading', () => ({
  useChildProjectLoading: (...args: unknown[]) => mockUseChildProjectLoading(...args),
}))

jest.mock('./sidebar/use-workspace-sidebar-session-views', () => ({
  useWorkspaceSidebarSessionViews: (...args: unknown[]) =>
    mockUseWorkspaceSidebarSessionViews(...args),
}))

jest.mock('./sidebar/use-session-remote-handlers', () => ({
  useSessionRemoteHandlers: (...args: unknown[]) => mockUseSessionRemoteHandlers(...args),
}))

jest.mock('./sidebar/use-project-session-count-overrides', () => ({
  useProjectSessionCountOverrides: (...args: unknown[]) =>
    mockUseProjectSessionCountOverrides(...args),
}))

jest.mock('./sidebar/use-workspace-lane-lifecycle', () => ({
  useWorkspaceLaneLifecycle: (...args: unknown[]) => mockUseWorkspaceLaneLifecycle(...args),
}))

jest.mock('./sidebar/use-workspace-session-click-handler', () => ({
  useWorkspaceSessionClickHandler: (...args: unknown[]) =>
    mockUseWorkspaceSessionClickHandler(...args),
}))

jest.mock('./sidebar/project-dialog-view', () => ({
  buildProjectsForDialogs: (...args: unknown[]) => mockBuildProjectsForDialogs(...args),
  buildSelectedProjectView: (...args: unknown[]) => mockBuildSelectedProjectView(...args),
  useAssociateProjectDialogModel: (...args: unknown[]) =>
    mockUseAssociateProjectDialogModel(...args),
}))

jest.mock('./sidebar', () => ({
  buildAvailableTabs: (...args: unknown[]) => mockBuildAvailableTabs(...args),
  filterToolMetadataByModelVisibility: (...args: unknown[]) =>
    mockFilterToolMetadataByModelVisibility(...args),
  getProjectOrderUserKey: (...args: unknown[]) => mockGetProjectOrderUserKey(...args),
  syncWorkspaceTabAndTool: (...args: unknown[]) => mockSyncWorkspaceTabAndTool(...args),
  useLeftSidebarProps: (...args: unknown[]) => mockUseLeftSidebarProps(...args),
  useProjectActions: (...args: unknown[]) => mockUseProjectActions(...args),
}))

import { useWorkspaceSidebar } from './useWorkspaceSidebar'

const project = {
  id: 7,
  name: '重点项目',
  status: 'active',
} as Project

const session = {
  id: 21,
  title: '会话记录',
} as Session

const tool = {
  name: 'demo-tool',
  ver: 'v1',
}

type SidebarPropsForTest = {
  onAssociateProject: (session: Session) => void
  onLoadMoreProjects: () => Promise<void>
  onProjectSelect: (project: Project) => void
  onSearchTermChange: (value: string) => void
  onTabChange: (tab: string) => void
  onToolChange: (tool: { name: string; ver: string }) => void
  onToolVersionChange: (version: string) => void
  onVersionInfoToggle: () => void
}

let workspaceState: Record<string, unknown>
let createProjectRequest: jest.Mock
let quickCreateProjectRequest: jest.Mock
let loadMoreProjectsPage: jest.Mock
let setSelectedProjectId: jest.Mock
let setTab: jest.Mock
let setTool: jest.Mock
let setShowVersionInfo: jest.Mock
let cancelPendingSessionRestore: jest.Mock
let setAssociateProjectDialogOpen: jest.Mock
let handleAssociateProject: jest.Mock
let refreshProjects: jest.Mock
let refreshSessions: jest.Mock
let trackSessionHint: jest.Mock

function createParams(): UseWorkspaceSidebarParams {
  return {
    notify: jest.fn(),
    showConfirm: jest.fn(),
    hideConfirm: jest.fn(),
    quickCreateProjectDialog: {
      isOpen: false,
      open: jest.fn(),
      close: jest.fn(),
    },
    sidebarWidth: 320,
    onChatSessionSelect: jest.fn((_payload: unknown) => ({ status: 'restored' as const })),
    loadSessionFiles: jest.fn(),
    requestApiDetailLoad: jest.fn(),
  }
}

beforeEach(() => {
  jest.clearAllMocks()

  createProjectRequest = jest.fn(async () => project)
  quickCreateProjectRequest = jest.fn(async () => project)
  loadMoreProjectsPage = jest.fn(async () => {})
  setSelectedProjectId = jest.fn()
  setTab = jest.fn()
  setTool = jest.fn()
  setShowVersionInfo = jest.fn()
  cancelPendingSessionRestore = jest.fn()
  setAssociateProjectDialogOpen = jest.fn()
  handleAssociateProject = jest.fn()
  refreshProjects = jest.fn(async () => {})
  refreshSessions = jest.fn(async () => {})
  trackSessionHint = jest.fn()

  workspaceState = {
    tab: 'workspace',
    setTab,
    tool,
    setTool,
    managementTab: 'project',
    setManagementTab: jest.fn(),
    showVersionInfo: false,
    setShowVersionInfo,
    selectedProjectId: project.id,
    setSelectedProjectId,
    selectedSessionId: session.id,
    setSelectedSessionId: jest.fn(),
    projectOrderByUser: {},
    setProjectOrderForUser: jest.fn(),
    clearProjectOrderForUser: jest.fn(),
  }

  mockUseWorkspaceStore.mockImplementation((selector: (state: unknown) => unknown) =>
    selector(workspaceState),
  )
  mockUseAuthStore.mockImplementation((selector: (state: unknown) => unknown) =>
    selector({ user: { id: 42 } }),
  )
  mockUseModelPreferenceStore.mockReturnValue({
    groupVisibility: {},
    toolVisibility: {},
    modelVisibility: {},
  })
  mockIsWorkspaceFastBootEnabled.mockReturnValue(true)
  mockGetProjectOrderUserKey.mockImplementation((userId: number | null) =>
    userId === null ? 'anonymous' : `user-${userId}`,
  )

  mockUseDynamicTabs.mockReturnValue({
    tabs: [{ key: 'tab-a' }],
    toolMetadataByName: {
      'demo-tool': { name: 'demo-tool' },
    },
    resolveToolName: jest.fn((name: string) => name),
  })
  mockUseProjects.mockReturnValue({
    projects: [project],
    pagination: {
      page: 1,
      total: 1,
      totalPages: 2,
    },
    isLoading: false,
    nextPage: loadMoreProjectsPage,
    createProject: createProjectRequest,
    quickCreateProject: quickCreateProjectRequest,
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    archiveProject: jest.fn(),
    unarchiveProject: jest.fn(),
    refresh: refreshProjects,
  })
  mockUseLegacyProjectLinkedSessions.mockReturnValue({
    legacyProjectLinkedSessions: [],
    setLegacyProjectLinkedSessions: jest.fn(),
  })
  mockUseSessionPageLoading.mockReturnValue({
    ensureProjectSessionsLoaded: jest.fn(async () => {}),
    independentSessionPageState: {},
    independentSessions: [session],
    independentSessionsSnapshotRef: { current: [session] },
    loadIndependentSessionsPage: jest.fn(async () => {}),
    loadMoreIndependentSessions: jest.fn(async () => {}),
    loadMoreProjectSessions: jest.fn(async () => {}),
    loadProjectSessionsPage: jest.fn(async () => {}),
    projectSessionPageState: {},
    projectSessionsByProject: { [project.id]: [session] },
    projectSessionsSnapshotRef: { current: { [project.id]: [session] } },
    setIndependentSessionPageState: jest.fn(),
    setIndependentSessions: jest.fn(),
    setProjectSessionPageState: jest.fn(),
    setProjectSessionsByProject: jest.fn(),
  })
  mockUseRootProjectLifecycle.mockReturnValue({
    projectsBaselineCount: 1,
    rootProjects: [project],
  })
  mockUseWorkspaceSessionRefresh.mockReturnValue({
    refreshSessions,
    trackSessionHint,
  })
  mockUseWorkspaceProjectOrdering.mockReturnValue({
    projectList: [project],
    projectReorderEnabled: true,
    handleProjectReorder: jest.fn(),
  })
  mockUseChildProjectLoading.mockReturnValue({
    childProjectPaginationByParent: {},
    childProjectsByParent: {},
    ensureChildProjectsLoaded: jest.fn(async () => {}),
    loadMoreChildProjects: jest.fn(async () => {}),
  })
  mockUseActiveProjectCache.mockReturnValue(new Map([[project.id, project]]))
  mockUseWorkspaceSidebarSessionViews.mockReturnValue({
    filteredProjects: [project],
    filteredProjectSessions: { [project.id]: [session] },
    independentSessionPagination: {
      page: 1,
      total: 1,
      totalPages: 1,
    },
    projectListPagination: {
      page: 1,
      total: 1,
      totalPages: 2,
    },
    projectSessionPaginationByProject: {},
    sessionList: [session],
    visibleIndependentSessions: [session],
  })
  mockUseSessionRemoteHandlers.mockReturnValue({
    handleAssociateProjectRemote: jest.fn(async () => {}),
    handleDeleteSessionRemote: jest.fn(async () => {}),
    handleDissociateProjectRemote: jest.fn(async () => {}),
    handleRenameSessionRemote: jest.fn(async () => {}),
  })
  mockUseProjectActions.mockReturnValue({
    handleProjectArchiveToggle: jest.fn(),
    handleProjectDelete: jest.fn(),
  })
  mockUseSessionManagement.mockReturnValue({
    sessionMenuOpen: null,
    setSessionMenuOpen: jest.fn(),
    renamingSessionId: null,
    renameValue: '',
    setRenameValue: jest.fn(),
    sessionMenuRefs: {},
    associateProjectDialogOpen: false,
    setAssociateProjectDialogOpen,
    currentSessionProjectId: null,
    currentSessionTitle: '会话记录',
    isAssociatingProject: false,
    handleRenameSession: jest.fn(),
    confirmRename: jest.fn(),
    cancelRename: jest.fn(),
    handleAssociateProject,
    handleDissociateProject: jest.fn(),
    handleProjectSelect: jest.fn(async () => {}),
    handleCreateNewProject: jest.fn(),
    handleExportSession: jest.fn(),
    handleDeleteSession: jest.fn(),
  })
  mockBuildAvailableTabs.mockReturnValue([{ key: 'tab-a' }])
  mockFilterToolMetadataByModelVisibility.mockReturnValue({
    'demo-tool': { name: 'demo-tool' },
  })
  mockUseLeftSidebarProps.mockImplementation((params: unknown) => params)
  mockUseWorkspaceSessionClickHandler.mockReturnValue({
    handleSessionClick: jest.fn(),
    cancelPendingSessionRestore,
  })
  mockBuildSelectedProjectView.mockReturnValue({
    convertedProject: project,
    selectedProjectIndex: 0,
  })
  mockBuildProjectsForDialogs.mockReturnValue([project])
  mockUseAssociateProjectDialogModel.mockReturnValue({
    isOpen: false,
    open: jest.fn(),
    close: jest.fn(),
    currentSessionTitle: '会话记录',
    mode: 'associate',
    excludeProjectId: null,
    isSubmitting: false,
    onCreateNewProject: jest.fn(),
    onProjectSelect: jest.fn(),
  })
})

describe('useWorkspaceSidebar', () => {
  test('assembles sidebar data from child hooks and store state', () => {
    const params = createParams()
    const { result } = renderHook(() => useWorkspaceSidebar(params))

    expect(result.current.projects).toEqual([project])
    expect(result.current.sessions).toEqual([session])
    expect(result.current.selectedProject).toBe(project)
    expect(result.current.selectedProjectIndex).toBe(0)
    expect(result.current.selectedProjectId).toBe(project.id)
    expect(result.current.leftSidebarProps).toMatchObject({
      sidebarWidth: 320,
      sessions: [session],
      projects: [project],
      selectedProjectId: project.id,
      selectedSessionId: session.id,
      projectReorderEnabled: true,
    })
    expect(mockUseProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        parentId: 0,
        search: undefined,
        pageSize: expect.any(Number),
      }),
    )
    expect(mockUseLegacyProjectLinkedSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        pageSize: expect.any(Number),
      }),
    )
  })

  test('forwards project creation calls to the project hook', async () => {
    const { result } = renderHook(() => useWorkspaceSidebar(createParams()))

    await expect(
      result.current.createProject({
        name: '新项目',
        customerName: '客户',
        description: '说明',
      }),
    ).resolves.toBe(project)
    await expect(
      result.current.quickCreateProject({
        name: '快速项目',
        customerName: '客户',
      }),
    ).resolves.toBe(project)

    expect(createProjectRequest).toHaveBeenCalledWith({
      name: '新项目',
      customerName: '客户',
      description: '说明',
    })
    expect(quickCreateProjectRequest).toHaveBeenCalledWith({
      name: '快速项目',
      customerName: '客户',
      description: undefined,
    })
  })

  test('exposes left sidebar callbacks for project selection, tool version and association', async () => {
    const { result } = renderHook(() => useWorkspaceSidebar(createParams()))
    const leftSidebarProps = result.current.leftSidebarProps as unknown as SidebarPropsForTest

    act(() => {
      leftSidebarProps.onProjectSelect(project)
    })
    act(() => {
      leftSidebarProps.onToolVersionChange('v2')
    })
    act(() => {
      leftSidebarProps.onVersionInfoToggle()
    })
    act(() => {
      leftSidebarProps.onAssociateProject(session)
    })
    await act(async () => {
      await leftSidebarProps.onLoadMoreProjects()
    })

    expect(setSelectedProjectId).toHaveBeenCalledWith(project.id)
    expect(setTool).toHaveBeenCalledWith({
      ...tool,
      ver: 'v2',
    })
    expect(setShowVersionInfo).toHaveBeenCalledWith(true)
    expect(handleAssociateProject).toHaveBeenCalledWith(session)
    expect(setAssociateProjectDialogOpen).toHaveBeenCalledWith(true)
    expect(loadMoreProjectsPage).toHaveBeenCalledTimes(1)
  })

  test('cancels an in-flight session restore before manual tab, tool, or version changes', () => {
    const { result } = renderHook(() => useWorkspaceSidebar(createParams()))
    const leftSidebarProps = result.current.leftSidebarProps as unknown as SidebarPropsForTest
    const manualTool = { name: 'manual-tool', ver: 'v9' }

    act(() => {
      leftSidebarProps.onTabChange('manual-tab')
    })
    expect(cancelPendingSessionRestore).toHaveBeenCalledTimes(1)
    expect(cancelPendingSessionRestore.mock.invocationCallOrder[0]).toBeLessThan(
      setTab.mock.invocationCallOrder[0]!,
    )

    cancelPendingSessionRestore.mockClear()
    act(() => {
      leftSidebarProps.onToolChange(manualTool)
    })
    expect(cancelPendingSessionRestore).toHaveBeenCalledTimes(1)
    const toolChangeCallOrder = setTool.mock.invocationCallOrder
    expect(cancelPendingSessionRestore.mock.invocationCallOrder[0]).toBeLessThan(
      toolChangeCallOrder[toolChangeCallOrder.length - 1]!,
    )

    cancelPendingSessionRestore.mockClear()
    act(() => {
      leftSidebarProps.onToolVersionChange('v10')
    })
    expect(cancelPendingSessionRestore).toHaveBeenCalledTimes(1)
    const versionChangeCallOrder = setTool.mock.invocationCallOrder
    expect(cancelPendingSessionRestore.mock.invocationCallOrder[0]).toBeLessThan(
      versionChangeCallOrder[versionChangeCallOrder.length - 1]!,
    )
  })

  test('passes trimmed project search text into project loading only on the project tab', () => {
    const { result } = renderHook(() => useWorkspaceSidebar(createParams()))
    mockUseProjects.mockClear()

    act(() => {
      const leftSidebarProps = result.current.leftSidebarProps as unknown as SidebarPropsForTest
      leftSidebarProps.onSearchTermChange('  demo  ')
    })

    expect(mockUseProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'demo',
      }),
    )
  })
})
