import { describe, expect, test } from '@jest/globals'

import type { Project, Session } from '@/types/api'

import { reconcileSessionAssociationState } from './session-association-state'

const baseProjects: Project[] = [
  {
    id: 101,
    userId: 1,
    name: '网站测试1',
    status: 'active',
    sessionCount: 1,
    createdAt: '2026-03-09T08:00:00.000Z',
    updatedAt: '2026-03-09T08:00:00.000Z',
  },
  {
    id: 202,
    userId: 1,
    name: '网站测试3',
    status: 'active',
    sessionCount: 1,
    createdAt: '2026-03-09T08:00:00.000Z',
    updatedAt: '2026-03-09T08:00:00.000Z',
  },
]

const baseSession: Session = {
  id: 301,
  userId: 1,
  projectId: 101,
  title: '会话A',
  toolType: 'workflow',
  modelVersion: 'fast',
  status: 'completed',
  createdAt: '2026-03-09T08:00:00.000Z',
  updatedAt: '2026-03-09T08:00:00.000Z',
}

const targetSession: Session = {
  id: 302,
  userId: 1,
  projectId: 202,
  title: '会话B',
  toolType: 'workflow',
  modelVersion: 'fast',
  status: 'completed',
  createdAt: '2026-03-09T08:00:00.000Z',
  updatedAt: '2026-03-09T08:00:00.000Z',
}

describe('reconcileSessionAssociationState', () => {
  test('moves a linked session to another project and updates both project counts', () => {
    const next = reconcileSessionAssociationState({
      session: baseSession,
      targetProjectId: 202,
      pageSize: 15,
      projects: baseProjects,
      state: {
        independentSessions: [],
        independentSessionsSnapshot: [],
        independentSessionPageState: {
          page: 1,
          total: 0,
          totalPages: 0,
          isLoading: false,
          initialized: true,
        },
        projectSessionsByProject: {
          101: [baseSession],
          202: [targetSession],
        },
        projectSessionsSnapshot: {
          101: [baseSession],
          202: [targetSession],
        },
        projectSessionPageState: {
          101: {
            page: 1,
            total: 1,
            totalPages: 1,
            isLoading: false,
            initialized: true,
            loadingMode: null,
          },
          202: {
            page: 1,
            total: 1,
            totalPages: 1,
            isLoading: false,
            initialized: true,
            loadingMode: null,
          },
        },
        projectSessionCountOverrides: {
          101: 1,
          202: 1,
        },
        legacyProjectLinkedSessions: [baseSession, targetSession],
      },
    })

    expect(next.projectSessionsByProject[101]).toHaveLength(0)
    expect(next.projectSessionsByProject[202][0]).toMatchObject({ id: 301, projectId: 202 })
    expect(next.projectSessionPageState[101].total).toBe(0)
    expect(next.projectSessionPageState[202].total).toBe(2)
    expect(next.projectSessionCountOverrides[101]).toBe(0)
    expect(next.projectSessionCountOverrides[202]).toBe(2)
    expect(next.legacyProjectLinkedSessions.find((session) => session.id === 301)?.projectId).toBe(
      202,
    )
  })

  test('dissociates a linked session and updates project count immediately', () => {
    const next = reconcileSessionAssociationState({
      session: baseSession,
      targetProjectId: null,
      pageSize: 15,
      projects: baseProjects,
      state: {
        independentSessions: [],
        independentSessionsSnapshot: [],
        independentSessionPageState: {
          page: 1,
          total: 0,
          totalPages: 0,
          isLoading: false,
          initialized: true,
        },
        projectSessionsByProject: {
          101: [baseSession],
        },
        projectSessionsSnapshot: {
          101: [baseSession],
        },
        projectSessionPageState: {
          101: {
            page: 1,
            total: 1,
            totalPages: 1,
            isLoading: false,
            initialized: true,
            loadingMode: null,
          },
        },
        projectSessionCountOverrides: {
          101: 1,
        },
        legacyProjectLinkedSessions: [baseSession],
      },
    })

    expect(next.projectSessionsByProject[101]).toHaveLength(0)
    expect(next.projectSessionPageState[101].total).toBe(0)
    expect(next.projectSessionCountOverrides[101]).toBe(0)
    expect(next.independentSessions[0]).toMatchObject({ id: 301 })
    expect(next.independentSessions[0]?.projectId).toBeUndefined()
    expect(next.independentSessionPageState.total).toBe(1)
    expect(next.legacyProjectLinkedSessions.find((session) => session.id === 301)).toBeUndefined()
  })

  test('uses loaded project page total even when it is zero instead of stale project sessionCount', () => {
    const independentSession: Session = {
      ...baseSession,
      id: 401,
      projectId: undefined,
      title: '待关联独立会话',
    }
    const staleProjects: Project[] = [
      {
        ...baseProjects[0],
        id: 303,
        sessionCount: 5,
      },
    ]

    const next = reconcileSessionAssociationState({
      session: independentSession,
      targetProjectId: 303,
      pageSize: 15,
      projects: staleProjects,
      state: {
        independentSessions: [independentSession],
        independentSessionsSnapshot: [independentSession],
        independentSessionPageState: {
          page: 1,
          total: 1,
          totalPages: 1,
          isLoading: false,
          initialized: true,
        },
        projectSessionsByProject: {
          303: [],
        },
        projectSessionsSnapshot: {
          303: [],
        },
        projectSessionPageState: {
          303: {
            page: 1,
            total: 0,
            totalPages: 0,
            isLoading: false,
            initialized: true,
            loadingMode: null,
          },
        },
        projectSessionCountOverrides: {},
        legacyProjectLinkedSessions: [],
      },
    })

    expect(next.projectSessionCountOverrides[303]).toBe(1)
    expect(next.projectSessionPageState[303].total).toBe(1)
    expect(next.projectSessionsByProject[303]).toHaveLength(1)
  })
})
