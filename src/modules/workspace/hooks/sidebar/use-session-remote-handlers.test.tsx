import { act, renderHook } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import type { Project, Session } from '@/types/api'

import type { ProjectSessionPageState } from './session-loading'
import { useSessionRemoteHandlers } from './use-session-remote-handlers'

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

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 2,
    userId: 1,
    name: 'Project',
    status: 'active',
    sessionCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createProjectPageState(
  overrides: Partial<ProjectSessionPageState> = {},
): ProjectSessionPageState {
  return {
    page: 1,
    total: 0,
    totalPages: 0,
    isLoading: false,
    initialized: true,
    loadingMode: null,
    ...overrides,
  }
}

function createParams(overrides: Partial<Parameters<typeof useSessionRemoteHandlers>[0]> = {}) {
  const session = createSession()
  const project = createProject()

  return {
    activeProjectCache: [] as Project[],
    independentSessionPageState: {
      page: 1,
      total: 1,
      totalPages: 1,
      isLoading: false,
      initialized: true,
    },
    independentSessions: [session],
    independentSessionsSnapshotRef: { current: [session] },
    legacyProjectLinkedSessions: [] as Session[],
    loadIndependentSessionsPage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    loadProjectSessionsPage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    projectList: [project],
    projectSessionCountOverrides: {} as Record<number, number>,
    projectSessionPageSize: 15,
    projectSessionPageState: {
      2: createProjectPageState(),
    },
    projectSessionsByProject: {
      2: [],
    } as Record<number, Session[]>,
    projectSessionsSnapshotRef: { current: { 2: [] } as Record<number, Session[]> },
    refreshSessions: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    remoteApi: {
      associateProject: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      deleteSession: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      dissociateProject: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      renameSession: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    },
    setIndependentSessionPageState: jest.fn(),
    setIndependentSessions: jest.fn(),
    setLegacyProjectLinkedSessions: jest.fn(),
    setProjectSessionCountOverrides: jest.fn(),
    setProjectSessionPageState: jest.fn(),
    setProjectSessionsByProject: jest.fn(),
    ...overrides,
  }
}

describe('useSessionRemoteHandlers', () => {
  test('renames and deletes sessions through the remote api before refreshing sessions', async () => {
    const params = createParams()
    const { result } = renderHook(() => useSessionRemoteHandlers(params))

    await act(async () => {
      await result.current.handleRenameSessionRemote(7, 'Updated title')
      await result.current.handleDeleteSessionRemote(7)
    })

    expect(params.remoteApi.renameSession).toHaveBeenCalledWith(7, { title: 'Updated title' })
    expect(params.remoteApi.deleteSession).toHaveBeenCalledWith(7)
    expect(params.refreshSessions).toHaveBeenCalledTimes(2)
  })

  test('does not refresh sessions when rename or delete fails remotely', async () => {
    const params = createParams()
    jest.mocked(params.remoteApi.renameSession).mockRejectedValueOnce(new Error('rename failed'))
    jest.mocked(params.remoteApi.deleteSession).mockRejectedValueOnce(new Error('delete failed'))
    const { result } = renderHook(() => useSessionRemoteHandlers(params))

    await expect(result.current.handleRenameSessionRemote(7, 'Updated title')).rejects.toThrow(
      'rename failed',
    )
    await expect(result.current.handleDeleteSessionRemote(7)).rejects.toThrow('delete failed')

    expect(params.refreshSessions).not.toHaveBeenCalled()
  })

  test('associates an independent session with a project and refreshes affected lists', async () => {
    const session = createSession({ id: 11 })
    const params = createParams({
      independentSessions: [session],
      independentSessionsSnapshotRef: { current: [session] },
    })
    const { result } = renderHook(() => useSessionRemoteHandlers(params))

    await act(async () => {
      await result.current.handleAssociateProjectRemote(session, 2)
    })

    expect(params.remoteApi.associateProject).toHaveBeenCalledWith(11, { projectId: 2 })
    expect(params.setIndependentSessions).toHaveBeenCalledWith([])
    expect(params.independentSessionsSnapshotRef.current).toEqual([])
    expect(params.setProjectSessionsByProject).toHaveBeenCalledWith({
      2: [expect.objectContaining({ id: 11, projectId: 2 })],
    })
    expect(params.projectSessionsSnapshotRef.current).toEqual({
      2: [expect.objectContaining({ id: 11, projectId: 2 })],
    })
    expect(params.setProjectSessionCountOverrides).toHaveBeenCalledWith({ 2: 1 })
    expect(params.loadIndependentSessionsPage).toHaveBeenCalledWith(1, false, {
      bypassCache: true,
    })
    expect(params.loadProjectSessionsPage).toHaveBeenCalledWith(2, 1, false, {
      bypassCache: true,
    })
  })

  test('does not mutate local state or refresh lists when project association fails', async () => {
    const session = createSession({ id: 11 })
    const params = createParams({
      independentSessions: [session],
      independentSessionsSnapshotRef: { current: [session] },
    })
    jest
      .mocked(params.remoteApi.associateProject)
      .mockRejectedValueOnce(new Error('associate failed'))
    const { result } = renderHook(() => useSessionRemoteHandlers(params))

    await expect(result.current.handleAssociateProjectRemote(session, 2)).rejects.toThrow(
      'associate failed',
    )

    expect(params.setIndependentSessions).not.toHaveBeenCalled()
    expect(params.setIndependentSessionPageState).not.toHaveBeenCalled()
    expect(params.setProjectSessionsByProject).not.toHaveBeenCalled()
    expect(params.setProjectSessionPageState).not.toHaveBeenCalled()
    expect(params.setProjectSessionCountOverrides).not.toHaveBeenCalled()
    expect(params.setLegacyProjectLinkedSessions).not.toHaveBeenCalled()
    expect(params.independentSessionsSnapshotRef.current).toEqual([session])
    expect(params.projectSessionsSnapshotRef.current).toEqual({ 2: [] })
    expect(params.loadIndependentSessionsPage).not.toHaveBeenCalled()
    expect(params.loadProjectSessionsPage).not.toHaveBeenCalled()
  })

  test('dissociates a project session and refreshes standalone plus source project lists', async () => {
    const session = createSession({ id: 12, projectId: 2 })
    const params = createParams({
      independentSessions: [],
      independentSessionsSnapshotRef: { current: [] },
      projectSessionCountOverrides: { 2: 1 },
      projectSessionPageState: {
        2: createProjectPageState({ total: 1, totalPages: 1 }),
      },
      projectSessionsByProject: { 2: [session] },
      projectSessionsSnapshotRef: { current: { 2: [session] } },
    })
    const { result } = renderHook(() => useSessionRemoteHandlers(params))

    await act(async () => {
      await result.current.handleDissociateProjectRemote(session)
    })

    expect(params.remoteApi.dissociateProject).toHaveBeenCalledWith(12)
    expect(params.setIndependentSessions).toHaveBeenCalledWith([
      expect.not.objectContaining({ projectId: 2 }),
    ])
    expect(params.setProjectSessionsByProject).toHaveBeenCalledWith({ 2: [] })
    expect(params.setProjectSessionCountOverrides).toHaveBeenCalledWith({ 2: 0 })
    expect(params.loadIndependentSessionsPage).toHaveBeenCalledWith(1, false, {
      bypassCache: true,
    })
    expect(params.loadProjectSessionsPage).toHaveBeenCalledWith(2, 1, false, {
      bypassCache: true,
    })
  })

  test('does not mutate local state or refresh lists when project dissociation fails', async () => {
    const session = createSession({ id: 12, projectId: 2 })
    const params = createParams({
      independentSessions: [],
      independentSessionsSnapshotRef: { current: [] },
      projectSessionCountOverrides: { 2: 1 },
      projectSessionPageState: {
        2: createProjectPageState({ total: 1, totalPages: 1 }),
      },
      projectSessionsByProject: { 2: [session] },
      projectSessionsSnapshotRef: { current: { 2: [session] } },
    })
    jest
      .mocked(params.remoteApi.dissociateProject)
      .mockRejectedValueOnce(new Error('dissociate failed'))
    const { result } = renderHook(() => useSessionRemoteHandlers(params))

    await expect(result.current.handleDissociateProjectRemote(session)).rejects.toThrow(
      'dissociate failed',
    )

    expect(params.setIndependentSessions).not.toHaveBeenCalled()
    expect(params.setIndependentSessionPageState).not.toHaveBeenCalled()
    expect(params.setProjectSessionsByProject).not.toHaveBeenCalled()
    expect(params.setProjectSessionPageState).not.toHaveBeenCalled()
    expect(params.setProjectSessionCountOverrides).not.toHaveBeenCalled()
    expect(params.setLegacyProjectLinkedSessions).not.toHaveBeenCalled()
    expect(params.independentSessionsSnapshotRef.current).toEqual([])
    expect(params.projectSessionsSnapshotRef.current).toEqual({ 2: [session] })
    expect(params.loadIndependentSessionsPage).not.toHaveBeenCalled()
    expect(params.loadProjectSessionsPage).not.toHaveBeenCalled()
  })
})
