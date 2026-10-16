import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import type { Project } from '@/types/api'

import { useChildProjectLoading } from './use-child-project-loading'

type UseChildProjectLoadingParams = Parameters<typeof useChildProjectLoading>[0]
type GetProjects = UseChildProjectLoadingParams['projectApi']['getProjects']
type TestParams = Omit<UseChildProjectLoadingParams, 'projectApi'> & {
  projectApi: {
    getProjects: jest.MockedFunction<GetProjects>
  }
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    userId: 1,
    name: 'Project',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createResponse(items: Project[], page: number, totalPages = page) {
  return {
    items,
    pagination: {
      page,
      pageSize: 15,
      total: items.length,
      totalPages,
    },
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

function createParams(overrides: Partial<TestParams> = {}): TestParams {
  return {
    pageSize: 15,
    projectApi: {
      getProjects: jest.fn<GetProjects>(),
    },
    projectList: [createProject({ id: 1 })],
    projectSearchKeyword: '',
    projectStatusFilter: 'active' as const,
    ...overrides,
  }
}

describe('useChildProjectLoading', () => {
  test('loads the first child project page and exposes pagination view', async () => {
    const child = createProject({ id: 11, parentId: 1 })
    const params = createParams()
    params.projectApi.getProjects.mockResolvedValue(createResponse([child], 1, 2))
    const { result } = renderHook(() => useChildProjectLoading(params))

    await act(async () => {
      await result.current.ensureChildProjectsLoaded(1)
    })

    expect(params.projectApi.getProjects).toHaveBeenCalledWith({
      parentId: 1,
      page: 1,
      pageSize: 15,
      status: 'active',
    })
    expect(result.current.childProjectsByParent).toEqual({ 1: [child] })
    expect(result.current.childProjectPaginationByParent[1]).toEqual(
      expect.objectContaining({
        initialized: true,
        hasMore: true,
        loadedCount: 1,
        total: 1,
      }),
    )
  })

  test('queues only the latest child page request while a parent is already loading', async () => {
    const first = createDeferred<ReturnType<typeof createResponse>>()
    const params = createParams()
    params.projectApi.getProjects
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(createResponse([createProject({ id: 13, parentId: 1 })], 3, 3))

    const { result } = renderHook(() => useChildProjectLoading(params))

    act(() => {
      void result.current.loadChildProjectsPage(1, 1, false)
    })
    act(() => {
      void result.current.loadChildProjectsPage(1, 2, true)
      void result.current.loadChildProjectsPage(1, 3, true)
    })

    expect(params.projectApi.getProjects).toHaveBeenCalledTimes(1)

    await act(async () => {
      first.resolve(createResponse([createProject({ id: 11, parentId: 1 })], 1, 3))
      await first.promise
    })

    await waitFor(() => {
      expect(params.projectApi.getProjects).toHaveBeenCalledTimes(2)
    })
    expect(params.projectApi.getProjects).toHaveBeenLastCalledWith({
      parentId: 1,
      page: 3,
      pageSize: 15,
      status: 'active',
    })
  })

  test('does not run queued child project requests after unmount', async () => {
    const first = createDeferred<ReturnType<typeof createResponse>>()
    const params = createParams()
    params.projectApi.getProjects.mockReturnValueOnce(first.promise)

    const { result, unmount } = renderHook(() => useChildProjectLoading(params))

    act(() => {
      void result.current.loadChildProjectsPage(1, 1, false)
    })
    act(() => {
      void result.current.loadChildProjectsPage(1, 2, true)
    })

    unmount()

    await act(async () => {
      first.resolve(createResponse([createProject({ id: 11, parentId: 1 })], 1, 2))
      await first.promise
    })

    expect(params.projectApi.getProjects).toHaveBeenCalledTimes(1)
  })

  test('loads more child projects when pagination has another page', async () => {
    const first = createProject({ id: 11, parentId: 1 })
    const second = createProject({ id: 12, parentId: 1 })
    const params = createParams()
    params.projectApi.getProjects
      .mockResolvedValueOnce(createResponse([first], 1, 2))
      .mockResolvedValueOnce(createResponse([second], 2, 2))
    const { result } = renderHook(() => useChildProjectLoading(params))

    await act(async () => {
      await result.current.ensureChildProjectsLoaded(1)
    })
    await waitFor(() => {
      expect(result.current.childProjectPaginationByParent[1]).toEqual(
        expect.objectContaining({ hasMore: true }),
      )
    })

    await act(async () => {
      await result.current.loadMoreChildProjects(1)
    })

    expect(result.current.childProjectsByParent[1]).toEqual([first, second])
    expect(params.projectApi.getProjects).toHaveBeenLastCalledWith({
      parentId: 1,
      page: 2,
      pageSize: 15,
      status: 'active',
    })
  })

  test('resets child project state when project search or status filter changes', async () => {
    const params = createParams()
    params.projectApi.getProjects.mockResolvedValue(
      createResponse([createProject({ id: 11, parentId: 1 })], 1, 1),
    )
    const { result, rerender } = renderHook(
      (currentParams) => useChildProjectLoading(currentParams),
      { initialProps: params },
    )

    await act(async () => {
      await result.current.ensureChildProjectsLoaded(1)
    })
    expect(result.current.childProjectsByParent[1]).toHaveLength(1)

    rerender({
      ...params,
      projectSearchKeyword: '客户',
    })

    expect(result.current.childProjectsByParent).toEqual({})
    expect(result.current.childProjectPaginationByParent[1]).toEqual(
      expect.objectContaining({
        initialized: false,
        loadedCount: 0,
        total: 0,
      }),
    )
  })

  test('ignores stale child project response after project search changes', async () => {
    const first = createDeferred<ReturnType<typeof createResponse>>()
    const params = createParams()
    params.projectApi.getProjects.mockReturnValueOnce(first.promise)
    const { result, rerender } = renderHook(
      (currentParams) => useChildProjectLoading(currentParams),
      { initialProps: params },
    )

    act(() => {
      void result.current.loadChildProjectsPage(1, 1, false)
    })

    rerender({
      ...params,
      projectSearchKeyword: '新搜索',
    })

    await act(async () => {
      first.resolve(createResponse([createProject({ id: 11, parentId: 1 })], 1, 1))
      await first.promise
    })

    expect(result.current.childProjectsByParent).toEqual({})
    expect(result.current.childProjectPaginationByParent[1]).toEqual(
      expect.objectContaining({
        initialized: false,
        loadedCount: 0,
        total: 0,
      }),
    )
  })

  test('prunes child projects when parent projects leave the visible project list', async () => {
    const parent = createProject({ id: 1 })
    const child = createProject({ id: 11, parentId: 1 })
    const params = createParams({ projectList: [parent] })
    params.projectApi.getProjects.mockResolvedValue(createResponse([child], 1, 1))
    const { result, rerender } = renderHook(
      (currentParams) => useChildProjectLoading(currentParams),
      { initialProps: params },
    )

    await act(async () => {
      await result.current.ensureChildProjectsLoaded(1)
    })

    rerender({
      ...params,
      projectList: [],
    })

    expect(result.current.childProjectsByParent).toEqual({})
    expect(result.current.childProjectPaginationByParent).toEqual({})
  })
})
