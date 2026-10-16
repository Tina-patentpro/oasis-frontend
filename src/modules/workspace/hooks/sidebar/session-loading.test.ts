import { describe, expect, jest, test } from '@jest/globals'

import type { PaginatedResponse, Session } from '@/types/api'

import {
  buildIndependentSessionErrorState,
  buildIndependentSessionLoadedState,
  buildIndependentSessionLoadingState,
  buildProjectSessionErrorState,
  buildProjectSessionLoadedState,
  buildProjectSessionLoadingState,
  filterIndependentSessions,
  filterProjectSessions,
  mergeSessionsById,
  shouldBypassSessionCache,
} from './session-loading'

function createSession(id: number, projectId?: number): Session {
  return {
    id,
    userId: 1,
    title: `会话 ${id}`,
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    projectId,
  }
}

function createResponse(items: Session[]): PaginatedResponse<Session> {
  return {
    items,
    pagination: {
      page: 2,
      pageSize: 15,
      total: 30,
      totalPages: 2,
    },
  }
}

describe('workspace sidebar session loading helpers', () => {
  test('merges sessions by id while keeping existing items first', () => {
    expect(
      mergeSessionsById([createSession(1), createSession(2)], [createSession(2), createSession(3)]),
    ).toEqual([createSession(1), createSession(2), createSession(3)])
  })

  test('bypasses cache for first-page refreshes or explicit bypass requests only', () => {
    expect(shouldBypassSessionCache(1, false)).toBe(true)
    expect(shouldBypassSessionCache(2, false)).toBe(false)
    expect(shouldBypassSessionCache(2, true)).toBe(false)
    expect(shouldBypassSessionCache(2, true, { bypassCache: true })).toBe(true)
  })

  test('filters leaked project-linked sessions from independent history', () => {
    const warn = jest.fn()

    expect(
      filterIndependentSessions([createSession(1), createSession(2, 10), createSession(3)], warn),
    ).toEqual([createSession(1), createSession(3)])
    expect(warn).toHaveBeenCalledWith(
      '[useWorkspaceSidebar] independent 会话出现 projectId，已过滤',
      {
        leakedCount: 1,
        leakedIds: [2],
      },
    )
  })

  test('filters leaked sessions that belong to a different project', () => {
    const warn = jest.fn()

    expect(
      filterProjectSessions(
        [createSession(1, 10), createSession(2, 11), createSession(3)],
        10,
        warn,
      ),
    ).toEqual([createSession(1, 10)])
    expect(warn).toHaveBeenCalledWith('[useWorkspaceSidebar] project 会话归属异常，已过滤', {
      expectedProjectId: 10,
      leakedCount: 2,
      leaked: [
        { id: 2, projectId: 11 },
        { id: 3, projectId: null },
      ],
    })
  })

  test('builds independent session page states for loading, loaded and error cases', () => {
    const previous = {
      page: 1,
      total: 15,
      totalPages: 1,
      isLoading: false,
      initialized: true,
    }

    expect(buildIndependentSessionLoadingState(previous)).toEqual({
      ...previous,
      isLoading: true,
    })
    expect(
      buildIndependentSessionLoadedState(createResponse([createSession(1)]).pagination),
    ).toEqual({
      page: 2,
      total: 30,
      totalPages: 2,
      isLoading: false,
      initialized: true,
    })
    expect(buildIndependentSessionErrorState(previous)).toEqual({
      ...previous,
      isLoading: false,
      initialized: true,
    })
  })

  test('builds project session page states without losing previous pagination on errors', () => {
    const previous = {
      page: 1,
      total: 15,
      totalPages: 3,
      initialized: true,
      isLoading: false,
      loadingMode: null,
    } as const

    expect(buildProjectSessionLoadingState(previous, true)).toEqual({
      page: 1,
      total: 15,
      totalPages: 3,
      initialized: true,
      isLoading: true,
      loadingMode: 'more',
    })
    expect(buildProjectSessionLoadingState(undefined, false)).toEqual({
      page: 0,
      total: 0,
      totalPages: 0,
      initialized: false,
      isLoading: true,
      loadingMode: 'initial',
    })
    expect(
      buildProjectSessionLoadedState(createResponse([createSession(1, 10)]).pagination),
    ).toEqual({
      page: 2,
      total: 30,
      totalPages: 2,
      initialized: true,
      isLoading: false,
      loadingMode: null,
    })
    expect(buildProjectSessionErrorState(previous)).toEqual({
      page: 1,
      total: 15,
      totalPages: 3,
      initialized: true,
      isLoading: false,
      loadingMode: null,
    })
  })
})
