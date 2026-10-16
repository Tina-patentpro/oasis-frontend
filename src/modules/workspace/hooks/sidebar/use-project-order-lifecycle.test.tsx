import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import type { ProjectOrderState } from './project-reorder-control'
import { useProjectOrderLifecycle } from './use-project-order-lifecycle'

function createOrder(overrides: Partial<ProjectOrderState> = {}): ProjectOrderState {
  return {
    active: [1, 2, 3],
    archived: [10, 20],
    ...overrides,
  }
}

function createParams(overrides: Partial<Parameters<typeof useProjectOrderLifecycle>[0]> = {}) {
  const anonymousProjectOrderKey = 'user-anonymous'
  const currentUserProjectOrderKey = 'user-1'
  const anonymousOrder = createOrder({ active: [3, 2, 1] })
  const previousProjectOrderKeyRef = { current: anonymousProjectOrderKey }
  const anonymousOrderChangedInSessionRef = { current: true }

  return {
    anonymousOrderChangedInSessionRef,
    anonymousProjectOrderKey,
    clearProjectOrderForUser: jest.fn(),
    currentUserProjectOrderKey,
    previousProjectOrderKeyRef,
    projectOrderByUser: {
      [anonymousProjectOrderKey]: anonymousOrder,
    },
    projectTotal: 3,
    projectTotalPages: 1,
    rawProjectCount: 3,
    reconciledProjectOrder: createOrder(),
    setProjectOrderForUser: jest.fn(),
    storedProjectOrder: null,
    ...overrides,
  }
}

describe('useProjectOrderLifecycle', () => {
  test('promotes anonymous order after switching to a real user and clears anonymous order', async () => {
    const params = createParams()

    renderHook(() => useProjectOrderLifecycle(params))

    await waitFor(() => {
      expect(params.setProjectOrderForUser).toHaveBeenCalledWith(
        'user-1',
        params.projectOrderByUser['user-anonymous'],
      )
    })
    expect(params.clearProjectOrderForUser).toHaveBeenCalledWith('user-anonymous')
    expect(params.previousProjectOrderKeyRef.current).toBe('user-1')
    expect(params.anonymousOrderChangedInSessionRef.current).toBe(false)
  })

  test('does not overwrite promoted anonymous order with the reconciled order in the same effect cycle', async () => {
    const anonymousOrder = createOrder({ active: [3, 2, 1] })
    const params = createParams({
      projectOrderByUser: {
        'user-anonymous': anonymousOrder,
      },
      reconciledProjectOrder: createOrder({ active: [1, 2, 3] }),
      storedProjectOrder: null,
    })

    renderHook(() => useProjectOrderLifecycle(params))

    await waitFor(() => {
      expect(params.setProjectOrderForUser).toHaveBeenCalledWith('user-1', anonymousOrder)
    })
    expect(params.setProjectOrderForUser).toHaveBeenCalledTimes(1)
  })

  test('does not promote anonymous order when it was not changed in the current session', () => {
    const params = createParams({
      reconciledProjectOrder: createOrder(),
      storedProjectOrder: createOrder(),
    })
    params.anonymousOrderChangedInSessionRef.current = false

    renderHook(() => useProjectOrderLifecycle(params))

    expect(params.setProjectOrderForUser).not.toHaveBeenCalled()
    expect(params.clearProjectOrderForUser).not.toHaveBeenCalled()
    expect(params.previousProjectOrderKeyRef.current).toBe('user-1')
  })

  test('persists reconciled project order only when project list can prove the full order', async () => {
    const params = createParams({
      projectOrderByUser: {},
      reconciledProjectOrder: createOrder({ active: [2, 1, 3] }),
      storedProjectOrder: createOrder({ active: [1, 2, 3] }),
    })
    params.anonymousOrderChangedInSessionRef.current = false

    renderHook(() => useProjectOrderLifecycle(params))

    await waitFor(() => {
      expect(params.setProjectOrderForUser).toHaveBeenCalledWith(
        'user-1',
        createOrder({ active: [2, 1, 3] }),
      )
    })
  })

  test('skips persistence while project pagination is not initialized or order is unchanged', () => {
    const unchangedParams = createParams({
      reconciledProjectOrder: createOrder(),
      storedProjectOrder: createOrder(),
    })
    unchangedParams.anonymousOrderChangedInSessionRef.current = false

    renderHook(() => useProjectOrderLifecycle(unchangedParams))

    expect(unchangedParams.setProjectOrderForUser).not.toHaveBeenCalled()

    const uninitializedParams = createParams({
      projectTotalPages: 0,
      reconciledProjectOrder: createOrder({ active: [2, 1, 3] }),
      storedProjectOrder: createOrder({ active: [1, 2, 3] }),
    })
    uninitializedParams.anonymousOrderChangedInSessionRef.current = false

    renderHook(() => useProjectOrderLifecycle(uninitializedParams))

    expect(uninitializedParams.setProjectOrderForUser).not.toHaveBeenCalled()
  })
})
