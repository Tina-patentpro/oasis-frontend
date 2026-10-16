import type { ComponentProps, CSSProperties } from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Project, Session } from '@/types/api'
import type { ProjectListPagination, ProjectSessionPagination } from '../types'

import { HistoryTabContent, ProjectTabContent } from './tabs'

type HistoryTabProps = ComponentProps<typeof HistoryTabContent>
type ProjectTabProps = ComponentProps<typeof ProjectTabContent>

const createVoidMock = <Args extends unknown[] = []>() => jest.fn<(...args: Args) => void>()
const createAsyncVoidMock = <Args extends unknown[] = []>() =>
  jest.fn<(...args: Args) => Promise<void>>(async () => undefined)

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    userId: 1,
    title: '独立会话',
    toolType: 'chat',
    modelVersion: 'standard',
    status: 'completed',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    userId: 1,
    name: 'Alpha 项目',
    status: 'active',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function createSessionPagination(
  overrides: Partial<ProjectSessionPagination> = {},
): ProjectSessionPagination {
  return {
    initialized: true,
    isLoading: false,
    isInitialLoading: false,
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: false,
    loadedCount: 0,
    total: 0,
    ...overrides,
  }
}

function createProjectListPagination(
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

function makePillStyle(active: boolean): CSSProperties {
  return active ? { color: '#047857' } : { color: '#6b7280' }
}

function createProjectTabProps(overrides: Partial<ProjectTabProps> = {}): ProjectTabProps {
  const projects = [
    createProject({ id: 1, name: 'Alpha 项目', hasChildren: true, childCount: 1 }),
    createProject({ id: 2, name: 'Beta 项目' }),
  ]

  return {
    projectStatusFilter: 'active' as const,
    onProjectStatusFilterChange: createVoidMock<['active' | 'archived']>(),
    dragEnabled: true,
    projects,
    projectListPagination: createProjectListPagination({ loadedCount: 2, total: 2 }),
    projectsBaselineCount: projects.length,
    projectSessions: {
      1: [createSession({ id: 11, projectId: 1, title: 'Alpha 会话' })],
      2: [],
    },
    projectSessionPaginationByProject: {
      1: createSessionPagination({ initialized: true, loadedCount: 1, total: 1 }),
      2: createSessionPagination(),
    },
    childProjectsByParent: {},
    childProjectPaginationByParent: {
      1: createProjectListPagination({ initialized: false, total: 1 }),
    },
    selectedProjectId: null,
    manualExpandedProjects: {},
    getDefaultProjectExpanded: jest.fn<(projectId: number) => boolean>(() => false),
    toggleProjectExpanded: createVoidMock<[number]>(),
    editingProjectNameId: null,
    editingProjectCustomerId: null,
    projectNameDrafts: {},
    projectCustomerDrafts: {},
    setProjectNameDraft: createVoidMock<[number, string]>(),
    setProjectCustomerDraft: createVoidMock<[number, string]>(),
    setProjectNameInputRef: createVoidMock<[number, HTMLInputElement | null]>(),
    setProjectCustomerInputRef: createVoidMock<[number, HTMLInputElement | null]>(),
    beginProjectNameEdit: createVoidMock<[Project]>(),
    cancelProjectNameEdit: createVoidMock<[number]>(),
    commitProjectNameEdit: createAsyncVoidMock<[Project]>(),
    beginProjectCustomerEdit: createVoidMock<[Project]>(),
    cancelProjectCustomerEdit: createVoidMock<[number]>(),
    commitProjectCustomerEdit: createAsyncVoidMock<[Project]>(),
    projectMenuOpen: null,
    setProjectMenuOpen: createVoidMock<[number | null]>(),
    setProjectCardRef: createVoidMock<[number, HTMLDivElement | null]>(),
    onProjectArchiveToggle: createVoidMock<[Project]>(),
    onProjectDelete: createVoidMock<[Project]>(),
    onProjectSelect: createVoidMock<[Project | null]>(),
    onProjectReorder: createVoidMock<[number, number, ('before' | 'after')?]>(),
    onLoadMoreProjects: createVoidMock(),
    onEnsureProjectSessionsLoaded: createVoidMock<[number]>(),
    onLoadMoreProjectSessions: createVoidMock<[number]>(),
    onEnsureChildProjectsLoaded: createVoidMock<[number]>(),
    onLoadMoreChildProjects: createVoidMock<[number]>(),
    renderSessionItem: (session: Session, variant: 'standalone' | 'project') => (
      <div key={`${variant}-${session.id}`}>{`${variant}:${session.title}`}</div>
    ),
    makePillStyle,
    ...overrides,
  }
}

describe('HistoryTabContent', () => {
  test('shows the initial loading state before standalone sessions are ready', () => {
    render(
      <HistoryTabContent
        sessions={[]}
        searchActive={false}
        independentSessionPagination={createSessionPagination({
          initialized: false,
          isLoading: true,
        })}
        hasIndependentSessionBaseline={false}
        onLoadMoreIndependentSessions={createVoidMock()}
        renderSessionItem={(session) => <div key={session.id}>{session.title}</div>}
      />,
    )

    expect(screen.getByText('正在加载会话…')).toBeInTheDocument()
  })

  test('distinguishes search-empty, filtered-empty, and no-independent-session empty states', () => {
    const baseProps: Pick<
      HistoryTabProps,
      | 'sessions'
      | 'independentSessionPagination'
      | 'onLoadMoreIndependentSessions'
      | 'renderSessionItem'
    > = {
      sessions: [],
      independentSessionPagination: createSessionPagination(),
      onLoadMoreIndependentSessions: createVoidMock(),
      renderSessionItem: (session: Session) => <div key={session.id}>{session.title}</div>,
    }

    const { rerender } = render(
      <HistoryTabContent {...baseProps} searchActive hasIndependentSessionBaseline={false} />,
    )
    expect(screen.getByText('未找到匹配的会话')).toBeInTheDocument()
    expect(screen.getByText('可以尝试调整关键字')).toBeInTheDocument()

    rerender(
      <HistoryTabContent {...baseProps} searchActive={false} hasIndependentSessionBaseline />,
    )
    expect(screen.getByText('暂无匹配会话')).toBeInTheDocument()

    rerender(
      <HistoryTabContent
        {...baseProps}
        searchActive={false}
        hasIndependentSessionBaseline={false}
      />,
    )
    expect(screen.getByText('还没有独立会话')).toBeInTheDocument()
    expect(screen.getByText('所有会话均已关联项目')).toBeInTheDocument()
  })

  test('renders standalone sessions and loads more sessions on demand', async () => {
    const user = userEvent.setup()
    const onLoadMoreIndependentSessions = createVoidMock()

    render(
      <HistoryTabContent
        sessions={[createSession({ id: 3, title: '历史会话 A' })]}
        searchActive={false}
        independentSessionPagination={createSessionPagination({
          hasMore: true,
          loadedCount: 1,
          total: 3,
        })}
        hasIndependentSessionBaseline
        onLoadMoreIndependentSessions={onLoadMoreIndependentSessions}
        renderSessionItem={(session, variant) => (
          <button key={session.id} type="button">{`${variant}:${session.title}`}</button>
        )}
      />,
    )

    expect(screen.getByRole('button', { name: 'standalone:历史会话 A' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '加载更多 (1/3)' }))

    expect(onLoadMoreIndependentSessions).toHaveBeenCalledTimes(1)
  })
})

describe('ProjectTabContent', () => {
  test('shows active and archived empty states and emits status filter changes', async () => {
    const user = userEvent.setup()
    const onProjectStatusFilterChange = createVoidMock<['active' | 'archived']>()
    const props = createProjectTabProps({
      projects: [],
      projectStatusFilter: 'active',
      projectsBaselineCount: 0,
      onProjectStatusFilterChange,
      projectListPagination: createProjectListPagination(),
    })

    const { rerender } = render(<ProjectTabContent {...props} />)

    expect(screen.getByText('还没有项目')).toBeInTheDocument()
    expect(screen.getByText('使用"快速创建项目"后即可在此查看与管理')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '已归档' }))
    expect(onProjectStatusFilterChange).toHaveBeenCalledWith('archived')

    rerender(
      <ProjectTabContent
        {...props}
        projectStatusFilter="archived"
        projects={[]}
        projectsBaselineCount={0}
      />,
    )
    expect(screen.getByText('暂无归档项目')).toBeInTheDocument()
  })

  test('shows filtered-empty and disabled-drag hints when the list cannot be reordered', () => {
    const { rerender } = render(
      <ProjectTabContent
        {...createProjectTabProps({
          projects: [],
          projectsBaselineCount: 2,
          projectListPagination: createProjectListPagination(),
        })}
      />,
    )

    expect(screen.getByText('未找到匹配的项目')).toBeInTheDocument()
    expect(screen.getByText('可以尝试调整搜索或筛选条件')).toBeInTheDocument()

    rerender(<ProjectTabContent {...createProjectTabProps({ dragEnabled: false })} />)

    expect(
      screen.getByText('当前仅支持在完整项目列表下拖拽排序。请清空搜索并确保列表已完整加载。'),
    ).toBeInTheDocument()
  })

  test('loads more projects from the project list pagination button', async () => {
    const user = userEvent.setup()
    const onLoadMoreProjects = createVoidMock()

    render(
      <ProjectTabContent
        {...createProjectTabProps({
          onLoadMoreProjects,
          projectListPagination: createProjectListPagination({
            hasMore: true,
            loadedCount: 2,
            total: 5,
          }),
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: '加载更多项目 (2/5)' }))

    expect(onLoadMoreProjects).toHaveBeenCalledTimes(1)
  })

  test('selects and expands a project while ensuring sessions and child projects are loaded', async () => {
    const user = userEvent.setup()
    const onProjectSelect = createVoidMock<[Project | null]>()
    const toggleProjectExpanded = createVoidMock<[number]>()
    const onEnsureProjectSessionsLoaded = createVoidMock<[number]>()
    const onEnsureChildProjectsLoaded = createVoidMock<[number]>()

    render(
      <ProjectTabContent
        {...createProjectTabProps({
          onProjectSelect,
          toggleProjectExpanded,
          onEnsureProjectSessionsLoaded,
          onEnsureChildProjectsLoaded,
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Alpha 项目' }))

    expect(onProjectSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    expect(toggleProjectExpanded).toHaveBeenCalledWith(1)
    expect(onEnsureProjectSessionsLoaded).toHaveBeenCalledWith(1)
    expect(onEnsureChildProjectsLoaded).toHaveBeenCalledWith(1)
  })

  test('reorders projects by dropping the dragged project after a target project', () => {
    const onProjectReorder = createVoidMock<[number, number, ('before' | 'after')?]>()

    render(<ProjectTabContent {...createProjectTabProps({ onProjectReorder })} />)

    const dragHandle = screen.getByRole('button', { name: '拖拽排序项目: Alpha 项目' })
    const dragData = {
      effectAllowed: '',
      dropEffect: '',
      setData: jest.fn(),
      getData: jest.fn(() => '1'),
    }
    fireEvent.dragStart(dragHandle, { dataTransfer: dragData })

    const betaWrapper = screen.getByRole('article', { name: '项目: Beta 项目' }).parentElement
    if (!betaWrapper) {
      throw new Error('Beta wrapper not found')
    }
    Object.defineProperty(betaWrapper, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          top: -20,
          bottom: 0,
          left: 0,
          right: 100,
          width: 100,
          height: 20,
          x: 0,
          y: -20,
          toJSON: () => ({}),
        }) as DOMRect,
    })

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperties(dropEvent, {
      clientY: { value: 0 },
      dataTransfer: {
        value: {
          dropEffect: '',
          getData: jest.fn(() => '1'),
        },
      },
    })
    fireEvent(betaWrapper, dropEvent)

    expect(onProjectReorder).toHaveBeenCalledWith(1, 2, 'after')
  })

  test('uses the whole list drop zone to resolve reorder placement', () => {
    const onProjectReorder = createVoidMock<[number, number, ('before' | 'after')?]>()

    render(<ProjectTabContent {...createProjectTabProps({ onProjectReorder })} />)

    const articles = screen.getAllByRole('article')
    const alphaWrapper = articles[0].parentElement
    const betaWrapper = articles[1].parentElement
    const listWrapper = alphaWrapper?.parentElement
    if (!alphaWrapper || !betaWrapper || !listWrapper) {
      throw new Error('Project wrappers not found')
    }

    Object.defineProperty(alphaWrapper, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          top: 0,
          bottom: 20,
          left: 0,
          right: 100,
          width: 100,
          height: 20,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    })
    Object.defineProperty(betaWrapper, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          top: 20,
          bottom: 40,
          left: 0,
          right: 100,
          width: 100,
          height: 20,
          x: 0,
          y: 20,
          toJSON: () => ({}),
        }) as DOMRect,
    })

    fireEvent.dragStart(screen.getByRole('button', { name: '拖拽排序项目: Alpha 项目' }), {
      dataTransfer: {
        effectAllowed: '',
        dropEffect: '',
        setData: jest.fn(),
        getData: jest.fn(() => '1'),
      },
    })

    const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true })
    Object.defineProperties(dragOverEvent, {
      clientY: { value: 35 },
      dataTransfer: {
        value: {
          dropEffect: '',
          getData: jest.fn(() => '1'),
        },
      },
    })
    fireEvent(listWrapper, dragOverEvent)

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperties(dropEvent, {
      clientY: { value: 35 },
      dataTransfer: {
        value: {
          dropEffect: '',
          getData: jest.fn(() => '1'),
        },
      },
    })
    fireEvent(listWrapper, dropEvent)

    expect(onProjectReorder).toHaveBeenCalledWith(1, 2, 'after')
  })

  test('does not reorder projects when drag sorting is disabled', () => {
    const onProjectReorder = createVoidMock<[number, number, ('before' | 'after')?]>()

    render(
      <ProjectTabContent
        {...createProjectTabProps({
          dragEnabled: false,
          onProjectReorder,
        })}
      />,
    )

    const betaWrapper = screen.getByRole('article', { name: '项目: Beta 项目' }).parentElement
    if (!betaWrapper) {
      throw new Error('Beta wrapper not found')
    }

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        dropEffect: '',
        getData: jest.fn(() => '1'),
      },
    })
    fireEvent(betaWrapper, dropEvent)

    expect(onProjectReorder).not.toHaveBeenCalled()
  })

  test('passes project id with inline name and customer editing callbacks', () => {
    const setProjectNameDraft = createVoidMock<[number, string]>()
    const setProjectCustomerDraft = createVoidMock<[number, string]>()
    const setProjectNameInputRef = createVoidMock<[number, HTMLInputElement | null]>()
    const setProjectCustomerInputRef = createVoidMock<[number, HTMLInputElement | null]>()

    render(
      <ProjectTabContent
        {...createProjectTabProps({
          editingProjectNameId: 1,
          editingProjectCustomerId: 1,
          projectNameDrafts: { 1: 'Alpha 草稿' },
          projectCustomerDrafts: { 1: '客户草稿' },
          setProjectNameDraft,
          setProjectCustomerDraft,
          setProjectNameInputRef,
          setProjectCustomerInputRef,
        })}
      />,
    )

    fireEvent.change(screen.getByLabelText('编辑项目名称 Alpha 项目'), {
      target: { value: 'Alpha 新名称' },
    })
    fireEvent.change(screen.getByLabelText('编辑项目客户 Alpha 项目'), {
      target: { value: '客户 A' },
    })

    expect(setProjectNameDraft).toHaveBeenCalledWith(1, 'Alpha 新名称')
    expect(setProjectCustomerDraft).toHaveBeenCalledWith(1, '客户 A')
    expect(setProjectNameInputRef).toHaveBeenCalledWith(1, expect.any(HTMLInputElement))
    expect(setProjectCustomerInputRef).toHaveBeenCalledWith(1, expect.any(HTMLInputElement))
  })
})
