import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import { SESSION_GENERATION_FINISHED_EVENT } from '../../events/session-generation-event'
import { useSessionRefreshBindings } from './use-session-refresh-bindings'

const REGULAR_REFRESH_INTERVAL_MS = 1_000

function createSprintRefreshController() {
  return {
    cleanup: jest.fn(),
    startSprintRefresh: jest.fn(),
  }
}

describe('useSessionRefreshBindings', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  test('starts sprint refresh when a generation finished event carries a valid folder id', () => {
    const sprintRefreshController = createSprintRefreshController()

    renderHook(() =>
      useSessionRefreshBindings({
        refreshSessions: jest.fn(async () => undefined),
        regularRefreshIntervalMs: REGULAR_REFRESH_INTERVAL_MS,
        sprintRefreshController,
      }),
    )

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SESSION_GENERATION_FINISHED_EVENT, {
          detail: { folderId: 5 },
        }),
      )
    })

    expect(sprintRefreshController.startSprintRefresh).toHaveBeenCalledWith(5)
  })

  test('ignores generation finished events with invalid folder ids', () => {
    const sprintRefreshController = createSprintRefreshController()

    renderHook(() =>
      useSessionRefreshBindings({
        refreshSessions: jest.fn(async () => undefined),
        regularRefreshIntervalMs: REGULAR_REFRESH_INTERVAL_MS,
        sprintRefreshController,
      }),
    )

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SESSION_GENERATION_FINISHED_EVENT, {
          detail: { folderId: -1 },
        }),
      )
    })

    expect(sprintRefreshController.startSprintRefresh).not.toHaveBeenCalled()
  })

  test('keeps the legacy background task event wired to sprint refresh', () => {
    const sprintRefreshController = createSprintRefreshController()

    renderHook(() =>
      useSessionRefreshBindings({
        refreshSessions: jest.fn(async () => undefined),
        regularRefreshIntervalMs: REGULAR_REFRESH_INTERVAL_MS,
        sprintRefreshController,
      }),
    )

    act(() => {
      window.dispatchEvent(
        new CustomEvent('background-task-completed', {
          detail: { folderId: 9 },
        }),
      )
    })

    expect(sprintRefreshController.startSprintRefresh).toHaveBeenCalledWith(9)
  })

  test('uses the latest refreshSessions callback for regular refresh', async () => {
    const sprintRefreshController = createSprintRefreshController()
    const firstRefreshSessions = jest.fn(async () => undefined)
    const secondRefreshSessions = jest.fn(async () => undefined)

    const { rerender } = renderHook(
      ({ refreshSessions }) =>
        useSessionRefreshBindings({
          refreshSessions,
          regularRefreshIntervalMs: REGULAR_REFRESH_INTERVAL_MS,
          sprintRefreshController,
        }),
      {
        initialProps: {
          refreshSessions: firstRefreshSessions,
        },
      },
    )

    rerender({ refreshSessions: secondRefreshSessions })

    await act(async () => {
      jest.advanceTimersByTime(REGULAR_REFRESH_INTERVAL_MS)
      await Promise.resolve()
    })

    expect(firstRefreshSessions).not.toHaveBeenCalled()
    expect(secondRefreshSessions).toHaveBeenCalledTimes(1)
  })

  test('removes listeners, clears timer, and cleans sprint controller on unmount', async () => {
    const sprintRefreshController = createSprintRefreshController()
    const refreshSessions = jest.fn(async () => undefined)

    const { unmount } = renderHook(() =>
      useSessionRefreshBindings({
        refreshSessions,
        regularRefreshIntervalMs: REGULAR_REFRESH_INTERVAL_MS,
        sprintRefreshController,
      }),
    )

    unmount()

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SESSION_GENERATION_FINISHED_EVENT, {
          detail: { folderId: 3 },
        }),
      )
    })
    await act(async () => {
      jest.advanceTimersByTime(REGULAR_REFRESH_INTERVAL_MS)
      await Promise.resolve()
    })

    expect(sprintRefreshController.cleanup).toHaveBeenCalledTimes(1)
    expect(sprintRefreshController.startSprintRefresh).not.toHaveBeenCalled()
    expect(refreshSessions).not.toHaveBeenCalled()
  })
})
