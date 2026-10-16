import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { useState } from 'react'

import {
  reduceOptimisticSessionsByFolder,
  type OptimisticSessionsByFolder,
  type SessionTrackingHint,
} from './optimistic-session'
import { useOptimisticSessionExpiry } from './use-optimistic-session-expiry'

function buildSubmittedHint(overrides?: Partial<SessionTrackingHint>): SessionTrackingHint {
  return {
    taskKey: 'task-1',
    folderId: 0,
    title: '生成中的会话',
    toolType: 'workflow',
    submittedAtMs: 1_000,
    phase: 'submitted',
    ...overrides,
  }
}

function buildState(): OptimisticSessionsByFolder {
  return reduceOptimisticSessionsByFolder({}, buildSubmittedHint())
}

describe('useOptimisticSessionExpiry', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(1_000)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  test('removes optimistic sessions once the ttl is reached', async () => {
    const { result } = renderHook(() => {
      const [state, setState] = useState(buildState())
      useOptimisticSessionExpiry({
        optimisticSessionsByFolder: state,
        setOptimisticSessionsByFolder: setState,
        ttlMs: 120_000,
      })
      return state
    })

    expect(result.current[0]).toHaveLength(1)

    await act(async () => {
      jest.advanceTimersByTime(120_001)
      await Promise.resolve()
    })

    expect(result.current).toEqual({})
  })
})
