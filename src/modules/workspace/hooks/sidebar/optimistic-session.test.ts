import { describe, expect, test } from '@jest/globals'

import type { Session } from '@/types/api'

import {
  buildOptimisticSession,
  mergeOptimisticSessionsWithServerSessions,
  pruneExpiredOptimisticSessionsByFolder,
  reduceOptimisticSessionsByFolder,
  type SessionTrackingHint,
} from './optimistic-session'

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

describe('optimistic session helpers', () => {
  test('submitted hint inserts a top optimistic session in the target folder', () => {
    const hint = buildSubmittedHint()

    const next = reduceOptimisticSessionsByFolder({}, hint)

    expect(next[0]).toHaveLength(1)
    expect(next[0]?.[0]).toMatchObject({
      title: '生成中的会话',
      toolType: 'workflow',
      status: 'draft',
      __optimistic: {
        taskKey: 'task-1',
        phase: 'submitted',
        submittedAtMs: 1_742_460_000_000,
        interactionLocked: true,
      },
    })
    expect(next[0]?.[0]?.id).toBeLessThan(0)
  })

  test('resolved hint links the optimistic session with the real session id', () => {
    const hint = buildSubmittedHint()
    const submittedState = reduceOptimisticSessionsByFolder({}, hint)

    const next = reduceOptimisticSessionsByFolder(submittedState, {
      ...hint,
      phase: 'resolved',
      sessionId: 88,
    })

    expect(next[0]?.[0]?.__optimistic).toMatchObject({
      taskKey: 'task-1',
      phase: 'resolved',
      sessionId: 88,
    })
  })

  test('merge removes the optimistic session when the real session already exists', () => {
    const hint = buildSubmittedHint()
    const submittedState = reduceOptimisticSessionsByFolder({}, hint)
    const resolvedState = reduceOptimisticSessionsByFolder(submittedState, {
      ...hint,
      phase: 'resolved',
      sessionId: 88,
    })

    const merged = mergeOptimisticSessionsWithServerSessions(
      [buildSession(88, { title: '真实会话' })],
      resolvedState[0] ?? [],
    )

    expect(merged).toEqual([buildSession(88, { title: '真实会话' })])
  })

  test('failed hint removes the matching optimistic session', () => {
    const hint = buildSubmittedHint()
    const submittedState = reduceOptimisticSessionsByFolder({}, hint)

    const next = reduceOptimisticSessionsByFolder(submittedState, {
      ...hint,
      phase: 'failed',
    })

    expect(next[0] ?? []).toEqual([])
  })

  test('independent and project-linked optimistic sessions land in their own folder lists', () => {
    const independentHint = buildSubmittedHint()
    const projectHint = buildSubmittedHint({
      taskKey: 'task-2',
      folderId: 42,
      title: '项目会话',
    })

    const next = reduceOptimisticSessionsByFolder(
      reduceOptimisticSessionsByFolder({}, independentHint),
      projectHint,
    )

    expect(next[0]?.[0]).toMatchObject({
      title: '生成中的会话',
      projectId: undefined,
    })
    expect(next[42]?.[0]).toMatchObject({
      title: '项目会话',
      projectId: 42,
    })
  })

  test('buildOptimisticSession creates a stable local session shape', () => {
    const session = buildOptimisticSession(buildSubmittedHint())

    expect(session).toMatchObject({
      userId: 0,
      title: '生成中的会话',
      toolType: 'workflow',
      modelVersion: 'optimistic',
      status: 'draft',
    })
    expect(session.__optimistic?.interactionLocked).toBe(true)
  })

  test('prunes optimistic sessions that are older than the ttl', () => {
    const optimisticState = reduceOptimisticSessionsByFolder(
      {},
      buildSubmittedHint({
        taskKey: 'task-expired',
        submittedAtMs: 1_000,
      }),
    )

    const next = pruneExpiredOptimisticSessionsByFolder({
      optimisticSessionsByFolder: optimisticState,
      nowMs: 121_001,
      ttlMs: 120_000,
    })

    expect(next).toEqual({})
  })

  test('keeps optimistic sessions that are still within the ttl window', () => {
    const optimisticState = reduceOptimisticSessionsByFolder(
      {},
      buildSubmittedHint({
        taskKey: 'task-fresh',
        submittedAtMs: 1_000,
      }),
    )

    const next = pruneExpiredOptimisticSessionsByFolder({
      optimisticSessionsByFolder: optimisticState,
      nowMs: 120_000,
      ttlMs: 120_000,
    })

    expect(next[0]).toHaveLength(1)
    expect(next[0]?.[0]?.__optimistic?.taskKey).toBe('task-fresh')
  })
})
