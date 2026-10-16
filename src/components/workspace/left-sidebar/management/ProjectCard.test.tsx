import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { Project, Session } from '@/types/api'

import { ProjectCard } from './ProjectCard'
import type { ProjectListPagination, ProjectSessionPagination } from '../types'

const baseProject: Project = {
  id: 101,
  userId: 1,
  name: '测试项目',
  status: 'active',
  createdAt: '2026-02-12T12:00:00.000Z',
  updatedAt: '2026-02-12T12:00:00.000Z',
}

const baseSession: Session = {
  id: 201,
  userId: 1,
  projectId: 101,
  title: '会话A',
  toolType: 'workflow',
  modelVersion: 'fast',
  status: 'completed',
  createdAt: '2026-02-12T12:00:00.000Z',
  updatedAt: '2026-02-12T12:00:00.000Z',
}

const noop = () => {}
const asyncNoop = async () => {}

function buildPagination(
  overrides: Partial<ProjectSessionPagination> = {},
): ProjectSessionPagination {
  return {
    initialized: true,
    isLoading: false,
    isInitialLoading: false,
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: false,
    loadedCount: 1,
    total: 1,
    ...overrides,
  }
}

function buildProjectListPagination(
  overrides: Partial<ProjectListPagination> = {},
): ProjectListPagination {
  return {
    initialized: true,
    isLoading: false,
    hasMore: false,
    loadedCount: 0,
    total: 0,
    ...overrides,
  }
}

function renderProjectCard(options?: {
  project?: Project
  sessionsForProject?: Session[]
  childProjects?: Project[]
  isExpanded?: boolean
  isActive?: boolean
  projectMenuOpen?: number | null
  sessionPagination?: ProjectSessionPagination
  childProjectPagination?: ProjectListPagination
  onEnsureChildProjectsLoaded?: (parentId: number) => Promise<void> | void
  onLoadMoreChildProjects?: (parentId: number) => Promise<void> | void
  onProjectSelect?: (project: Project | null) => void
  onToggleProjectExpanded?: (projectId: number) => void
  onSetProjectMenuOpen?: (projectId: number | null) => void
  renderSessionItem?: (session: Session, variant: 'standalone' | 'project') => React.ReactNode
}) {
  const project = options?.project ?? baseProject
  const sessionsForProject = options?.sessionsForProject ?? [baseSession]
  const childProjects = options?.childProjects ?? []
  const isExpanded = options?.isExpanded ?? false
  const isActive = options?.isActive ?? false
  const projectMenuOpen = options?.projectMenuOpen ?? null
  const sessionPagination = options?.sessionPagination ?? buildPagination()
  const childProjectPagination = options?.childProjectPagination ?? buildProjectListPagination()
  const onEnsureChildProjectsLoaded = options?.onEnsureChildProjectsLoaded ?? noop
  const onLoadMoreChildProjects = options?.onLoadMoreChildProjects ?? noop
  const onProjectSelect = options?.onProjectSelect ?? noop
  const onToggleProjectExpanded = options?.onToggleProjectExpanded ?? noop
  const onSetProjectMenuOpen = options?.onSetProjectMenuOpen ?? noop
  const renderSessionItem =
    options?.renderSessionItem ??
    ((session: Session) => <div key={session.id}>{session.title}</div>)

  return render(
    <ProjectCard
      project={project}
      sessionsForProject={sessionsForProject}
      sessionPagination={sessionPagination}
      childProjects={childProjects}
      childProjectPagination={childProjectPagination}
      isExpanded={isExpanded}
      isActive={isActive}
      projectMenuOpen={projectMenuOpen}
      onSetProjectMenuOpen={onSetProjectMenuOpen}
      projectCardRef={noop}
      editingProjectNameId={null}
      editingProjectCustomerId={null}
      projectNameDraft=""
      projectCustomerDraft=""
      onSetProjectNameDraft={noop}
      onSetProjectCustomerDraft={noop}
      onSetProjectNameInputRef={noop}
      onSetProjectCustomerInputRef={noop}
      onBeginProjectNameEdit={noop}
      onCancelProjectNameEdit={noop}
      onCommitProjectNameEdit={asyncNoop}
      onBeginProjectCustomerEdit={noop}
      onCancelProjectCustomerEdit={noop}
      onCommitProjectCustomerEdit={asyncNoop}
      onProjectSelect={onProjectSelect}
      onProjectArchiveToggle={noop}
      onProjectDelete={noop}
      onToggleProjectExpanded={onToggleProjectExpanded}
      onEnsureSessionsLoaded={noop}
      onLoadMoreSessions={noop}
      onEnsureChildProjectsLoaded={onEnsureChildProjectsLoaded}
      onLoadMoreChildProjects={onLoadMoreChildProjects}
      renderSessionItem={renderSessionItem}
    />,
  )
}

describe('ProjectCard pagination states', () => {
  test('shows initial loading text when initial load is in progress', () => {
    renderProjectCard({
      sessionPagination: buildPagination({
        initialized: false,
        isLoading: true,
        isInitialLoading: true,
        loadedCount: 0,
        total: 0,
      }),
      sessionsForProject: [],
    })

    expect(screen.queryByText('正在加载…')).not.toBeNull()
  })

  test('keeps session count text while refreshing', () => {
    renderProjectCard({
      sessionPagination: buildPagination({
        initialized: true,
        isLoading: true,
        isRefreshing: true,
        isInitialLoading: false,
      }),
    })

    expect(screen.queryByText('1 个会话')).not.toBeNull()
    expect(screen.queryByText('点击加载')).toBeNull()
  })

  test('links expanded project sessions button to its rendered panel only while open', () => {
    const { rerender } = renderProjectCard()

    const closedTrigger = screen.getByRole('button', { name: '1 个会话' })
    expect(closedTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(closedTrigger).not.toHaveAttribute('aria-controls')

    rerender(
      <ProjectCard
        project={baseProject}
        sessionsForProject={[baseSession]}
        sessionPagination={buildPagination()}
        childProjects={[]}
        childProjectPagination={buildProjectListPagination()}
        isExpanded={true}
        isActive={false}
        projectMenuOpen={null}
        onSetProjectMenuOpen={noop}
        projectCardRef={noop}
        editingProjectNameId={null}
        editingProjectCustomerId={null}
        projectNameDraft=""
        projectCustomerDraft=""
        onSetProjectNameDraft={noop}
        onSetProjectCustomerDraft={noop}
        onSetProjectNameInputRef={noop}
        onSetProjectCustomerInputRef={noop}
        onBeginProjectNameEdit={noop}
        onCancelProjectNameEdit={noop}
        onCommitProjectNameEdit={asyncNoop}
        onBeginProjectCustomerEdit={noop}
        onCancelProjectCustomerEdit={noop}
        onCommitProjectCustomerEdit={asyncNoop}
        onProjectSelect={noop}
        onProjectArchiveToggle={noop}
        onProjectDelete={noop}
        onToggleProjectExpanded={noop}
        onEnsureSessionsLoaded={noop}
        onLoadMoreSessions={noop}
        onEnsureChildProjectsLoaded={noop}
        onLoadMoreChildProjects={noop}
        renderSessionItem={(session) => (
          <button key={session.id} type="button">
            {session.title}
          </button>
        )}
      />,
    )

    const openTrigger = screen.getByRole('button', { name: '1 个会话' })
    const panelId = openTrigger.getAttribute('aria-controls')

    expect(openTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(panelId).toBeTruthy()
    expect(document.getElementById(panelId as string)).not.toBeNull()
  })

  test('uses loading-more state for load-more button behavior', () => {
    renderProjectCard({
      isExpanded: true,
      sessionPagination: buildPagination({
        initialized: true,
        isLoading: true,
        isLoadingMore: true,
        hasMore: true,
        loadedCount: 1,
        total: 2,
      }),
    })

    const loadingMoreButton = screen.getByRole('button', { name: '正在加载…' })
    expect((loadingMoreButton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText('会话A')).not.toBeNull()
  })
  test('loads child projects on expand when project has children', async () => {
    const onEnsureChildProjectsLoaded = jest.fn<(parentId: number) => void>()

    renderProjectCard({
      isExpanded: true,
      sessionsForProject: [],
      project: {
        ...baseProject,
        hasChildren: true,
        childCount: 2,
      },
      childProjectPagination: buildProjectListPagination({
        initialized: false,
        isLoading: false,
        total: 2,
      }),
      onEnsureChildProjectsLoaded,
    })

    await waitFor(() => {
      expect(onEnsureChildProjectsLoaded).toHaveBeenCalledWith(baseProject.id)
    })
  })

  test('renders child load-more button and triggers callback', () => {
    const onLoadMoreChildProjects = jest.fn<(parentId: number) => void>()

    renderProjectCard({
      isExpanded: true,
      sessionsForProject: [],
      project: {
        ...baseProject,
        hasChildren: true,
        childCount: 3,
      },
      childProjects: [
        {
          ...baseProject,
          id: 202,
          name: '子项目-202',
          parentId: baseProject.id,
        },
      ],
      childProjectPagination: buildProjectListPagination({
        initialized: true,
        hasMore: true,
        isLoading: false,
        loadedCount: 1,
        total: 3,
      }),
      onLoadMoreChildProjects,
    })

    const loadMoreChildButton = screen.getByRole('button', { name: '加载更多子项目 (1/3)' })
    fireEvent.click(loadMoreChildButton)

    expect(onLoadMoreChildProjects).toHaveBeenCalledWith(baseProject.id)
  })

  test('clicking a project session does not toggle the active project selection', () => {
    const onProjectSelect = jest.fn<(project: Project | null) => void>()

    renderProjectCard({
      isExpanded: true,
      isActive: true,
      onProjectSelect,
      renderSessionItem: (session) => (
        <button key={session.id} type="button">
          {session.title}
        </button>
      ),
    })

    fireEvent.click(screen.getByRole('button', { name: '会话A' }))

    expect(onProjectSelect).not.toHaveBeenCalled()
  })

  test('labels the project overflow menu button with the project name', () => {
    renderProjectCard()

    expect(screen.getByRole('button', { name: '打开项目菜单：测试项目' })).not.toBeNull()
  })

  test('exposes project overflow actions with menu semantics', () => {
    renderProjectCard({ projectMenuOpen: baseProject.id })

    const trigger = screen.getByRole('button', { name: '打开项目菜单：测试项目' })
    const menu = screen.getByRole('menu', { name: '项目操作：测试项目' })

    expect(trigger).toHaveAttribute('aria-controls', menu.id)
    expect(screen.getByRole('menuitem', { name: '转为归档' })).toHaveFocus()
    expect(screen.getByRole('menuitem', { name: '删除项目' })).not.toBeNull()
  })

  test('supports keyboard navigation and focus return in the project menu', () => {
    const onSetProjectMenuOpen = jest.fn<(projectId: number | null) => void>()
    renderProjectCard({
      projectMenuOpen: baseProject.id,
      onSetProjectMenuOpen,
    })

    const trigger = screen.getByRole('button', { name: '打开项目菜单：测试项目' })
    const menu = screen.getByRole('menu', { name: '项目操作：测试项目' })
    const archiveItem = screen.getByRole('menuitem', { name: '转为归档' })
    const deleteItem = screen.getByRole('menuitem', { name: '删除项目' })

    archiveItem.focus()
    fireEvent.keyDown(menu, { key: 'ArrowDown' })

    expect(deleteItem).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'Escape' })

    expect(onSetProjectMenuOpen).toHaveBeenCalledWith(null)
    expect(trigger).toHaveFocus()
  })

  test('uses real buttons instead of a nested fake button for project header actions', () => {
    const onProjectSelect = jest.fn<(project: Project | null) => void>()
    const onToggleProjectExpanded = jest.fn<(projectId: number) => void>()
    const { container } = renderProjectCard({
      onProjectSelect,
      onToggleProjectExpanded,
    })

    expect(container.querySelector('[role="button"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '测试项目' }))

    expect(onProjectSelect).toHaveBeenCalledWith(baseProject)
    expect(onToggleProjectExpanded).toHaveBeenCalledWith(baseProject.id)

    onProjectSelect.mockClear()
    onToggleProjectExpanded.mockClear()
    const article = screen.getByRole('article', { name: '项目: 测试项目' })
    const nonInteractiveHeader = article.firstElementChild
    if (!(nonInteractiveHeader instanceof HTMLElement)) {
      throw new Error('project header not found')
    }
    fireEvent.click(nonInteractiveHeader)

    expect(onProjectSelect).not.toHaveBeenCalled()
    expect(onToggleProjectExpanded).not.toHaveBeenCalled()
  })

  test('keeps project header text buttons visibly focusable for keyboard users', () => {
    renderProjectCard()

    expect(screen.getByRole('button', { name: '测试项目' })).toHaveClass('focus-visible:ring-2')
    expect(screen.getByRole('button', { name: '(未填写)' })).toHaveClass('focus-visible:ring-2')
  })

  test('hides the project drag handle from assistive technology when dragging is unavailable', () => {
    const { rerender } = renderProjectCard()

    expect(screen.queryByRole('button', { name: '拖拽排序项目: 测试项目' })).not.toBeInTheDocument()

    rerender(
      <ProjectCard
        project={baseProject}
        sessionsForProject={[baseSession]}
        sessionPagination={buildPagination()}
        childProjects={[]}
        childProjectPagination={buildProjectListPagination()}
        isExpanded={false}
        isActive={false}
        projectMenuOpen={null}
        dragEnabled
        onSetProjectMenuOpen={noop}
        projectCardRef={noop}
        editingProjectNameId={null}
        editingProjectCustomerId={null}
        projectNameDraft=""
        projectCustomerDraft=""
        onSetProjectNameDraft={noop}
        onSetProjectCustomerDraft={noop}
        onSetProjectNameInputRef={noop}
        onSetProjectCustomerInputRef={noop}
        onBeginProjectNameEdit={noop}
        onCancelProjectNameEdit={noop}
        onCommitProjectNameEdit={asyncNoop}
        onBeginProjectCustomerEdit={noop}
        onCancelProjectCustomerEdit={noop}
        onCommitProjectCustomerEdit={asyncNoop}
        onProjectSelect={noop}
        onProjectArchiveToggle={noop}
        onProjectDelete={noop}
        onToggleProjectExpanded={noop}
        onEnsureSessionsLoaded={noop}
        onLoadMoreSessions={noop}
        onEnsureChildProjectsLoaded={noop}
        onLoadMoreChildProjects={noop}
        renderSessionItem={(session) => <div key={session.id}>{session.title}</div>}
      />,
    )

    expect(screen.getByRole('button', { name: '拖拽排序项目: 测试项目' })).toBeInTheDocument()
  })

  test('labels inline project edit inputs with the current project context', () => {
    const { rerender } = render(
      <ProjectCard
        project={baseProject}
        sessionsForProject={[baseSession]}
        sessionPagination={buildPagination()}
        childProjects={[]}
        childProjectPagination={buildProjectListPagination()}
        isExpanded={false}
        isActive={false}
        projectMenuOpen={null}
        onSetProjectMenuOpen={noop}
        projectCardRef={noop}
        editingProjectNameId={baseProject.id}
        editingProjectCustomerId={null}
        projectNameDraft="测试项目"
        projectCustomerDraft=""
        onSetProjectNameDraft={noop}
        onSetProjectCustomerDraft={noop}
        onSetProjectNameInputRef={noop}
        onSetProjectCustomerInputRef={noop}
        onBeginProjectNameEdit={noop}
        onCancelProjectNameEdit={noop}
        onCommitProjectNameEdit={asyncNoop}
        onBeginProjectCustomerEdit={noop}
        onCancelProjectCustomerEdit={noop}
        onCommitProjectCustomerEdit={asyncNoop}
        onProjectSelect={noop}
        onProjectArchiveToggle={noop}
        onProjectDelete={noop}
        onToggleProjectExpanded={noop}
        onEnsureSessionsLoaded={noop}
        onLoadMoreSessions={noop}
        onEnsureChildProjectsLoaded={noop}
        onLoadMoreChildProjects={noop}
        renderSessionItem={(session) => <div key={session.id}>{session.title}</div>}
      />,
    )

    expect(screen.getByRole('textbox', { name: '编辑项目名称 测试项目' })).toHaveValue('测试项目')

    rerender(
      <ProjectCard
        project={baseProject}
        sessionsForProject={[baseSession]}
        sessionPagination={buildPagination()}
        childProjects={[]}
        childProjectPagination={buildProjectListPagination()}
        isExpanded={false}
        isActive={false}
        projectMenuOpen={null}
        onSetProjectMenuOpen={noop}
        projectCardRef={noop}
        editingProjectNameId={null}
        editingProjectCustomerId={baseProject.id}
        projectNameDraft=""
        projectCustomerDraft="客户甲"
        onSetProjectNameDraft={noop}
        onSetProjectCustomerDraft={noop}
        onSetProjectNameInputRef={noop}
        onSetProjectCustomerInputRef={noop}
        onBeginProjectNameEdit={noop}
        onCancelProjectNameEdit={noop}
        onCommitProjectNameEdit={asyncNoop}
        onBeginProjectCustomerEdit={noop}
        onCancelProjectCustomerEdit={noop}
        onCommitProjectCustomerEdit={asyncNoop}
        onProjectSelect={noop}
        onProjectArchiveToggle={noop}
        onProjectDelete={noop}
        onToggleProjectExpanded={noop}
        onEnsureSessionsLoaded={noop}
        onLoadMoreSessions={noop}
        onEnsureChildProjectsLoaded={noop}
        onLoadMoreChildProjects={noop}
        renderSessionItem={(session) => <div key={session.id}>{session.title}</div>}
      />,
    )

    expect(screen.getByRole('textbox', { name: '编辑项目客户 测试项目' })).toHaveValue('客户甲')
  })
})
