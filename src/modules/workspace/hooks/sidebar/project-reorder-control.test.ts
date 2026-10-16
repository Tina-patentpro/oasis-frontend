import { describe, expect, test } from '@jest/globals'

import {
  buildProjectReorderUpdate,
  isProjectReorderEnabled,
  type ProjectOrderState,
} from './project-reorder-control'

function createOrder(overrides: Partial<ProjectOrderState> = {}): ProjectOrderState {
  return {
    active: [1, 2, 3],
    archived: [10, 20],
    ...overrides,
  }
}

describe('workspace sidebar project reorder control', () => {
  test('enables reorder only for fully loaded active projects without search', () => {
    expect(
      isProjectReorderEnabled({
        isProjectsLoading: false,
        projectListLength: 3,
        projectPaginationTotal: 3,
        projectSearchKeyword: '',
        projectStatusFilter: 'active',
      }),
    ).toBe(true)

    expect(
      isProjectReorderEnabled({
        isProjectsLoading: true,
        projectListLength: 3,
        projectPaginationTotal: 3,
        projectSearchKeyword: '',
        projectStatusFilter: 'active',
      }),
    ).toBe(false)
    expect(
      isProjectReorderEnabled({
        isProjectsLoading: false,
        projectListLength: 2,
        projectPaginationTotal: 3,
        projectSearchKeyword: '',
        projectStatusFilter: 'active',
      }),
    ).toBe(false)
    expect(
      isProjectReorderEnabled({
        isProjectsLoading: false,
        projectListLength: 3,
        projectPaginationTotal: 3,
        projectSearchKeyword: '专利',
        projectStatusFilter: 'active',
      }),
    ).toBe(false)
    expect(
      isProjectReorderEnabled({
        isProjectsLoading: false,
        projectListLength: 3,
        projectPaginationTotal: 3,
        projectSearchKeyword: '',
        projectStatusFilter: 'archived',
      }),
    ).toBe(false)
  })

  test('returns null when reorder is disabled or the dragged project is unchanged', () => {
    expect(
      buildProjectReorderUpdate({
        anonymousProjectOrderKey: 'user-anonymous',
        currentUserProjectOrderKey: 'user-1',
        projectReorderEnabled: false,
        projectStatusFilter: 'active',
        reconciledProjectOrder: createOrder(),
        sourceProjectId: 1,
        targetProjectId: 2,
      }),
    ).toBeNull()

    expect(
      buildProjectReorderUpdate({
        anonymousProjectOrderKey: 'user-anonymous',
        currentUserProjectOrderKey: 'user-1',
        projectReorderEnabled: true,
        projectStatusFilter: 'active',
        reconciledProjectOrder: createOrder(),
        sourceProjectId: 1,
        targetProjectId: 1,
      }),
    ).toBeNull()
  })

  test('builds the next active project order and leaves archived order unchanged', () => {
    expect(
      buildProjectReorderUpdate({
        anonymousProjectOrderKey: 'user-anonymous',
        currentUserProjectOrderKey: 'user-1',
        placement: 'after',
        projectReorderEnabled: true,
        projectStatusFilter: 'active',
        reconciledProjectOrder: createOrder(),
        sourceProjectId: 1,
        targetProjectId: 3,
      }),
    ).toEqual({
      nextOrder: {
        active: [2, 3, 1],
        archived: [10, 20],
      },
      shouldMarkAnonymousOrderChanged: false,
    })
  })

  test('marks anonymous order changes so they can be promoted after login', () => {
    expect(
      buildProjectReorderUpdate({
        anonymousProjectOrderKey: 'user-anonymous',
        currentUserProjectOrderKey: 'user-anonymous',
        placement: 'before',
        projectReorderEnabled: true,
        projectStatusFilter: 'active',
        reconciledProjectOrder: createOrder(),
        sourceProjectId: 3,
        targetProjectId: 1,
      }),
    ).toEqual({
      nextOrder: {
        active: [3, 1, 2],
        archived: [10, 20],
      },
      shouldMarkAnonymousOrderChanged: true,
    })
  })
})
