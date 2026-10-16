import { describe, expect, test } from '@jest/globals'

import type { Session } from '@/types/api'

import {
  buildAssociateProjectRefreshTargets,
  buildDissociateProjectRefreshTargets,
} from './session-association-refresh'

function createSession(projectId?: number): Session {
  return {
    id: 1,
    userId: 1,
    title: '待关联会话',
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    projectId,
  }
}

describe('session association refresh targets', () => {
  test('refreshes standalone history and target project when associating an independent session', () => {
    expect(buildAssociateProjectRefreshTargets(createSession(), 10)).toEqual([
      { type: 'independent' },
      { type: 'project', projectId: 10 },
    ])
  })

  test('refreshes old and new projects when transferring an associated session', () => {
    expect(buildAssociateProjectRefreshTargets(createSession(8), 10)).toEqual([
      { type: 'project', projectId: 8 },
      { type: 'project', projectId: 10 },
    ])
  })

  test('does not duplicate project refresh when associating to the same project', () => {
    expect(buildAssociateProjectRefreshTargets(createSession(10), 10)).toEqual([
      { type: 'project', projectId: 10 },
    ])
  })

  test('refreshes standalone history and source project when dissociating an associated session', () => {
    expect(buildDissociateProjectRefreshTargets(createSession(10))).toEqual([
      { type: 'independent' },
      { type: 'project', projectId: 10 },
    ])
  })

  test('refreshes only standalone history when dissociating a session without project id', () => {
    expect(buildDissociateProjectRefreshTargets(createSession())).toEqual([{ type: 'independent' }])
  })
})
