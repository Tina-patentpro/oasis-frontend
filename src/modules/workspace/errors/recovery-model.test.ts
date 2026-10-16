import { describe, expect, test } from '@jest/globals'

import { resolveRecoveryAction } from './recovery-model'

describe('resolveRecoveryAction', () => {
  test('maps 401 to relogin', () => {
    expect(resolveRecoveryAction({ statusCode: 401 })).toBe('relogin')
  })

  test('maps 5xx to retry', () => {
    expect(resolveRecoveryAction({ statusCode: 503 })).toBe('retry')
  })

  test('maps unknown status to rollback', () => {
    expect(resolveRecoveryAction({ statusCode: undefined })).toBe('rollback')
  })
})
