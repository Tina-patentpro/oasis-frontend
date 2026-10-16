import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { Project } from '@/types/api'

import type { ProjectSessionPaginationView } from './session-list-view'
import type { ProjectSessionPageState } from './session-loading'
import { useWorkspaceLaneLifecycle } from './use-workspace-lane-lifecycle'

const SECONDARY_DELAY_MS = 600
type LoadProjectSessionsPage = Parameters<
  typeof useWorkspaceLaneLifecycle
>[0]['loadProjectSessionsPage']

function createProject(id: number, status: Project['status'] = 'active'): Project {
  return {
    id,
    name: `Project ${id}`,
    status,
  } as Project
}

function createProjectSessionState(
  overrides: Partial<ProjectSessionPageState> = {},
): ProjectSessionPageState {
  return {
    page: 0,
    total: 0,
    totalPages: 0,
    isLoading: false,
    initialized: false,
    loadingMode: null,
    ...overrides,
  }
}

function createIndependentPagination(
  overrides: Partial<ProjectSessionPaginationView> = {},
): ProjectSessionPaginationView {
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

function createParams(overrides: Partial<Parameters<typeof useWorkspaceLaneLifecycle>[0]> = {}) {
  return {
    availableTabs: [{ id: 'writing', label: 'Writing', tools: [{ name: 'chat' }] }],
    independentSessionPagination: createIndependentPagination(),
    isProjectsLoading: false,
    loadIndependentSessionsPage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    loadProjectSessionsPage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    managementTab: 'history' as const,
    markWorkspacePerf: jest.fn(),
    projectList: [createProject(1), createProject(2), createProject(3, 'archived')],
    projectSessionPageState: {
      1: createProjectSessionState(),
      2: createProjectSessionState({ initialized: true }),
    },
    secondaryLaneDelayMs: SECONDARY_DELAY_MS,
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

describe('useWorkspaceLaneLifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('preloads missing active project sessions on the history secondary lane after primary history is ready', async () => {
    const params = createParams()

    renderHook(() => useWorkspaceLaneLifecycle(params))

    expect(params.loadProjectSessionsPage).not.toHaveBeenCalled()

    await act(async () => {
      jest.advanceTimersByTime(SECONDARY_DELAY_MS)
      await Promise.resolve()
    })

    expect(params.loadProjectSessionsPage).toHaveBeenCalledTimes(1)
    expect(params.loadProjectSessionsPage).toHaveBeenCalledWith(1, 1, false)
    expect(params.markWorkspacePerf).toHaveBeenCalledWith('history_ready')
    expect(params.markWorkspacePerf).toHaveBeenCalledWith('secondary_lane_start')
  })

  test('preloads active project sessions immediately on the project primary lane after projects load', async () => {
    const params = createParams({
      managementTab: 'project',
    })

    renderHook(() => useWorkspaceLaneLifecycle(params))

    await act(async () => {
      await Promise.resolve()
    })

    expect(params.loadProjectSessionsPage).toHaveBeenCalledWith(1, 1, false)
    expect(params.markWorkspacePerf).toHaveBeenCalledWith('project_ready')
    expect(params.markWorkspacePerf).toHaveBeenCalledWith('primary_lane_start')
  })

  test('loads independent sessions on the project secondary lane when history is not ready', async () => {
    const params = createParams({
      independentSessionPagination: createIndependentPagination({
        initialized: false,
        isLoading: false,
      }),
      managementTab: 'project',
    })

    renderHook(() => useWorkspaceLaneLifecycle(params))

    await act(async () => {
      jest.advanceTimersByTime(SECONDARY_DELAY_MS)
      await Promise.resolve()
    })

    expect(params.loadIndependentSessionsPage).toHaveBeenCalledWith(1, false)
    expect(params.markWorkspacePerf).toHaveBeenCalledWith('secondary_lane_start')
  })

  test('ignores stale secondary timers after switching workspace management tabs', async () => {
    const params = createParams()
    const { rerender } = renderHook((currentParams) => useWorkspaceLaneLifecycle(currentParams), {
      initialProps: params,
    })

    rerender({
      ...params,
      managementTab: 'project',
    })

    await act(async () => {
      jest.advanceTimersByTime(SECONDARY_DELAY_MS)
      await Promise.resolve()
    })

    expect(params.loadProjectSessionsPage).toHaveBeenCalledTimes(1)
    expect(params.loadProjectSessionsPage).toHaveBeenCalledWith(1, 1, false)
  })

  test('stops queued project preloads after the sidebar lifecycle unmounts', async () => {
    const firstLoad = createDeferred<void>()
    const loadProjectSessionsPage = jest
      .fn<LoadProjectSessionsPage>()
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValue(undefined)
    const params = createParams({
      managementTab: 'project',
      projectList: [createProject(1), createProject(2)],
      projectSessionPageState: {
        1: createProjectSessionState(),
        2: createProjectSessionState(),
      },
      loadProjectSessionsPage,
    })

    const { unmount } = renderHook(() => useWorkspaceLaneLifecycle(params))

    expect(loadProjectSessionsPage).toHaveBeenCalledTimes(1)
    expect(loadProjectSessionsPage).toHaveBeenCalledWith(1, 1, false)

    unmount()

    await act(async () => {
      firstLoad.resolve()
      await firstLoad.promise
      await Promise.resolve()
    })

    expect(loadProjectSessionsPage).toHaveBeenCalledTimes(1)
  })
})
