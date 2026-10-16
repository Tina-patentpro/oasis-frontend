import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { usageInsightsService } from './usage-insights.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('usageInsightsService read-only usage endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('getUsageSummary calls usage summary endpoint with range filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: { totalTokens: 100 } })

    await usageInsightsService.getUsageSummary({
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-29T00:00:00.000Z',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/usage/summary',
      {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-29T00:00:00.000Z',
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getUsageBreakdown calls usage breakdown endpoint with dimension', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await usageInsightsService.getUsageBreakdown({
      dimension: 'workflow',
      from: '2026-06-01T00:00:00.000Z',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/usage/breakdown',
      {
        dimension: 'workflow',
        from: '2026-06-01T00:00:00.000Z',
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getTopUsageUsers calls top users endpoint with limit', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await usageInsightsService.getTopUsageUsers({ limit: 10 })

    expect(mockGet).toHaveBeenCalledWith('/api/usage/users/top', { limit: 10 }, undefined, {
      signal: undefined,
    })
  })

  test('getUsageAnomalies calls usage anomalies endpoint with severity', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await usageInsightsService.getUsageAnomalies({ severity: 'high' })

    expect(mockGet).toHaveBeenCalledWith('/api/usage/anomalies', { severity: 'high' }, undefined, {
      signal: undefined,
    })
  })
})
