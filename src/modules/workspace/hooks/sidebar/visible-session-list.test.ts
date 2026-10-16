import { describe, expect, test } from '@jest/globals'

import type { Project, Session } from '@/types/api'

import {
  buildOptimisticSession,
  reduceOptimisticSessionsByFolder,
  type SessionTrackingHint,
} from './optimistic-session'
import { buildVisibleSessionList } from './visible-session-list'

function buildProject(id: number, overrides?: Partial<Project>): Project {
  return {
    id,
    name: `项目-${id}`,
    customerName: '',
    description: '',
    status: 'active',
    createdAt: '2026-03-20T10:00:00.000Z',
    updatedAt: '2026-03-20T10:00:00.000Z',
    ...overrides,
  } as Project
}

function buildSession(id: number, overrides?: Partial<Session>): Session {
  return {
    id,
    userId: 1,
    title: `会话-${id}`,
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-03-20T10:00:00.000Z',
    updatedAt: '2026-03-20T10:00:00.000Z',
    ...overrides,
  }
}

function buildSubmittedHint(overrides?: Partial<SessionTrackingHint>): SessionTrackingHint {
  return {
    taskKey: 'task-1',
    folderId: 0,
    title: '生成中的会话',
    toolType: 'workflow',
    submittedAtMs: 1_742_460_000_000,
    phase: 'submitted',
    ...overrides,
  }
}

describe('visible session list', () => {
  test('places submitted optimistic sessions in the correct standalone and project groups', () => {
    const optimisticState = reduceOptimisticSessionsByFolder(
      reduceOptimisticSessionsByFolder({}, buildSubmittedHint()),
      buildSubmittedHint({
        taskKey: 'task-2',
        folderId: 42,
        title: '项目中的生成',
      }),
    )

    const visible = buildVisibleSessionList({
      projects: [buildProject(42)],
      independentSessions: [],
      projectSessionsByProject: {},
      optimisticSessionsByFolder: optimisticState,
    })

    expect(visible.independentSessions[0]).toMatchObject({ title: '生成中的会话' })
    expect(visible.projectSessionsByProject[42]?.[0]).toMatchObject({ title: '项目中的生成' })
  })

  test('keeps optimistic standalone sessions visible even when search term is active', () => {
    const optimisticState = {
      0: [buildOptimisticSession(buildSubmittedHint())],
    }

    const visible = buildVisibleSessionList({
      projects: [],
      independentSessions: [],
      projectSessionsByProject: {},
      optimisticSessionsByFolder: optimisticState,
    })

    expect(visible.independentSessions).toHaveLength(1)
    expect(visible.independentSessions[0]).toMatchObject({ title: '生成中的会话' })
  })

  test('keeps the target project visible when its session list was not initialized yet', () => {
    const optimisticState = reduceOptimisticSessionsByFolder(
      {},
      buildSubmittedHint({
        taskKey: 'task-2',
        folderId: 42,
        title: '项目中的生成',
      }),
    )

    const visible = buildVisibleSessionList({
      projects: [buildProject(42)],
      independentSessions: [],
      projectSessionsByProject: {},
      optimisticSessionsByFolder: optimisticState,
    })

    expect(visible.projectSessionsByProject[42]).toHaveLength(1)
    expect(visible.visibleProjectIds).toContain(42)
  })

  test('dedupes a resolved optimistic session once the real session is already in the server list', () => {
    const optimisticState = reduceOptimisticSessionsByFolder(
      reduceOptimisticSessionsByFolder(
        {},
        buildSubmittedHint({
          taskKey: 'task-2',
          folderId: 42,
          title: '项目中的生成',
        }),
      ),
      buildSubmittedHint({
        taskKey: 'task-2',
        folderId: 42,
        title: '项目中的生成',
        phase: 'resolved',
        sessionId: 88,
      }),
    )

    const visible = buildVisibleSessionList({
      projects: [buildProject(42)],
      independentSessions: [],
      projectSessionsByProject: {
        42: [buildSession(88, { projectId: 42, title: '真实会话' })],
      },
      optimisticSessionsByFolder: optimisticState,
    })

    expect(visible.projectSessionsByProject[42]).toEqual([
      buildSession(88, { projectId: 42, title: '真实会话' }),
    ])
  })

  test('keeps optimistic project ids visible even when search is empty', () => {
    const optimisticState = reduceOptimisticSessionsByFolder(
      {},
      buildSubmittedHint({
        taskKey: 'task-3',
        folderId: 42,
        title: '项目中的生成',
      }),
    )

    const visible = buildVisibleSessionList({
      projects: [],
      independentSessions: [],
      projectSessionsByProject: {},
      optimisticSessionsByFolder: optimisticState,
    })

    expect(visible.visibleProjectIds).toContain(42)
  })
})
