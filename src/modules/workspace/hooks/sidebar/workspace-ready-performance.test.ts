import { describe, expect, test } from '@jest/globals'

import {
  buildWorkspaceReadyMark,
  createWorkspaceReadyMarks,
  type WorkspaceReadyMarks,
} from './workspace-ready-performance'

describe('workspace ready performance marks', () => {
  test('marks tabs ready when the first tab has tools', () => {
    expect(
      buildWorkspaceReadyMark({
        marks: createWorkspaceReadyMarks(),
        kind: 'tabs',
        ready: true,
      }),
    ).toEqual({
      marks: {
        tabsReady: true,
        historyReady: false,
        projectReady: false,
      },
      shouldMark: true,
      markName: 'tabs_ready',
    })
  })

  test('does not mark tabs ready before tabs are usable', () => {
    expect(
      buildWorkspaceReadyMark({
        marks: createWorkspaceReadyMarks(),
        kind: 'tabs',
        ready: false,
      }),
    ).toEqual({
      marks: createWorkspaceReadyMarks(),
      shouldMark: false,
      markName: 'tabs_ready',
    })
  })

  test('does not duplicate a mark that was already recorded', () => {
    const marks: WorkspaceReadyMarks = {
      tabsReady: false,
      historyReady: true,
      projectReady: false,
    }

    expect(
      buildWorkspaceReadyMark({
        marks,
        kind: 'history',
        ready: true,
      }),
    ).toEqual({
      marks,
      shouldMark: false,
      markName: 'history_ready',
    })
  })

  test('marks project ready once project loading is complete', () => {
    expect(
      buildWorkspaceReadyMark({
        marks: createWorkspaceReadyMarks(),
        kind: 'project',
        ready: true,
      }),
    ).toEqual({
      marks: {
        tabsReady: false,
        historyReady: false,
        projectReady: true,
      },
      shouldMark: true,
      markName: 'project_ready',
    })
  })
})
