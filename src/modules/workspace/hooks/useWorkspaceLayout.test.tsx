import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { UseWorkspaceLayoutParams } from './workspace-layout-types'

const mockUseWorkspaceUIStore = jest.fn()
const mockUseLayoutManagement = jest.fn()
const mockUseWorkspaceNavigation = jest.fn()
const mockUseWorkspaceSidebar = jest.fn()
const mockUseWorkspaceContentSections = jest.fn()
const mockUseWorkspaceChatPanel = jest.fn()
const mockUseWorkspaceWorkflowList = jest.fn()
const mockUseWorkspaceChatWidthSync = jest.fn()
const mockIsWorkspaceFastBootEnabled = jest.fn()

jest.mock('../stores', () => ({
  useWorkspaceUIStore: () => mockUseWorkspaceUIStore(),
}))

jest.mock('@/hooks', () => ({
  useLayoutManagement: (...args: unknown[]) => mockUseLayoutManagement(...args),
}))

jest.mock('./useWorkspaceNavigation', () => ({
  useWorkspaceNavigation: (params: unknown) => mockUseWorkspaceNavigation(params),
}))

jest.mock('./useWorkspaceSidebar', () => ({
  useWorkspaceSidebar: (params: unknown) => mockUseWorkspaceSidebar(params),
}))

jest.mock('./useWorkspaceContentSections', () => ({
  useWorkspaceContentSections: (params: unknown) => mockUseWorkspaceContentSections(params),
}))

jest.mock('./useWorkspaceChatPanel', () => ({
  useWorkspaceChatPanel: (params: unknown) => mockUseWorkspaceChatPanel(params),
}))

jest.mock('./useWorkspaceWorkflowList', () => ({
  useWorkspaceWorkflowList: (params: unknown) => mockUseWorkspaceWorkflowList(params),
}))

jest.mock('./useWorkspaceChatWidthSync', () => ({
  useWorkspaceChatWidthSync: (params: unknown) => mockUseWorkspaceChatWidthSync(params),
}))

jest.mock('./workspace-env', () => ({
  isWorkspaceFastBootEnabled: () => mockIsWorkspaceFastBootEnabled(),
}))

import { useWorkspaceLayout } from './useWorkspaceLayout'

const selectedProject = { id: 7, name: '重点项目', status: 'active' }
const workflows = [{ id: 11, api_name: 'demo-workflow' }]
const sessions = [{ id: 21, title: '会话记录' }]
const navigationBarProps = { label: 'navigation' }
const leftSidebarProps = { label: 'left-sidebar' }
const inputSectionProps = { label: 'input-section' }
const outputSectionProps = { label: 'output-section' }
const workflowSteps = [{ key: 'step-1' }]
const downloadableFiles = [{ id: 'file-1' }]
const chatPanelProps = { label: 'chat-panel', session: {} }
const layoutRef = { current: null }
const middleRef = { current: null }
type AnimationFrameHandler = (time: number) => void

let setChatWidth: jest.MockedFunction<(width: number) => void>
let setAutoAdjustedChatWidth: jest.MockedFunction<(width: number) => void>
let setLayoutMode: jest.MockedFunction<(mode: string) => void>
let activateSessionSurface: jest.MockedFunction<
  (surface: 'chat' | 'workflow', options: { compact: boolean }) => void
>
let startChatDrag: jest.MockedFunction<() => void>
let resizeChatBy: jest.MockedFunction<(delta: number) => void>
let setAssociatedProject: jest.MockedFunction<(project: typeof selectedProject | null) => void>
let loadSessionFromSidebar: jest.MockedFunction<(...args: any[]) => any>
let chatHistoryConfirm: jest.MockedFunction<(data: string[]) => void>
let localHistoryClose: jest.MockedFunction<() => void>
let localHistorySetOpen: jest.MockedFunction<(open: boolean) => void>
let quickCreateProjectOpen: jest.MockedFunction<() => void>
let latestContentParams: any
let workspaceSidebarState: any

function createDialogController() {
  return {
    isOpen: false,
    open: jest.fn(),
    close: jest.fn(),
  }
}

function createLayoutParams(): UseWorkspaceLayoutParams {
  localHistoryClose = jest.fn()
  localHistorySetOpen = jest.fn()
  quickCreateProjectOpen = jest.fn()

  return {
    notify: jest.fn(),
    showConfirm: jest.fn(),
    hideConfirm: jest.fn(),
    historyDialog: {
      isOpen: false,
      open: jest.fn(),
      close: jest.fn(),
      setOpen: jest.fn(),
      options: null,
    },
    downloadDialog: {
      isOpen: true,
      open: jest.fn(),
      close: jest.fn(),
      options: { exportType: 'workflow' },
    },
    settingsDialog: {
      isOpen: false,
      open: jest.fn(),
      close: jest.fn(),
      openPage: jest.fn(),
    },
    releaseNotesDialog: createDialogController(),
    helpDialog: createDialogController(),
    rewardSuggestionDialog: createDialogController(),
    customerServiceDialog: createDialogController(),
    quickCreateProjectDialog: {
      isOpen: false,
      open: quickCreateProjectOpen,
      close: jest.fn(),
    },
    localHistoryDialog: {
      isOpen: false,
      open: jest.fn(),
      close: localHistoryClose,
      setOpen: localHistorySetOpen,
      options: null,
    },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  latestContentParams = null
  setChatWidth = jest.fn()
  setAutoAdjustedChatWidth = jest.fn()
  setLayoutMode = jest.fn()
  activateSessionSurface = jest.fn()
  startChatDrag = jest.fn()
  resizeChatBy = jest.fn()
  setAssociatedProject = jest.fn()
  loadSessionFromSidebar = jest.fn()
  chatHistoryConfirm = jest.fn()
  mockIsWorkspaceFastBootEnabled.mockReturnValue(true)

  mockUseWorkspaceUIStore.mockReturnValue({
    chatWidth: 420,
    preferredChatWidth: 468,
    setChatWidth,
    setAutoAdjustedChatWidth,
    layoutMode: 'auto',
    setLayoutMode,
    chatMode: 'quarter',
    activateSessionSurface,
  })
  mockUseWorkspaceWorkflowList.mockReturnValue({ workflows })
  mockUseWorkspaceNavigation.mockReturnValue({
    navigationBarProps,
    currentTheme: { primary: '#10b981', primaryHover: '#059669' },
    showSidebar: true,
    chatOpen: true,
    chatMode: 'quarter',
    isCompact: false,
  })
  workspaceSidebarState = {
    leftSidebarProps,
    projects: [selectedProject],
    sessions,
    selectedProject,
    selectedProjectIndex: 0,
    selectedProjectId: selectedProject.id,
    associateProjectDialog: {
      isOpen: false,
      open: jest.fn(),
      close: jest.fn(),
      currentSessionTitle: '会话记录',
      mode: 'associate',
      excludeProjectId: null,
      onCreateNewProject: jest.fn(),
      onProjectSelect: jest.fn(),
    },
    createProject: jest.fn(),
    quickCreateProject: jest.fn(),
    refreshProjects: jest.fn(),
    setSelectedProjectId: jest.fn(),
    trackSessionHint: jest.fn(),
    refreshSessions: jest.fn(),
  }
  mockUseWorkspaceSidebar.mockReturnValue(workspaceSidebarState)
  mockUseWorkspaceContentSections.mockImplementation((params: unknown) => {
    latestContentParams = params
    return {
      inputSectionProps,
      outputSectionProps,
      workflowSteps,
      downloadableFiles,
      requestApiDetailLoad: jest.fn(),
      loadSessionFiles: jest.fn(),
      shortcuts: {
        generate: jest.fn(),
        copyInput: jest.fn(),
        undoInputs: jest.fn(),
        setLayoutMode,
      },
      isAsync: false,
    }
  })
  mockUseWorkspaceChatPanel.mockReturnValue({
    chatPanelProps,
    handleHistoryDataConfirm: chatHistoryConfirm,
    setAssociatedProject,
    loadSessionFromSidebar,
  })
  mockUseLayoutManagement.mockReturnValue({
    appliedLayout: 'horizontal',
    middleRef,
    layoutRef,
    startChatDrag,
    resizeChatBy,
  })
})

describe('useWorkspaceLayout integration', () => {
  test('combines workspace sections, chat props, workflow list and sidebar data', () => {
    const layoutParams = createLayoutParams()
    const { result } = renderHook(() => useWorkspaceLayout(layoutParams))

    expect(result.current.navigationBarProps).toBe(navigationBarProps)
    expect(result.current.leftSidebarProps).toBe(leftSidebarProps)
    expect(result.current.inputSectionProps).toBe(inputSectionProps)
    expect(result.current.outputSectionProps).toBe(outputSectionProps)
    expect(result.current.workflowSteps).toBe(workflowSteps)
    expect(result.current.downloadableFiles).toBe(downloadableFiles)
    expect(result.current.workflows).toBe(workflows)
    expect(result.current.projects).toEqual([selectedProject])
    expect(result.current.sessions).toBe(sessions)
    expect(result.current.chat).toEqual({
      isOpen: true,
      mode: 'quarter',
      width: 420,
      startResize: startChatDrag,
      keyboardResize: resizeChatBy,
      panelProps: chatPanelProps,
    })
  })

  test('passes chat width inputs to the width sync hook', () => {
    const layoutParams = createLayoutParams()
    renderHook(() => useWorkspaceLayout(layoutParams))

    expect(mockUseWorkspaceChatWidthSync).toHaveBeenCalledWith({
      chatWidth: 420,
      preferredChatWidth: 468,
      setChatWidth,
      setAutoAdjustedChatWidth,
      chatMode: 'quarter',
      showSidebar: true,
      leftSidebarWidth: 320,
    })
  })

  test('uses the navigation-derived compact chat mode instead of the stale persisted mode', () => {
    mockUseWorkspaceNavigation.mockReturnValue({
      navigationBarProps,
      currentTheme: { primary: '#10b981', primaryHover: '#059669' },
      showSidebar: false,
      chatOpen: true,
      chatMode: 'full',
      isCompact: true,
    })

    const { result } = renderHook(() => useWorkspaceLayout(createLayoutParams()))

    expect(result.current.chat.mode).toBe('full')
    expect(result.current.isCompact).toBe(true)
    expect(mockUseWorkspaceChatWidthSync).toHaveBeenCalledWith(
      expect.objectContaining({ chatMode: 'full', showSidebar: false }),
    )
  })

  test.each([
    ['chat', 'workspace-chat-surface'],
    ['workflow', 'workspace-workflow-surface'],
  ] as const)(
    'moves compact %s session focus to its non-lazy surface after one animation frame',
    (surface, targetId) => {
      mockUseWorkspaceNavigation.mockReturnValue({
        navigationBarProps,
        currentTheme: { primary: '#10b981', primaryHover: '#059669' },
        showSidebar: true,
        chatOpen: true,
        isCompact: true,
      })
      const originalRequestAnimationFrame = window.requestAnimationFrame
      let scheduledFrame: AnimationFrameHandler | null = null
      const requestAnimationFrameMock = jest.fn((callback: AnimationFrameHandler) => {
        scheduledFrame = callback
        return 1
      })
      Object.defineProperty(window, 'requestAnimationFrame', {
        configurable: true,
        writable: true,
        value: requestAnimationFrameMock,
      })
      const sessionButton = document.createElement('button')
      const target = document.createElement('div')
      target.id = targetId
      target.tabIndex = -1
      document.body.append(sessionButton, target)
      sessionButton.focus()
      const targetFocus = jest.spyOn(target, 'focus')

      try {
        renderHook(() => useWorkspaceLayout(createLayoutParams()))
        const sidebarCalls = mockUseWorkspaceSidebar.mock.calls
        const sidebarParams = sidebarCalls[sidebarCalls.length - 1]?.[0] as {
          onSessionActivated: (nextSurface: 'chat' | 'workflow') => void
        }

        act(() => sidebarParams.onSessionActivated(surface))

        expect(activateSessionSurface).toHaveBeenCalledWith(surface, { compact: true })
        expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)
        expect(sessionButton).toHaveFocus()

        act(() => scheduledFrame?.(0))

        expect(targetFocus).toHaveBeenCalledWith({ preventScroll: true })
        expect(target).toHaveFocus()
      } finally {
        targetFocus.mockRestore()
        sessionButton.remove()
        target.remove()
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          writable: true,
          value: originalRequestAnimationFrame,
        })
      }
    },
  )

  test('keeps focus on the session trigger when compact activation has no mounted target', () => {
    mockUseWorkspaceNavigation.mockReturnValue({
      navigationBarProps,
      currentTheme: { primary: '#10b981', primaryHover: '#059669' },
      showSidebar: true,
      chatOpen: true,
      isCompact: true,
    })
    const originalRequestAnimationFrame = window.requestAnimationFrame
    let scheduledFrame: AnimationFrameHandler | null = null
    const requestAnimationFrameMock = jest.fn((callback: AnimationFrameHandler) => {
      scheduledFrame = callback
      return 1
    })
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: requestAnimationFrameMock,
    })
    const sessionButton = document.createElement('button')
    document.body.appendChild(sessionButton)
    sessionButton.focus()

    try {
      renderHook(() => useWorkspaceLayout(createLayoutParams()))
      const sidebarCalls = mockUseWorkspaceSidebar.mock.calls
      const sidebarParams = sidebarCalls[sidebarCalls.length - 1]?.[0] as {
        onSessionActivated: (surface: 'chat' | 'workflow') => void
      }

      act(() => sidebarParams.onSessionActivated('chat'))
      act(() => scheduledFrame?.(0))

      expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)
      expect(sessionButton).toHaveFocus()
    } finally {
      sessionButton.remove()
      Object.defineProperty(window, 'requestAnimationFrame', {
        configurable: true,
        writable: true,
        value: originalRequestAnimationFrame,
      })
    }
  })

  test('activates desktop sessions without scheduling a focus move', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame
    const requestAnimationFrameMock = jest.fn(() => 1)
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: requestAnimationFrameMock,
    })
    const sessionButton = document.createElement('button')
    document.body.appendChild(sessionButton)
    sessionButton.focus()

    try {
      renderHook(() => useWorkspaceLayout(createLayoutParams()))
      const sidebarCalls = mockUseWorkspaceSidebar.mock.calls
      const sidebarParams = sidebarCalls[sidebarCalls.length - 1]?.[0] as {
        onSessionActivated: (surface: 'chat' | 'workflow') => void
      }

      act(() => sidebarParams.onSessionActivated('workflow'))

      expect(activateSessionSurface).toHaveBeenCalledWith('workflow', { compact: false })
      expect(requestAnimationFrameMock).not.toHaveBeenCalled()
      expect(sessionButton).toHaveFocus()
    } finally {
      sessionButton.remove()
      Object.defineProperty(window, 'requestAnimationFrame', {
        configurable: true,
        writable: true,
        value: originalRequestAnimationFrame,
      })
    }
  })

  test('syncs the selected project from the sidebar into the chat panel', async () => {
    const layoutParams = createLayoutParams()
    renderHook(() => useWorkspaceLayout(layoutParams))

    await waitFor(() => {
      expect(setAssociatedProject).toHaveBeenCalledWith(selectedProject)
    })
  })

  test('does not overwrite a loaded chat session project with the sidebar selection', async () => {
    mockUseWorkspaceChatPanel.mockReturnValue({
      chatPanelProps: {
        ...chatPanelProps,
        session: {
          sessionId: 101,
          associatedProjectId: 3,
          associatedProjectName: '历史会话项目',
        },
      },
      handleHistoryDataConfirm: chatHistoryConfirm,
      setAssociatedProject,
      loadSessionFromSidebar,
    })

    const layoutParams = createLayoutParams()
    renderHook(() => useWorkspaceLayout(layoutParams))

    await act(async () => {})

    expect(setAssociatedProject).not.toHaveBeenCalled()
  })

  test('returns the chat restore result through the stable sidebar callback', () => {
    loadSessionFromSidebar.mockReturnValue({ status: 'restored' })
    renderHook(() => useWorkspaceLayout(createLayoutParams()))
    const sidebarCalls = mockUseWorkspaceSidebar.mock.calls
    const sidebarParams = sidebarCalls[sidebarCalls.length - 1]?.[0] as {
      onChatSessionSelect: (payload: Record<string, unknown>) => unknown
    }
    const payload = {
      tab: 'focus',
      project: selectedProject,
      session: sessions[0],
      detail: { id: 21 },
      restoredProjectId: 33,
    }

    const restoreResult = sidebarParams.onChatSessionSelect(payload)

    expect(restoreResult).toEqual({ status: 'restored' })
    expect(loadSessionFromSidebar).toHaveBeenCalledWith(
      payload.detail,
      payload.tab,
      payload.project,
      33,
    )
  })

  test('returns handler unavailable when the stable callback outlives its inner ref', () => {
    const { unmount } = renderHook(() => useWorkspaceLayout(createLayoutParams()))
    const sidebarCalls = mockUseWorkspaceSidebar.mock.calls
    const sidebarParams = sidebarCalls[sidebarCalls.length - 1]?.[0] as {
      onChatSessionSelect: (payload: Record<string, unknown>) => unknown
    }
    const payload = {
      tab: 'focus',
      project: selectedProject,
      session: sessions[0],
      detail: { id: 21 },
      restoredProjectId: 33,
    }
    unmount()

    const restoreResult = sidebarParams.onChatSessionSelect(payload)

    expect(restoreResult).toEqual({ status: 'blocked', reason: 'handler-unavailable' })
    expect(loadSessionFromSidebar).not.toHaveBeenCalled()
  })

  test('clears a pending local-history confirmation when the local-history dialog is closed', () => {
    const pendingConfirm = jest.fn<(data: string[], rawItems?: unknown[]) => void>()
    const layoutParams = createLayoutParams()
    const { result } = renderHook(() => useWorkspaceLayout(layoutParams))

    act(() => {
      latestContentParams.setHistoryConfirmCallback(() => pendingConfirm)
    })
    act(() => {
      result.current.handleHistoryDataConfirm(['before-close'], [{ source: 'pending' }])
    })

    expect(pendingConfirm).toHaveBeenCalledWith(['before-close'], [{ source: 'pending' }])
    expect(chatHistoryConfirm).not.toHaveBeenCalled()

    act(() => {
      latestContentParams.setHistoryConfirmCallback(() => pendingConfirm)
    })
    act(() => {
      result.current.localHistoryDialog.setOpen(false)
    })
    act(() => {
      result.current.handleHistoryDataConfirm(['after-close'], [{ source: 'cleared' }])
    })

    expect(localHistorySetOpen).toHaveBeenCalledWith(false)
    expect(pendingConfirm).toHaveBeenCalledTimes(1)
    expect(chatHistoryConfirm).toHaveBeenCalledWith(['after-close'])
  })

  test('keeps the quick-create dialog open and rejects when project creation fails', async () => {
    const layoutParams = createLayoutParams()
    const creationError = new Error('创建接口不可用')
    const quickCreateProject = jest.fn<() => Promise<never>>(() => Promise.reject(creationError))
    const close = layoutParams.quickCreateProjectDialog.close
    mockUseWorkspaceSidebar.mockReturnValue({
      ...workspaceSidebarState,
      quickCreateProject,
    })

    const { result } = renderHook(() => useWorkspaceLayout(layoutParams))

    await expect(
      result.current.handleQuickCreateProjectConfirm('智能机器人项目', '星矩机器人'),
    ).rejects.toBe(creationError)
    expect(close).not.toHaveBeenCalled()
    expect(layoutParams.notify).toHaveBeenCalledWith('项目创建失败，请稍后重试')
  })
})
