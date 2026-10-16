import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import { LeftSidebar } from './LeftSidebar'
import type { Session } from '@/types/api'

jest.mock('@/stores', () => ({
  useThemeStore: (selector: (state: any) => unknown) =>
    selector({
      currentTheme: {
        primary: '#10b981',
        primaryHover: '#059669',
      },
    }),
}))

jest.mock('../../error-boundaries', () => ({
  ComponentErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('./ToolGroupSection', () => ({
  ToolGroupSection: () => <div data-testid="tool-group-section" />,
}))

jest.mock('./ManagementSection', () => ({
  ManagementSection: ({
    sessions,
    projectSessions,
    renderSessionItem,
  }: {
    sessions: any[]
    projectSessions: Record<number, any[]>
    renderSessionItem: (session: any, variant: 'standalone' | 'project') => React.ReactNode
  }) => (
    <div>
      {sessions.map((session) => renderSessionItem(session, 'standalone'))}
      {Object.values(projectSessions)
        .flat()
        .map((session) => renderSessionItem(session, 'project'))}
    </div>
  ),
}))

function buildSession(id: number, overrides?: Partial<Session>): Session {
  return {
    id,
    userId: 1,
    title: `会话-${id}`,
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-03-09T07:00:00.000Z',
    updatedAt: '2026-03-09T07:00:00.000Z',
    ...overrides,
  }
}

function renderSidebar(overrides: Partial<React.ComponentProps<typeof LeftSidebar>> = {}) {
  const asyncNoop = async (): Promise<void> => {}
  const asyncProjectNoop = async (_projectId: number): Promise<void> => {}
  const asyncParentNoop = async (_parentId: number): Promise<void> => {}

  return render(
    <LeftSidebar
      width={320}
      tab="workspace"
      tabs={[{ k: 'workspace', tools: [] } as any]}
      tool={{ name: 'demo-tool', ver: 'v1' } as any}
      managementTab="project"
      showVersionInfo={false}
      sessions={[buildSession(200, { projectId: undefined, title: '独立会话A' })]}
      projects={[]}
      projectListPagination={{
        initialized: true,
        isLoading: false,
        hasMore: false,
        loadedCount: 0,
        total: 0,
      }}
      selectedProjectId={101}
      selectedSessionId={null}
      projectSessions={{
        101: [buildSession(201, { projectId: 101, title: '项目会话A' })],
      }}
      projectSessionPaginationByProject={{}}
      childProjectsByParent={{}}
      childProjectPaginationByParent={{}}
      independentSessionPagination={{
        initialized: true,
        isLoading: false,
        isInitialLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        hasMore: false,
        loadedCount: 0,
        total: 0,
      }}
      hasIndependentSessionBaseline={false}
      projectsBaselineCount={0}
      searchTerm=""
      onSearchTermChange={jest.fn()}
      projectStatusFilter="active"
      projectReorderEnabled={false}
      onProjectStatusFilterChange={jest.fn()}
      renamingSessionId={null}
      renameValue=""
      sessionMenuOpen={null}
      sessionMenuRefs={{ current: {} } as any}
      onTabChange={jest.fn()}
      onToolChange={jest.fn()}
      onToolVersionChange={jest.fn()}
      onManagementTabChange={jest.fn()}
      onVersionInfoToggle={jest.fn()}
      onRenameSession={jest.fn()}
      onRenameValueChange={jest.fn()}
      onConfirmRename={jest.fn()}
      onCancelRename={jest.fn()}
      onSessionMenuToggle={jest.fn()}
      onAssociateProject={jest.fn()}
      onDissociateProject={jest.fn()}
      onExportSession={jest.fn()}
      onDeleteSession={jest.fn()}
      onSessionClick={jest.fn()}
      onLoadMoreIndependentSessions={asyncNoop}
      onProjectUpdate={jest.fn(async () => null)}
      onProjectArchiveToggle={jest.fn()}
      onProjectDelete={jest.fn()}
      onProjectSelect={jest.fn()}
      onProjectReorder={jest.fn()}
      onLoadMoreProjects={asyncNoop}
      onEnsureProjectSessionsLoaded={asyncProjectNoop}
      onLoadMoreProjectSessions={asyncProjectNoop}
      onEnsureChildProjectsLoaded={asyncParentNoop}
      onLoadMoreChildProjects={asyncParentNoop}
      toolMetadataByName={{}}
      {...overrides}
    />,
  )
}

describe('LeftSidebar project session menu', () => {
  test('exposes the tools and history sidebar as a named landmark', () => {
    renderSidebar()

    expect(
      screen.getByRole('complementary', { name: '工具与历史记录侧栏' }),
    ).toBeInTheDocument()
  })

  test('keeps a non-current session menu trigger visible for keyboard focus', () => {
    renderSidebar({
      managementTab: 'history',
    })

    const trigger = screen.getByRole('button', { name: '打开会话菜单：独立会话A' })

    expect(trigger).toHaveClass('group-focus-within:opacity-100')
    expect(trigger).toHaveClass('focus-visible:opacity-100')
  })

  test('offers transfer association for project-linked sessions', () => {
    const onAssociateProject = jest.fn<(session: any) => void>()
    const onSessionMenuToggle = jest.fn<(sessionId: number | null) => void>()
    renderSidebar({
      sessionMenuOpen: 201,
      onSessionMenuToggle,
      onAssociateProject,
    })

    expect(screen.getByRole('menu', { name: '会话操作：项目会话A' })).not.toBeNull()

    fireEvent.click(screen.getByRole('menuitem', { name: '转移关联' }))

    expect(onSessionMenuToggle).toHaveBeenCalledWith(null)
    expect(onAssociateProject).toHaveBeenCalledWith(
      expect.objectContaining({ id: 201, projectId: 101 }),
    )
    expect(screen.getByRole('menuitem', { name: '取消关联' })).not.toBeNull()
  })

  test('marks the selected standalone session with aria-current', () => {
    renderSidebar({
      selectedSessionId: 200,
      managementTab: 'history',
    })

    const selectedSession = screen.getByText('独立会话A').closest('[aria-current="true"]')

    expect(selectedSession).not.toBeNull()
  })

  test('shows pending state without promoting the session to active', () => {
    renderSidebar({
      selectedSessionId: 201,
      pendingSessionId: 200,
      managementTab: 'history',
    })

    const pendingSession = screen.getByRole('button', { name: /^独立会话A/ })

    expect(pendingSession).toHaveAttribute('aria-busy', 'true')
    expect(pendingSession).not.toHaveAttribute('aria-current')
    expect(screen.getByText('正在加载')).not.toBeNull()
  })

  test('labels standalone session overflow menu buttons with the session title', () => {
    renderSidebar({
      managementTab: 'history',
    })

    expect(screen.getByRole('button', { name: '打开会话菜单：独立会话A' })).not.toBeNull()
  })

  test('uses the session title button instead of a nested fake button for session activation', () => {
    const onSessionClick = jest.fn<(session: Session) => void>()
    const { container } = renderSidebar({
      managementTab: 'history',
      onSessionClick,
    })

    expect(container.querySelector('[role="button"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^独立会话A/ }))

    expect(onSessionClick).toHaveBeenCalledWith(expect.objectContaining({ id: 200 }))
  })

  test('supports keyboard navigation and focus return in the session menu', () => {
    const onSessionMenuToggle = jest.fn<(sessionId: number | null) => void>()
    renderSidebar({
      managementTab: 'history',
      sessionMenuOpen: 200,
      onSessionMenuToggle,
    })

    const trigger = screen.getByRole('button', { name: '打开会话菜单：独立会话A' })
    const menu = screen.getByRole('menu', { name: '会话操作：独立会话A' })
    const renameItem = screen.getByRole('menuitem', { name: '重命名' })
    const associateItem = screen.getByRole('menuitem', { name: '关联项目' })

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', menu.id)

    expect(renameItem).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'ArrowDown' })

    expect(associateItem).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'Escape' })

    expect(onSessionMenuToggle).toHaveBeenCalledWith(null)
    expect(trigger).toHaveFocus()
  })

  test('renders optimistic sessions as generating and keeps them non-interactive', () => {
    const onSessionClick = jest.fn<(session: Session) => void>()
    renderSidebar({
      managementTab: 'history',
      sessions: [
        buildSession(-1, {
          userId: 0,
          title: '生成中的会话',
          modelVersion: 'optimistic',
          status: 'draft',
          updatedAt: '2026-03-20T09:00:00.000Z',
          createdAt: '2026-03-20T09:00:00.000Z',
          __optimistic: {
            taskKey: 'task-1',
            phase: 'submitted',
            submittedAtMs: 1_742_460_000_000,
            interactionLocked: true,
          },
        } as any),
      ],
      projectSessions: {},
      onSessionClick,
    })

    const title = screen.getByText('生成中的会话')
    expect(screen.getByText('生成中')).not.toBeNull()
    expect(title.closest('[tabindex]')).toBeNull()

    fireEvent.click(title)
    fireEvent.keyDown(title, { key: 'Enter' })

    expect(onSessionClick).not.toHaveBeenCalled()
  })
})
