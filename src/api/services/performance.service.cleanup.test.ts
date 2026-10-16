import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    delete: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { performanceService } from './performance.service'

const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>

describe('performanceService current performance cleanup endpoints', () => {
  beforeEach(() => {
    mockDelete.mockReset()
  })

  test('cleanupExpiredData calls current expired performance data cleanup endpoint', async () => {
    mockDelete.mockResolvedValue({ success: true, data: { deletedCount: 523 } })

    await performanceService.cleanupExpiredData()

    expect(mockDelete).toHaveBeenCalledWith('/api/performance/cleanup', undefined, {
      signal: undefined,
    })
  })
})
