import { describe, expect, jest, test } from '@jest/globals'

import type { Project } from '@/types/api'

jest.mock('@/constants', () => ({
  TABS: [] as Array<{ k: string; t: string; tools: string[] }>,
}))

import {
  applyProjectOrder,
  areProjectOrdersEqual,
  canPromoteAnonymousProjectOrder,
  getProjectOrderUserKey,
  reconcileProjectOrder,
  reorderProjectIds,
  reorderProjectOrderByStatus,
  shouldPersistReconciledProjectOrder,
  shouldPromoteAnonymousProjectOrder,
} from './filtering'

function createProject(id: number, status: 'active' | 'archived'): Project {
  return {
    id,
    userId: 1,
    name: `项目-${id}`,
    status,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('sidebar filtering project order helpers', () => {
  test('reconcileProjectOrder keeps known ids and appends new ids by status', () => {
    const projects: Project[] = [
      createProject(2, 'active'),
      createProject(1, 'active'),
      createProject(4, 'archived'),
      createProject(3, 'archived'),
    ]

    const next = reconcileProjectOrder(projects, {
      active: [1, 99, 2],
      archived: [3],
    })

    expect(next).toEqual({
      active: [1, 2],
      archived: [3, 4],
    })
  })

  test('applyProjectOrder sorts active and archived projects by stored order', () => {
    const projects: Project[] = [
      createProject(1, 'active'),
      createProject(3, 'archived'),
      createProject(2, 'active'),
      createProject(4, 'archived'),
    ]

    const sorted = applyProjectOrder(projects, {
      active: [2, 1],
      archived: [4, 3],
    })

    expect(sorted.map((item) => item.id)).toEqual([2, 1, 4, 3])
  })

  test('reorderProjectOrderByStatus only changes current status list', () => {
    const next = reorderProjectOrderByStatus(
      {
        active: [1, 2, 3],
        archived: [4, 5],
      },
      'active',
      1,
      3,
    )

    expect(next).toEqual({
      active: [2, 3, 1],
      archived: [4, 5],
    })
  })

  test('reorderProjectIds returns original order when source or target is missing', () => {
    expect(reorderProjectIds([1, 2, 3], 7, 2)).toEqual([1, 2, 3])
    expect(reorderProjectIds([1, 2, 3], 1, 9)).toEqual([1, 2, 3])
  })

  test('areProjectOrdersEqual treats null and empty order as equal', () => {
    expect(areProjectOrdersEqual(null, { active: [], archived: [] })).toBe(true)
    expect(
      areProjectOrdersEqual({ active: [1], archived: [] }, { active: [1], archived: [] }),
    ).toBe(true)
    expect(
      areProjectOrdersEqual({ active: [1], archived: [] }, { active: [], archived: [1] }),
    ).toBe(false)
  })

  test('getProjectOrderUserKey keeps numeric user id even when it is 0', () => {
    expect(getProjectOrderUserKey(0)).toBe('user-0')
    expect(getProjectOrderUserKey(42)).toBe('user-42')
    expect(getProjectOrderUserKey(null)).toBe('user-anonymous')
  })

  test('canPromoteAnonymousProjectOrder promotes when anonymous order has data and differs from user order', () => {
    expect(
      canPromoteAnonymousProjectOrder({
        userOrder: null,
        anonymousOrder: { active: [3, 2, 1], archived: [] },
      }),
    ).toBe(true)

    expect(
      canPromoteAnonymousProjectOrder({
        userOrder: { active: [1, 2, 3], archived: [] },
        anonymousOrder: { active: [3, 2, 1], archived: [] },
      }),
    ).toBe(true)

    expect(
      canPromoteAnonymousProjectOrder({
        userOrder: { active: [3, 2, 1], archived: [] },
        anonymousOrder: { active: [3, 2, 1], archived: [] },
      }),
    ).toBe(false)

    expect(
      canPromoteAnonymousProjectOrder({
        userOrder: null,
        anonymousOrder: { active: [], archived: [] },
      }),
    ).toBe(false)
  })

  test('shouldPromoteAnonymousProjectOrder blocks migration for cross-account relogin when anonymous order was not changed in current session', () => {
    // Simulate: account A used app previously and left anonymous order in storage.
    // Account B logs in later in another session. We must not migrate A's anonymous order to B.
    expect(
      shouldPromoteAnonymousProjectOrder({
        switchedFromAnonymousToUser: true,
        anonymousOrderChangedInSession: false,
        userOrder: null,
        anonymousOrder: { active: [9, 8, 7], archived: [] },
      }),
    ).toBe(false)

    // Same-session recovery: order changed while key was anonymous, then user id becomes available.
    expect(
      shouldPromoteAnonymousProjectOrder({
        switchedFromAnonymousToUser: true,
        anonymousOrderChangedInSession: true,
        userOrder: { active: [1, 2, 3], archived: [] },
        anonymousOrder: { active: [3, 2, 1], archived: [] },
      }),
    ).toBe(true)
  })

  test('shouldPersistReconciledProjectOrder skips sync while project list is still loading to avoid clearing stored order', () => {
    expect(
      shouldPersistReconciledProjectOrder({
        projectTotalPages: 0,
        projectTotal: 0,
        rawProjectCount: 0,
      }),
    ).toBe(false)

    expect(
      shouldPersistReconciledProjectOrder({
        projectTotalPages: 1,
        projectTotal: 3,
        rawProjectCount: 0,
      }),
    ).toBe(false)

    expect(
      shouldPersistReconciledProjectOrder({
        projectTotalPages: 1,
        projectTotal: 0,
        rawProjectCount: 0,
      }),
    ).toBe(true)

    expect(
      shouldPersistReconciledProjectOrder({
        projectTotalPages: 1,
        projectTotal: 3,
        rawProjectCount: 3,
      }),
    ).toBe(true)
  })
})
