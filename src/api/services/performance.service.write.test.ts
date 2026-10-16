import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { performanceService } from './performance.service'

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('performanceService current performance write endpoints', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  test('submitPerformanceMetrics calls current performance metrics endpoint with payload', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'perf-1' } })

    const payload = {
      metrics: {
        FCP: 1200,
        LCP: 2500,
        TTFB: 300,
        CLS: 0.05,
        FID: 50,
      },
      grade: 'good' as const,
      url: 'https://example.com/page',
    }

    await performanceService.submitPerformanceMetrics(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/performance/metrics', payload, undefined, {
      signal: undefined,
    })
  })
})
