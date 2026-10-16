import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

const mockUseLayout = jest.fn()
const mockUseWorkspaceDialogs = jest.fn()
const mockUseWorkspaceLayout = jest.fn()
const mockUseWorkspaceShortcuts = jest.fn()

jest.mock('@/app/providers/LayoutProvider', () => ({
  useLayout: () => mockUseLayout(),
}))

jest.mock('@/components/error-boundaries', () => ({
  PageErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-error-boundary">{children}</div>
  ),
}))

jest.mock('@/components/ui', () => ({
  ConfirmDialog: ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
  }) =>
    isOpen ? (
      <div aria-label={title} role="dialog">
        <p>{message}</p>
        <button onClick={onConfirm}>确认</button>
        <button onClick={onCancel}>取消</button>
      </div>
    ) : null,
}))

jest.mock('@/components/workspace', () => ({
  NavigationBar: (props: Record<string, unknown>) => (
    <div data-label={String(props.label)} data-testid="navigation-bar" />
  ),
}))

jest.mock('@/components/workspace/AsyncTaskDaemon', () => ({
  AsyncTaskDaemon: () => <div data-testid="async-task-daemon" />,
}))

jest.mock('@/components/SettingsPanel', () => ({
  SettingsPanel: ({ initialPage }: { initialPage?: string }) => (
    <div data-testid="settings-panel">{initialPage}</div>
  ),
}))

jest.mock('@/components/ReleaseNotesDialog', () => ({
  ReleaseNotesDialog: () => <div data-testid="release-notes-dialog" />,
}))

jest.mock('@/components/HelpDocumentation', () => ({
  HelpDocumentation: () => <div data-testid="help-documentation" />,
}))

jest.mock('@/components/CustomerServiceDialog', () => ({
  CustomerServiceDialog: () => <div data-testid="customer-service-dialog" />,
}))

jest.mock('@/components/HistoryDataDialog', () => ({
  HistoryDataDialog: ({ titleOverride }: { titleOverride?: string }) => (
    <div data-testid="history-data-dialog">{titleOverride}</div>
  ),
}))

jest.mock('@/components/LocalHistoryFilesDialog', () => ({
  LocalHistoryFilesDialog: ({ sessions }: { sessions: unknown[] }) => (
    <div data-testid="local-history-files-dialog">{sessions.length}</div>
  ),
}))

jest.mock('@/components/QuickCreateProjectDialog', () => ({
  QuickCreateProjectDialog: () => <div data-testid="quick-create-project-dialog" />,
}))

jest.mock('@/components/DownloadFilesDialog', () => ({
  DownloadFilesDialog: ({ exportType }: { exportType: string }) => (
    <div data-testid="download-files-dialog">{exportType}</div>
  ),
}))

jest.mock('@/components/AssociateProjectDialog', () => ({
  AssociateProjectDialog: ({ sessionName }: { sessionName: string }) => (
    <div data-testid="associate-project-dialog">{sessionName}</div>
  ),
}))

jest.mock('@/components/RewardSuggestionDialog', () => ({
  RewardSuggestionDialog: () => <div data-testid="reward-suggestion-dialog" />,
}))

jest.mock('./components/LazyDialogBoundary', () => ({
  LazyDialogBoundary: ({
    children,
    dialogName,
  }: {
    children: React.ReactNode
    dialogName: string
  }) => <section data-dialog-name={dialogName}>{children}</section>,
}))

jest.mock('./components/WorkspaceMainLayout', () => ({
  WorkspaceMainLayout: ({
    showSidebar,
    showContent,
  }: {
    showSidebar: boolean
    showContent: boolean
  }) => (
    <div
      data-show-content={String(showContent)}
      data-show-sidebar={String(showSidebar)}
      data-testid="main-layout"
    />
  ),
}))

jest.mock('./components/WorkspaceRightPanel', () => ({
  WorkspaceRightPanel: ({ chatMode, showSidebar }: { chatMode: string; showSidebar: boolean }) => (
    <div
      data-chat-mode={chatMode}
      data-show-sidebar={String(showSidebar)}
      data-testid="right-panel"
    />
  ),
}))

jest.mock('./hooks/useWorkspaceDialogs', () => ({
  useWorkspaceDialogs: () => mockUseWorkspaceDialogs(),
}))

jest.mock('./hooks/useWorkspaceLayout', () => ({
  useWorkspaceLayout: (params: unknown) => mockUseWorkspaceLayout(params),
}))

jest.mock('./hooks/useWorkspaceShortcuts', () => ({
  useWorkspaceShortcuts: (params: unknown) => mockUseWorkspaceShortcuts(params),
}))

import { WorkspaceApp } from './WorkspaceApp'

type DialogController = {
  isOpen: boolean
  open: jest.Mock
  close: jest.Mock
}

function createDialogController(isOpen = false): DialogController {
  return {
    isOpen,
    open: jest.fn(),
    close: jest.fn(),
  }
}

function createBaseDialogs() {
  return {
    toast: null as string | null,
    notify: jest.fn(),
    hideConfirm: jest.fn(),
    showConfirm: jest.fn(),
    confirmDialog: {
      isOpen: false,
      title: '确认标题',
      message: '确认内容',
      onConfirm: jest.fn(),
    },
    settings: createDialogController(),
    settingsPage: 'profile',
    releaseNotes: createDialogController(),
    help: createDialogController(),
    rewardSuggestion: createDialogController(),
    customerService: createDialogController(),
    quickCreateProject: createDialogController(),
    localHistory: {
      ...createDialogController(),
      options: null as { sessions?: unknown[] } | null,
    },
    history: {
      ...createDialogController(),
      options: null as Record<string, unknown> | null,
    },
    downloadDialog: {
      ...createDialogController(),
      options: null as Record<string, unknown> | null,
    },
  }
}

type WorkspaceDialogsForTest = ReturnType<typeof createBaseDialogs>

function createDialogs(overrides?: Partial<WorkspaceDialogsForTest>): WorkspaceDialogsForTest {
  return {
    ...createBaseDialogs(),
    ...overrides,
  }
}

function createBaseLayout() {
  const shortcuts = {
    generate: jest.fn(),
    copyInput: jest.fn(),
    undoInputs: jest.fn(),
    setLayoutMode: jest.fn(),
  }

  return {
    navigationBarProps: {
      label: 'navigation-props',
    },
    layoutRef: { current: null },
    middleRef: { current: null },
    appliedLayout: 'horizontal',
    isCompact: false,
    showSidebar: true,
    leftSidebarProps: { label: 'left-sidebar' },
    inputSectionProps: { label: 'input-section' },
    outputSectionProps: { label: 'output-section' },
    workflowSteps: [{ key: 'step-1' }],
    currentTheme: {
      primary: '#10b981',
      background: '#ffffff',
    },
    isAsync: false,
    chat: {
      isOpen: true,
      mode: 'quarter',
      width: 420,
      startResize: jest.fn(),
      keyboardResize: jest.fn(),
      panelProps: { label: 'chat-panel' },
    },
    shortcuts,
    historyDialog: {
      isOpen: false,
      close: jest.fn(),
      options: null as Record<string, unknown> | null,
    },
    handleHistoryDataConfirm: jest.fn(),
    localHistoryDialog: {
      isOpen: false,
      close: jest.fn(),
      options: null as { sessions?: unknown[] } | null,
    },
    handleQuickCreateProjectConfirm: jest.fn(),
    downloadDialog: {
      isOpen: false,
      close: jest.fn(),
      options: null as Record<string, unknown> | null,
    },
    downloadableFiles: [] as unknown[],
    sessions: [{ id: 1, title: '会话' }],
    workflows: [{ id: 2, api_name: '流程' }],
    associateProjectDialog: {
      isOpen: false,
      close: jest.fn(),
      onCreateNewProject: jest.fn(),
      onProjectSelect: jest.fn(),
      currentSessionTitle: '会话',
      mode: 'associate',
      excludeProjectId: null,
      isSubmitting: false,
    },
    projects: [{ id: 7, name: '项目', status: 'active' }],
  }
}

type WorkspaceLayoutForTest = ReturnType<typeof createBaseLayout>

function createLayout(overrides?: Partial<WorkspaceLayoutForTest>): WorkspaceLayoutForTest {
  return {
    ...createBaseLayout(),
    ...overrides,
  }
}

let setHeaderVisibility: jest.Mock
let setContentClassName: jest.Mock
let resetBreadcrumbs: jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  setHeaderVisibility = jest.fn()
  setContentClassName = jest.fn()
  resetBreadcrumbs = jest.fn()
  mockUseLayout.mockReturnValue({
    setHeaderVisibility,
    setContentClassName,
    resetBreadcrumbs,
  })
  mockUseWorkspaceDialogs.mockReturnValue(createDialogs())
  mockUseWorkspaceLayout.mockReturnValue(createLayout())
})

describe('WorkspaceApp', () => {
  test('provides a visible status while lazy dialogs are loading', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/modules/workspace/WorkspaceApp.tsx'),
      'utf8',
    )

    expect(source).not.toContain('fallback={null}')
    expect(source).toContain('正在加载界面…')
    expect(source).toContain('role="status"')
  })
  test('initializes workspace chrome and renders the main shell', () => {
    const { unmount } = render(<WorkspaceApp />)

    expect(screen.getByTestId('page-error-boundary')).not.toBeNull()
    expect(screen.getByTestId('async-task-daemon')).not.toBeNull()
    expect(screen.getByTestId('navigation-bar')).toHaveAttribute('data-label', 'navigation-props')
    expect(screen.getByTestId('main-layout')).toHaveAttribute('data-show-sidebar', 'true')
    expect(screen.getByTestId('main-layout')).toHaveAttribute('data-show-content', 'true')
    expect(screen.getByTestId('right-panel')).toHaveAttribute('data-chat-mode', 'quarter')
    expect(setHeaderVisibility).toHaveBeenCalledWith(false)
    expect(setContentClassName).toHaveBeenCalledWith('p-0')
    expect(mockUseWorkspaceShortcuts).toHaveBeenCalledWith(
      expect.objectContaining({
        generate: expect.any(Function),
        copyInput: expect.any(Function),
        undoInputs: expect.any(Function),
        setLayoutMode: expect.any(Function),
      }),
    )
    expect(mockUseWorkspaceLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        notify: expect.any(Function),
        showConfirm: expect.any(Function),
        hideConfirm: expect.any(Function),
      }),
    )

    unmount()

    expect(setContentClassName).toHaveBeenCalledWith('px-6 py-6')
    expect(resetBreadcrumbs).toHaveBeenCalledTimes(1)
  })

  test('keeps the right panel when full chat hides the center and sidebar', () => {
    mockUseWorkspaceLayout.mockReturnValue(
      createLayout({
        showSidebar: false,
        chat: {
          ...createLayout().chat,
          mode: 'full',
        },
      }),
    )

    render(<WorkspaceApp />)

    expect(screen.queryByTestId('main-layout')).toBeNull()
    expect(screen.getByTestId('right-panel')).toHaveAttribute('data-chat-mode', 'full')
    expect(screen.getByTestId('right-panel')).toHaveAttribute('data-show-sidebar', 'false')
  })

  test('renders only the sidebar surface when compact navigation selects the sidebar', () => {
    mockUseWorkspaceLayout.mockReturnValue(
      createLayout({
        isCompact: true,
        showSidebar: true,
        chat: {
          ...createLayout().chat,
          isOpen: false,
          mode: 'off',
        },
      }),
    )

    render(<WorkspaceApp />)

    expect(screen.getByTestId('main-layout')).toHaveAttribute('data-show-sidebar', 'true')
    expect(screen.getByTestId('main-layout')).toHaveAttribute('data-show-content', 'false')
  })

  test('routes toast, confirm dialog and customer service event through dialog controllers', () => {
    const confirmAction = jest.fn()
    const hideConfirm = jest.fn()
    const customerServiceOpen = jest.fn()
    mockUseWorkspaceDialogs.mockReturnValue(
      createDialogs({
        toast: '保存成功',
        hideConfirm,
        confirmDialog: {
          isOpen: true,
          title: '删除确认',
          message: '确定删除？',
          onConfirm: confirmAction,
        },
        customerService: {
          ...createDialogController(),
          open: customerServiceOpen,
        },
      }),
    )

    render(<WorkspaceApp />)

    expect(screen.getByRole('alert').textContent).toBe('保存成功')
    expect(screen.getByRole('dialog', { name: '删除确认' })).not.toBeNull()

    fireEvent.click(screen.getByText('确认'))
    window.dispatchEvent(new Event('openCustomerService'))

    expect(confirmAction).toHaveBeenCalledTimes(1)
    expect(hideConfirm).toHaveBeenCalledTimes(1)
    expect(customerServiceOpen).toHaveBeenCalledTimes(1)
  })

  test('renders opened lazy dialogs with workspace layout data', async () => {
    mockUseWorkspaceDialogs.mockReturnValue(
      createDialogs({
        settings: createDialogController(true),
        releaseNotes: createDialogController(true),
        help: createDialogController(true),
        rewardSuggestion: createDialogController(true),
        customerService: createDialogController(true),
        quickCreateProject: createDialogController(true),
      }),
    )
    mockUseWorkspaceLayout.mockReturnValue(
      createLayout({
        historyDialog: {
          isOpen: true,
          close: jest.fn(),
          options: {
            title: '历史标题',
          },
        },
        localHistoryDialog: {
          isOpen: true,
          close: jest.fn(),
          options: {
            sessions: [{ id: 1 }],
          },
        },
        downloadDialog: {
          isOpen: true,
          close: jest.fn(),
          options: {
            exportType: 'project',
          },
        },
        associateProjectDialog: {
          ...createLayout().associateProjectDialog,
          isOpen: true,
          currentSessionTitle: '待关联会话',
        },
      }),
    )

    render(<WorkspaceApp />)

    await waitFor(() => {
      expect(screen.getByTestId('settings-panel')).not.toBeNull()
    })
    expect(screen.getByTestId('release-notes-dialog')).not.toBeNull()
    expect(screen.getByTestId('help-documentation')).not.toBeNull()
    expect(screen.getByTestId('reward-suggestion-dialog')).not.toBeNull()
    expect(screen.getByTestId('customer-service-dialog')).not.toBeNull()
    expect(screen.getByTestId('history-data-dialog').textContent).toBe('历史标题')
    expect(screen.getByTestId('local-history-files-dialog').textContent).toBe('1')
    expect(screen.getByTestId('quick-create-project-dialog')).not.toBeNull()
    expect(screen.getByTestId('download-files-dialog').textContent).toBe('project')
    expect(screen.getByTestId('associate-project-dialog').textContent).toBe('待关联会话')
  })
})
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
