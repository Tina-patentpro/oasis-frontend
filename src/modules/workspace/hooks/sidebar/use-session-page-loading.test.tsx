import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'
import { StrictMode, type ReactNode } from 'react'

import type { PaginatedResponse, Session } from '@/types/api'

import { useSessionPageLoading } from './use-session-page-loading'

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    userId: 1,
    title: 'Session',
    toolType: 'draft',
    modelVersion: '1.0',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createResponse(
  items: Session[],
  page: number,
  totalPages = page,
): PaginatedResponse<Session> {
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

type UseSessionPageLoadingParams = Parameters<typeof useSessionPageLoading>[0]
type GetSessions = UseSessionPageLoadingParams['sessionApi']['getSessions']
type TestParams = Omit<
  UseSessionPageLoadingParams,
  'sessionApi' | 'setProjectSessionCountOverrides'
> & {
  sessionApi: {
    getSessions: jest.MockedFunction<GetSessions>
  }
  setProjectSessionCountOverrides: jest.Mock
}

function createParams(overrides: Partial<TestParams> = {}): TestParams {
  return {
    historyPageSize: 15,
    historySearchKeyword: '',
    projectSessionPageSize: 15,
    sessionApi: {
      getSessions: jest.fn<GetSessions>(),
    },
    setProjectSessionCountOverrides: jest.fn(),
    ...overrides,
  }
}

describe('useSessionPageLoading', () => {
  test('loads independent sessions with search and filters leaked project sessions', async () => {
    const standalone = createSession({ id: 1 })
    const leakedProjectSession = createSession({ id: 2, projectId: 9 })
    const params = createParams({ historySearchKeyword: '关键字' })
    params.sessionApi.getSessions.mockResolvedValue(
      createResponse([standalone, leakedProjectSession], 1, 1),
    )

    const { result } = renderHook(() => useSessionPageLoading(params))

    await act(async () => {
      await result.current.loadIndependentSessionsPage(1, false)
    })

    expect(params.sessionApi.getSessions).toHaveBeenCalledWith({
      type: 'independent',
      page: 1,
      pageSize: 15,
      search: '关键字',
      cacheMode: 'bypass',
    })
    expect(result.current.independentSessions).toEqual([standalone])
    expect(result.current.independentSessionsSnapshotRef.current).toEqual([standalone])
    expect(result.current.independentSessionPageState).toEqual(
      expect.objectContaining({
        initialized: true,
        page: 1,
        totalPages: 1,
      }),
    )
  })

  test('queues only the latest independent session request while loading', async () => {
    const first = createDeferred<PaginatedResponse<Session>>()
    const params = createParams()
    params.sessionApi.getSessions
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(createResponse([createSession({ id: 3 })], 3, 3))

    const { result } = renderHook(() => useSessionPageLoading(params))

    act(() => {
      void result.current.loadIndependentSessionsPage(1, false)
    })
    act(() => {
      void result.current.loadIndependentSessionsPage(2, true)
      void result.current.loadIndependentSessionsPage(3, true)
    })

    expect(params.sessionApi.getSessions).toHaveBeenCalledTimes(1)

    await act(async () => {
      first.resolve(createResponse([createSession({ id: 1 })], 1, 3))
      await first.promise
    })

    await waitFor(() => {
      expect(params.sessionApi.getSessions).toHaveBeenCalledTimes(2)
    })
    expect(params.sessionApi.getSessions).toHaveBeenLastCalledWith({
      type: 'independent',
      page: 3,
      pageSize: 15,
      search: undefined,
      cacheMode: undefined,
    })
    await waitFor(() => {
      expect(result.current.independentSessions).toEqual([createSession({ id: 3 })])
    })
    expect(result.current.independentSessionsSnapshotRef.current).toEqual([
      createSession({ id: 3 }),
    ])
  })

  test('does not run queued independent session requests after unmount', async () => {
    const first = createDeferred<PaginatedResponse<Session>>()
    const params = createParams()
    params.sessionApi.getSessions.mockReturnValueOnce(first.promise)

    const { result, unmount } = renderHook(() => useSessionPageLoading(params))

    act(() => {
      void result.current.loadIndependentSessionsPage(1, false)
    })
    act(() => {
      void result.current.loadIndependentSessionsPage(2, true)
    })

    unmount()

    await act(async () => {
      first.resolve(createResponse([createSession({ id: 1 })], 1, 2))
      await first.promise
    })

    expect(params.sessionApi.getSessions).toHaveBeenCalledTimes(1)
  })

  test('keeps independent session loading active after StrictMode remount check', async () => {
    const standalone = createSession({ id: 4 })
    const params = createParams()
    params.sessionApi.getSessions.mockResolvedValue(createResponse([standalone], 1, 1))
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>

    const { result } = renderHook(() => useSessionPageLoading(params), { wrapper })

    await act(async () => {
      await result.current.loadIndependentSessionsPage(1, false)
    })

    expect(params.sessionApi.getSessions).toHaveBeenCalledWith({
      type: 'independent',
      page: 1,
      pageSize: 15,
      search: undefined,
      cacheMode: 'bypass',
    })
    expect(result.current.independentSessions).toEqual([standalone])
    expect(result.current.independentSessionPageState).toEqual(
      expect.objectContaining({
        initialized: true,
        page: 1,
      }),
    )
  })

  test('loads project sessions, filters leaked sessions, and updates count overrides', async () => {
    const projectSession = createSession({ id: 11, projectId: 7 })
    const leakedSession = createSession({ id: 12, projectId: 8 })
    const params = createParams()
    params.sessionApi.getSessions.mockResolvedValue(
      createResponse([projectSession, leakedSession], 1, 1),
    )
    params.setProjectSessionCountOverrides.mockImplementation((updater: unknown) => {
      if (typeof updater === 'function') {
        return (updater as (prev: Record<number, number>) => Record<number, number>)({})
      }
      return updater
    })

    const { result } = renderHook(() => useSessionPageLoading(params))

    await act(async () => {
      await result.current.loadProjectSessionsPage(7, 1, false)
    })

    expect(params.sessionApi.getSessions).toHaveBeenCalledWith({
      projectId: 7,
      page: 1,
      pageSize: 15,
      cacheMode: 'bypass',
    })
    expect(result.current.projectSessionsByProject).toEqual({ 7: [projectSession] })
    expect(result.current.projectSessionsSnapshotRef.current).toEqual({ 7: [projectSession] })
    expect(params.setProjectSessionCountOverrides).toHaveBeenCalled()
  })

  test('ensures and loads more project sessions only when pagination allows it', async () => {
    const first = createSession({ id: 21, projectId: 5 })
    const second = createSession({ id: 22, projectId: 5 })
    const params = createParams()
    params.sessionApi.getSessions
      .mockResolvedValueOnce(createResponse([first], 1, 2))
      .mockResolvedValueOnce(createResponse([second], 2, 2))

    const { result } = renderHook(() => useSessionPageLoading(params))

    await act(async () => {
      await result.current.ensureProjectSessionsLoaded(5)
    })
    await waitFor(() => {
      expect(result.current.projectSessionPageState[5]).toEqual(
        expect.objectContaining({ page: 1, totalPages: 2 }),
      )
    })

    await act(async () => {
      await result.current.loadMoreProjectSessions(5)
    })

    expect(result.current.projectSessionsByProject[5]).toEqual([first, second])
    expect(params.sessionApi.getSessions).toHaveBeenLastCalledWith({
      projectId: 5,
      page: 2,
      pageSize: 15,
      cacheMode: undefined,
    })
  })

  test('loads more independent sessions when pagination has another page', async () => {
    const first = createSession({ id: 31 })
    const second = createSession({ id: 32 })
    const params = createParams()
    params.sessionApi.getSessions
      .mockResolvedValueOnce(createResponse([first], 1, 2))
      .mockResolvedValueOnce(createResponse([second], 2, 2))

    const { result } = renderHook(() => useSessionPageLoading(params))

    await act(async () => {
      await result.current.loadIndependentSessionsPage(1, false)
    })
    await waitFor(() => {
      expect(result.current.independentSessionPageState).toEqual(
        expect.objectContaining({ page: 1, totalPages: 2 }),
      )
    })

    await act(async () => {
      await result.current.loadMoreIndependentSessions()
    })

    expect(result.current.independentSessions).toEqual([first, second])
    expect(params.sessionApi.getSessions).toHaveBeenLastCalledWith({
      type: 'independent',
      page: 2,
      pageSize: 15,
      search: undefined,
      cacheMode: undefined,
    })
  })
})
