import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { SessionTrackingHint } from './sidebar/optimistic-session'
import { createSprintRefreshController } from './sidebar/sprint-refresh-controller'
import { useSprintRefreshController } from './sidebar/use-sprint-refresh-controller'

function createSubmittedHint(overrides?: Partial<SessionTrackingHint>): SessionTrackingHint {
  return {
    taskKey: 'task-1',
    folderId: 0,
    title: '生成中的会话',
    toolType: 'demo-tool',
    submittedAtMs: 1_742_460_000_000,
    phase: 'submitted',
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

describe('useWorkspaceSidebar sprint refresh', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  test('starts sprint refresh immediately on submitted and ticks at 500ms', async () => {
    const refreshFolderSessionsOnce = jest.fn(async () => {})
    const refreshSessions = jest.fn(async () => {})
    const controller = createSprintRefreshController({
      intervalMs: 500,
      maxDurationMs: 30_000,
      weakSignalHitsToStop: 2,
      getFolderSessionsSnapshot: () => [],
      refreshFolderSessionsOnce,
      refreshSessions,
    })

    await act(async () => {
      await controller.handleSessionHint(createSubmittedHint())
    })

    expect(refreshFolderSessionsOnce).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(refreshFolderSessionsOnce).toHaveBeenCalledTimes(2)
    expect(refreshSessions).not.toHaveBeenCalled()
  })

  test('restarts sprint on resolved and stops within 1000ms after completion', async () => {
    const refreshFolderSessionsOnce = jest.fn(async () => {})
    const refreshSessions = jest.fn(async () => {})
    const controller = createSprintRefreshController({
      intervalMs: 500,
      maxDurationMs: 30_000,
      weakSignalHitsToStop: 2,
      getFolderSessionsSnapshot: () => [],
      refreshFolderSessionsOnce,
      refreshSessions,
    })

    await act(async () => {
      await controller.handleSessionHint(createSubmittedHint())
    })

    expect(refreshFolderSessionsOnce).toHaveBeenCalledTimes(1)

    await act(async () => {
      await controller.handleSessionHint(
        createSubmittedHint({
          phase: 'resolved',
          sessionId: 88,
        }),
      )
    })

    expect(refreshFolderSessionsOnce).toHaveBeenCalledTimes(2)

    await act(async () => {
      await controller.handleSessionHint(
        createSubmittedHint({
          phase: 'completed',
          sessionId: 88,
        }),
      )
    })

    expect(refreshSessions).toHaveBeenCalledTimes(1)
    const callsAfterCompletion = refreshFolderSessionsOnce.mock.calls.length

    await act(async () => {
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(refreshFolderSessionsOnce).toHaveBeenCalledTimes(callsAfterCompletion)
  })

  test('does not let an old in-flight sprint tick unlock a restarted sprint', async () => {
    const firstRefresh = createDeferred<void>()
    const secondRefresh = createDeferred<void>()
    const refreshFolderSessionsOnce = jest
      .fn<() => Promise<void>>()
      .mockReturnValueOnce(firstRefresh.promise)
      .mockReturnValueOnce(secondRefresh.promise)
      .mockResolvedValue(undefined)
    const refreshSessions = jest.fn(async () => {})
    const controller = createSprintRefreshController({
      intervalMs: 500,
      maxDurationMs: 30_000,
      weakSignalHitsToStop: 2,
      getFolderSessionsSnapshot: () => [],
      refreshFolderSessionsOnce,
      refreshSessions,
    })

    await act(async () => {
      await controller.handleSessionHint(createSubmittedHint())
    })
    await act(async () => {
      await controller.handleSessionHint(
        createSubmittedHint({
          phase: 'resolved',
          sessionId: 88,
        }),
      )
    })

    expect(refreshFolderSessionsOnce).toHaveBeenCalledTimes(2)

    await act(async () => {
      firstRefresh.resolve()
      await firstRefresh.promise
      await Promise.resolve()
    })
    await act(async () => {
      jest.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(refreshFolderSessionsOnce).toHaveBeenCalledTimes(2)
  })

  test('keeps sprint refresh alive across rerenders and switches to the latest callbacks', async () => {
    const refreshFolderSessionsOnceV1 = jest.fn(async () => {})
    const refreshFolderSessionsOnceV2 = jest.fn(async () => {})
    const refreshSessionsV1 = jest.fn(async () => {})
    const refreshSessionsV2 = jest.fn(async () => {})

    const { result, rerender } = renderHook(
      ({ version }) =>
        useSprintRefreshController({
          intervalMs: 500,
          maxDurationMs: 30_000,
          weakSignalHitsToStop: 2,
          getFolderSessionsSnapshot: () => [],
          refreshFolderSessionsOnce:
            version === 1 ? refreshFolderSessionsOnceV1 : refreshFolderSessionsOnceV2,
          refreshSessions: version === 1 ? refreshSessionsV1 : refreshSessionsV2,
        }),
      {
        initialProps: { version: 1 },
      },
    )

    await act(async () => {
      await result.current.handleSessionHint(createSubmittedHint())
    })

    expect(refreshFolderSessionsOnceV1).toHaveBeenCalledTimes(1)

    rerender({ version: 2 })

    await act(async () => {
      jest.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(refreshFolderSessionsOnceV1).toHaveBeenCalledTimes(1)
    expect(refreshFolderSessionsOnceV2).toHaveBeenCalledTimes(1)
    expect(refreshSessionsV1).not.toHaveBeenCalled()
    expect(refreshSessionsV2).not.toHaveBeenCalled()
  })
})
