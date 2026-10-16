import { describe, expect, test } from '@jest/globals'

import { createRecoveryQueue } from './recovery-queue'

describe('recovery queue', () => {
  test('retries failed operation in FIFO order', async () => {
    const queue = createRecoveryQueue()
    queue.enqueue({
      id: 'op-1',
      run: async () => true,
    })

    const result = await queue.retryNext()
    expect(result?.id).toBe('op-1')
  })

  test('returns null when queue is empty', async () => {
    const queue = createRecoveryQueue()
    const result = await queue.retryNext()
    expect(result).toBeNull()
  })
})
