import { describe, expect, test } from '@jest/globals'

import type { ProjectSessionPageState } from './session-loading'
import { buildProjectPreloadPlan } from './project-preload'

function createState(overrides: Partial<ProjectSessionPageState> = {}): ProjectSessionPageState {
  return {
    page: 0,
    total: 0,
    totalPages: 0,
    isLoading: false,
    initialized: false,
    loadingMode: null,
    ...overrides,
  }
}

describe('workspace sidebar project preload plan', () => {
  test('preloads active projects that are not initialized, not loading and not attempted', () => {
    expect(
      buildProjectPreloadPlan({
        activeProjectIds: [1, 2, 3, 4],
        projectSessionPageState: {
          1: createState({ initialized: true }),
          2: createState({ isLoading: true }),
          3: createState(),
        },
        attemptedProjectIds: new Set([4]),
      }),
    ).toEqual({
      pendingProjectIds: [3],
      lanePhase: 'start',
    })
  })

  test('marks lane as start when nothing is pending but an active project is loading', () => {
    expect(
      buildProjectPreloadPlan({
        activeProjectIds: [1],
        projectSessionPageState: {
          1: createState({ isLoading: true }),
        },
        attemptedProjectIds: new Set(),
      }),
    ).toEqual({
      pendingProjectIds: [],
      lanePhase: 'start',
    })
  })

  test('marks lane as ready when no project is pending or loading', () => {
    expect(
      buildProjectPreloadPlan({
        activeProjectIds: [1, 2],
        projectSessionPageState: {
          1: createState({ initialized: true }),
          2: createState({ initialized: true }),
        },
        attemptedProjectIds: new Set(),
      }),
    ).toEqual({
      pendingProjectIds: [],
      lanePhase: 'ready',
    })
  })

  test('treats missing state as preload pending', () => {
    expect(
      buildProjectPreloadPlan({
        activeProjectIds: [99],
        projectSessionPageState: {},
        attemptedProjectIds: new Set(),
      }),
    ).toEqual({
      pendingProjectIds: [99],
      lanePhase: 'start',
    })
  })
})
