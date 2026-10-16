import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { PaginatedResponse, Project } from '@/types/api'

const mockGetProjects = jest.fn<(params: unknown) => Promise<PaginatedResponse<Project>>>()
const mockCreateProject = jest.fn<(params: unknown) => Promise<Project>>()
const mockQuickCreateProject = jest.fn<(params: unknown) => Promise<Project>>()
const mockUpdateProject = jest.fn<(id: number, params: unknown) => Promise<Project>>()
const mockDeleteProject = jest.fn<(id: number) => Promise<void>>()
const mockArchiveProject = jest.fn<(id: number) => Promise<Project>>()
const mockUnarchiveProject = jest.fn<(id: number) => Promise<Project>>()

jest.mock('@/api', () => ({
  ApiError: class ApiError extends Error {},
}))

jest.mock('@/api/services', () => ({
  projectService: {
    getProjects: mockGetProjects,
    createProject: mockCreateProject,
    quickCreateProject: mockQuickCreateProject,
    updateProject: mockUpdateProject,
    deleteProject: mockDeleteProject,
    archiveProject: mockArchiveProject,
    unarchiveProject: mockUnarchiveProject,
  },
}))

import { useProjects } from './useProjects'

function createProject(overrides?: Partial<Project>): Project {
  return {
    id: 1,
    name: '项目A',
    description: '',
    customerName: undefined,
    status: 'active',
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  } as Project
}

function createPage(items: Project[], page = 1, totalPages = 1): PaginatedResponse<Project> {
  return {
    items,
    pagination: {
      page,
      pageSize: 2,
      total: items.length,
      totalPages,
    },
  }
}

describe('useProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetProjects.mockResolvedValue(createPage([createProject()]))
    mockCreateProject.mockResolvedValue(createProject({ id: 10, name: '新项目' }))
    mockQuickCreateProject.mockResolvedValue(createProject({ id: 11, name: '快速项目' }))
    mockUpdateProject.mockResolvedValue(createProject())
    mockDeleteProject.mockResolvedValue(undefined)
    mockArchiveProject.mockResolvedValue(createProject({ status: 'archived' }))
    mockUnarchiveProject.mockResolvedValue(createProject({ status: 'active' }))
  })

  test('uses default options and keeps explicit customerName before metadata', async () => {
    mockGetProjects.mockResolvedValueOnce(
      createPage([
        createProject({
          customerName: '显式客户',
          metadata: {
            customerName: '元数据客户',
          },
        }),
      ]),
    )

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(1)
    })

    expect(mockGetProjects).toHaveBeenCalledWith({
      status: undefined,
      parentId: undefined,
      page: 1,
      pageSize: 15,
      sortBy: undefined,
      sortOrder: undefined,
      search: undefined,
    })
    expect(result.current.projects[0]?.customerName).toBe('显式客户')
  })

  test('loads projects with filters and normalizes customerName from metadata', async () => {
    mockGetProjects.mockResolvedValue(
      createPage([
        createProject({
          metadata: {
            customerName: '元数据客户',
          },
        }),
      ]),
    )

    const { result } = renderHook(() =>
      useProjects({
        status: 'active',
        parentId: 0,
        search: 'demo',
        sortBy: 'name',
        sortOrder: 'asc',
        pageSize: 10,
      }),
    )

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(1)
    })

    expect(mockGetProjects).toHaveBeenCalledWith({
      status: 'active',
      parentId: 0,
      page: 1,
      pageSize: 10,
      sortBy: 'name',
      sortOrder: 'asc',
      search: 'demo',
    })
    expect(result.current.projects[0]?.customerName).toBe('元数据客户')
    expect(result.current.pagination).toMatchObject({
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })
  })

  test('loads the next page when more pages are available', async () => {
    mockGetProjects
      .mockResolvedValueOnce(createPage([createProject({ id: 1, name: '第一页' })], 1, 2))
      .mockResolvedValueOnce(createPage([createProject({ id: 2, name: '第二页' })], 2, 2))

    const { result } = renderHook(() => useProjects({ pageSize: 2 }))

    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('第一页')
    })

    await act(async () => {
      await result.current.nextPage()
    })

    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('第二页')
    })
    expect(mockGetProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 2,
      }),
    )
  })

  test('refreshes the current page after creating a project', async () => {
    const initialProject = createProject({ id: 1, name: '原项目' })
    const refreshedProject = createProject({ id: 2, name: '刷新后项目' })
    mockGetProjects
      .mockResolvedValueOnce(createPage([initialProject], 1, 1))
      .mockResolvedValueOnce(createPage([refreshedProject], 1, 1))

    const { result } = renderHook(() => useProjects({ pageSize: 2 }))

    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('原项目')
    })

    await act(async () => {
      await result.current.createProject({
        name: '新项目',
        customerName: '客户',
      })
    })

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: '新项目',
      customerName: '客户',
    })
    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('刷新后项目')
    })
  })

  test('refreshes the current page when filters change on the first page', async () => {
    mockGetProjects
      .mockResolvedValueOnce(createPage([createProject({ id: 1, name: '旧搜索结果' })], 1, 1))
      .mockResolvedValueOnce(createPage([createProject({ id: 2, name: '新搜索结果' })], 1, 1))

    const { result, rerender } = renderHook(
      ({ search }) =>
        useProjects({
          status: 'active',
          search,
          pageSize: 2,
        }),
      {
        initialProps: {
          search: 'old',
        },
      },
    )

    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('旧搜索结果')
    })

    rerender({
      search: 'new',
    })

    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('新搜索结果')
    })
    expect(mockGetProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'active',
        search: 'new',
        page: 1,
        pageSize: 2,
      }),
    )
  })

  test('resets to the first page when filters change from a later page', async () => {
    mockGetProjects
      .mockResolvedValueOnce(createPage([createProject({ id: 1, name: '第一页' })], 1, 2))
      .mockResolvedValueOnce(createPage([createProject({ id: 2, name: '第二页' })], 2, 2))
      .mockResolvedValueOnce(createPage([createProject({ id: 3, name: '筛选后第一页' })], 1, 1))

    const { result, rerender } = renderHook(
      ({ search }) =>
        useProjects({
          search,
          pageSize: 2,
        }),
      {
        initialProps: {
          search: 'old',
        },
      },
    )

    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('第一页')
    })

    await act(async () => {
      await result.current.nextPage()
    })

    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('第二页')
    })
    expect(result.current.pagination.page).toBe(2)

    rerender({
      search: 'new',
    })

    await waitFor(() => {
      expect(result.current.pagination.page).toBe(1)
      expect(result.current.projects[0]?.name).toBe('筛选后第一页')
    })
    expect(mockGetProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'new',
        page: 1,
        pageSize: 2,
      }),
    )
  })

  test('refreshes after quick create and direct project mutations', async () => {
    mockGetProjects
      .mockResolvedValueOnce(createPage([createProject({ id: 1, name: '初始项目' })], 1, 1))
      .mockResolvedValueOnce(createPage([createProject({ id: 2, name: '快速创建后' })], 1, 1))
      .mockResolvedValueOnce(createPage([createProject({ id: 3, name: '修改后' })], 1, 1))
      .mockResolvedValueOnce(createPage([createProject({ id: 4, name: '删除后' })], 1, 1))
      .mockResolvedValueOnce(createPage([createProject({ id: 5, name: '归档后' })], 1, 1))
      .mockResolvedValueOnce(createPage([createProject({ id: 6, name: '取消归档后' })], 1, 1))

    const { result } = renderHook(() => useProjects({ pageSize: 2 }))

    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('初始项目')
    })

    await act(async () => {
      await result.current.quickCreateProject({
        name: '快速项目',
        customerName: '客户A',
      })
    })
    expect(mockQuickCreateProject).toHaveBeenCalledWith({
      name: '快速项目',
      customerName: '客户A',
    })
    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('快速创建后')
    })

    await act(async () => {
      await result.current.updateProject(2, {
        name: '修改项目',
      })
    })
    expect(mockUpdateProject).toHaveBeenCalledWith(2, {
      name: '修改项目',
    })
    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('修改后')
    })

    await act(async () => {
      await result.current.deleteProject(3)
    })
    expect(mockDeleteProject).toHaveBeenCalledWith(3)
    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('删除后')
    })

    await act(async () => {
      await result.current.archiveProject(4)
    })
    expect(mockArchiveProject).toHaveBeenCalledWith(4)
    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('归档后')
    })

    await act(async () => {
      await result.current.unarchiveProject(5)
    })
    expect(mockUnarchiveProject).toHaveBeenCalledWith(5)
    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('取消归档后')
    })
  })

  test('surfaces create errors without refreshing the list', async () => {
    mockGetProjects.mockResolvedValueOnce(
      createPage([createProject({ id: 1, name: '原项目' })], 1, 1),
    )
    mockCreateProject.mockRejectedValueOnce('创建失败')

    const { result } = renderHook(() => useProjects({ pageSize: 2 }))

    await waitFor(() => {
      expect(result.current.projects[0]?.name).toBe('原项目')
    })

    const listCallsBeforeCreate = mockGetProjects.mock.calls.length
    let createResult: Project | null | undefined

    await act(async () => {
      createResult = await result.current.createProject({
        name: '失败项目',
      })
    })

    expect(createResult).toBeNull()
    await waitFor(() => {
      expect(result.current.error?.message).toBe('创建失败')
    })
    expect(mockGetProjects).toHaveBeenCalledTimes(listCallsBeforeCreate)
  })
})
