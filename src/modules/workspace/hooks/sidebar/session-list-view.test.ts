import { describe, expect, test } from '@jest/globals'

import type { Project, Session } from '@/types/api'

import type { IndependentSessionPageState, ProjectSessionPageState } from './session-loading'
import {
  buildFilteredProjectSessions,
  buildIndependentSessionPagination,
  buildMergedSessionList,
  buildNonOverlappingProjectSessions,
  buildProjectSessionPaginationByProject,
  buildProjectsVisibleInSessions,
  buildStandaloneSessions,
} from './session-list-view'

function createProject(id: number, overrides: Partial<Project> = {}): Project {
  return {
    id,
    userId: 1,
    name: `项目 ${id}`,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createSession(id: number, overrides: Partial<Session> = {}): Session {
  return {
    id,
    userId: 1,
    title: `会话 ${id}`,
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('workspace sidebar session list view helpers', () => {
  test('keeps only standalone sessions for the standalone history lane', () => {
    expect(
      buildStandaloneSessions([
        createSession(1),
        createSession(2, { projectId: 10 }),
        createSession(3),
      ]),
    ).toEqual([createSession(1), createSession(3)])
  })

  test('removes project sessions already represented by standalone history', () => {
    expect(
      buildNonOverlappingProjectSessions({
        independentSessions: [createSession(1), createSession(3)],
        projectSessionsByProject: {
          10: [createSession(1, { projectId: 10 }), createSession(2, { projectId: 10 })],
          20: [createSession(3, { projectId: 20 }), createSession(4, { projectId: 20 })],
        },
      }),
    ).toEqual({
      10: [createSession(2, { projectId: 10 })],
      20: [createSession(4, { projectId: 20 })],
    })
  })

  test('merges visible sessions once and sorts newest first', () => {
    expect(
      buildMergedSessionList({
        independentSessions: [
          createSession(1, { updatedAt: '2026-01-01T00:00:00.000Z' }),
          createSession(2, { updatedAt: '2026-01-02T00:00:00.000Z' }),
        ],
        projectSessionsByProject: {
          10: [
            createSession(2, {
              projectId: 10,
              updatedAt: '2026-01-04T00:00:00.000Z',
            }),
            createSession(3, {
              projectId: 10,
              updatedAt: '2026-01-03T00:00:00.000Z',
            }),
          ],
        },
        legacyProjectLinkedSessions: [
          createSession(4, {
            projectId: 20,
            updatedAt: '2026-01-05T00:00:00.000Z',
          }),
        ],
      }).map((session) => session.id),
    ).toEqual([4, 3, 2, 1])
  })

  test('builds project session pagination for every visible project', () => {
    const projectSessionPageState: Record<number, ProjectSessionPageState> = {
      10: {
        page: 1,
        total: 4,
        totalPages: 2,
        initialized: true,
        isLoading: true,
        loadingMode: 'more',
      },
      20: {
        page: 1,
        total: 1,
        totalPages: 1,
        initialized: true,
        isLoading: false,
        loadingMode: null,
      },
    }

    expect(
      buildProjectSessionPaginationByProject({
        projectList: [createProject(10), createProject(20)],
        projectSessionPageState,
        projectSessionsByProject: {
          10: [createSession(1, { projectId: 10 }), createSession(2, { projectId: 10 })],
        },
      }),
    ).toEqual({
      10: {
        initialized: true,
        isLoading: true,
        isInitialLoading: false,
        isRefreshing: false,
        isLoadingMore: true,
        hasMore: true,
        loadedCount: 2,
        total: 4,
      },
      20: {
        initialized: true,
        isLoading: false,
        isInitialLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        hasMore: false,
        loadedCount: 0,
        total: 1,
      },
    })
  })

  test('builds standalone pagination with visible count as the lower bound', () => {
    const pageState: IndependentSessionPageState = {
      page: 2,
      total: 1,
      totalPages: 3,
      initialized: true,
      isLoading: true,
    }

    expect(
      buildIndependentSessionPagination({
        pageState,
        visibleIndependentSessionCount: 2,
      }),
    ).toEqual({
      initialized: true,
      isLoading: true,
      isInitialLoading: false,
      isRefreshing: false,
      isLoadingMore: true,
      hasMore: true,
      loadedCount: 2,
      total: 2,
    })
  })

  test('adds projects that only appear through visible session ids and keeps known order', () => {
    expect(
      buildProjectsVisibleInSessions({
        projectList: [createProject(1)],
        rootProjects: [createProject(1), createProject(2)],
        activeProjectCache: [createProject(3), createProject(2)],
        visibleProjectIdSet: new Set([2, 3]),
      }),
    ).toEqual([createProject(1), createProject(2), createProject(3)])
  })

  test('keeps filtered project sessions aligned with filtered projects', () => {
    expect(
      buildFilteredProjectSessions({
        filteredProjects: [createProject(2), createProject(3)],
        visibleProjectSessions: {
          1: [createSession(1, { projectId: 1 })],
          2: [createSession(2, { projectId: 2 })],
        },
      }),
    ).toEqual({
      2: [createSession(2, { projectId: 2 })],
      3: [],
    })
  })
})
