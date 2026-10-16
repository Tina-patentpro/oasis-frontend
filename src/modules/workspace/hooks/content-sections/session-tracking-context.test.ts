import { describe, expect, test } from '@jest/globals'

import {
  buildResolvedSessionTrackingHint,
  clearSessionTrackingContext,
  createSessionTrackingRegistry,
  registerSessionTrackingContext,
  type SessionTrackingContext,
} from './session-tracking-context'

function buildContext(overrides?: Partial<SessionTrackingContext>): SessionTrackingContext {
  return {
    taskKey: 'task-1',
    folderId: 12,
    title: '测试标题',
    toolType: 'workflow',
    submittedAtMs: 1_742_460_000_000,
    ...overrides,
  }
}

describe('session tracking context', () => {
  test('registers taskKey context on submitted', () => {
    const next = registerSessionTrackingContext(createSessionTrackingRegistry(), buildContext())

    expect(next.contextByTaskKey['task-1']).toEqual(buildContext())
  })

  test('builds a resolved hint from the saved context when session id first appears', () => {
    const registered = registerSessionTrackingContext(
      createSessionTrackingRegistry(),
      buildContext(),
    )

    const { nextRegistry, hint } = buildResolvedSessionTrackingHint(registered, {
      taskKey: 'task-1',
      sessionId: 88,
    })

    expect(hint).toMatchObject({
      taskKey: 'task-1',
      folderId: 12,
      title: '测试标题',
      toolType: 'workflow',
      submittedAtMs: 1_742_460_000_000,
      phase: 'resolved',
      sessionId: 88,
    })
    expect(nextRegistry.resolvedSessionIdByTaskKey['task-1']).toBe(88)
  })

  test('does not emit duplicate resolved hints for the same taskKey and session id', () => {
    const registered = registerSessionTrackingContext(
      createSessionTrackingRegistry(),
      buildContext(),
    )
    const first = buildResolvedSessionTrackingHint(registered, {
      taskKey: 'task-1',
      sessionId: 88,
    })

    const second = buildResolvedSessionTrackingHint(first.nextRegistry, {
      taskKey: 'task-1',
      sessionId: 88,
    })

    expect(first.hint?.phase).toBe('resolved')
    expect(second.hint).toBeNull()
  })

  test('clears both saved context and resolved marker on terminal phases', () => {
    const registered = registerSessionTrackingContext(
      createSessionTrackingRegistry(),
      buildContext(),
    )
    const resolved = buildResolvedSessionTrackingHint(registered, {
      taskKey: 'task-1',
      sessionId: 88,
    })

    const next = clearSessionTrackingContext(resolved.nextRegistry, 'task-1')

    expect(next.contextByTaskKey['task-1']).toBeUndefined()
    expect(next.resolvedSessionIdByTaskKey['task-1']).toBeUndefined()
  })

  test('allows a new task to emit its own resolved hint after the previous task is cleared', () => {
    const firstTaskRegistry = registerSessionTrackingContext(
      createSessionTrackingRegistry(),
      buildContext(),
    )
    const cleared = clearSessionTrackingContext(firstTaskRegistry, 'task-1')
    const secondTaskRegistry = registerSessionTrackingContext(
      cleared,
      buildContext({
        taskKey: 'task-2',
        folderId: 99,
        title: '第二个任务',
      }),
    )

    const { hint } = buildResolvedSessionTrackingHint(secondTaskRegistry, {
      taskKey: 'task-2',
      sessionId: 120,
    })

    expect(hint).toMatchObject({
      taskKey: 'task-2',
      folderId: 99,
      title: '第二个任务',
      sessionId: 120,
      phase: 'resolved',
    })
  })
})
