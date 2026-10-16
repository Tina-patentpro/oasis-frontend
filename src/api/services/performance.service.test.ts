import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { performanceService } from './performance.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('performanceService read-only performance endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('getPerformanceRecords calls performance records endpoint with filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await performanceService.getPerformanceRecords({
      page: 1,
      pageSize: 20,
      from: '2026-06-01T00:00:00.000Z',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/performance/records',
      {
        page: 1,
        pageSize: 20,
        from: '2026-06-01T00:00:00.000Z',
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getPerformanceStatistics calls performance statistics endpoint with range', async () => {
    mockGet.mockResolvedValue({ success: true, data: { averageLoadTime: 120 } })

    await performanceService.getPerformanceStatistics({
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-29T00:00:00.000Z',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/performance/statistics',
      {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-29T00:00:00.000Z',
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getSlowestPages calls slowest pages endpoint with limit', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await performanceService.getSlowestPages({ limit: 10 })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/performance/slowest-pages',
      { limit: 10 },
      undefined,
      { signal: undefined },
    )
  })
})
