import { describe, expect, test } from '@jest/globals'

import { reduceGenerationState } from './generation-state'

describe('generation state machine', () => {
  test('moves running -> failed on ERROR event', () => {
    const next = reduceGenerationState({ status: 'running' }, { type: 'ERROR' })
    expect(next.status).toBe('failed')
  })

  test('moves idle -> running on START event', () => {
    const next = reduceGenerationState({ status: 'idle' }, { type: 'START' })
    expect(next.status).toBe('running')
  })
})
