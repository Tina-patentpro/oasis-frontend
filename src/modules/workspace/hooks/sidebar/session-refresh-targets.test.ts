import { describe, expect, test } from '@jest/globals'

import type { ProjectSessionPageState } from './session-loading'
import {
  getInitializedProjectSessionIds,
  normalizeRefreshFolderId,
} from './session-refresh-targets'

function createState(initialized: boolean): ProjectSessionPageState {
  return {
    page: initialized ? 1 : 0,
    total: initialized ? 1 : 0,
    totalPages: initialized ? 1 : 0,
    isLoading: false,
    initialized,
    loadingMode: null,
  }
}

describe('session refresh targets', () => {
  test('returns only initialized project session ids in numeric order of object entries', () => {
    expect(
      getInitializedProjectSessionIds({
        10: createState(true),
        20: createState(false),
        30: createState(true),
      }),
    ).toEqual([10, 30])
  })

  test('normalizes missing and invalid folder ids to standalone history', () => {
    expect(normalizeRefreshFolderId(undefined)).toBe(0)
    expect(normalizeRefreshFolderId(null)).toBe(0)
    expect(normalizeRefreshFolderId('')).toBe(0)
  })

  test('accepts finite non-negative folder ids', () => {
    expect(normalizeRefreshFolderId(0)).toBe(0)
    expect(normalizeRefreshFolderId('12')).toBe(12)
  })

  test('rejects negative, infinite and non-numeric folder ids', () => {
    expect(normalizeRefreshFolderId(-1)).toBeNull()
    expect(normalizeRefreshFolderId(Number.POSITIVE_INFINITY)).toBeNull()
    expect(normalizeRefreshFolderId('abc')).toBeNull()
  })
})
