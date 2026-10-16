import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { usageInsightsService } from './usage-insights.service'

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('usageInsightsService current export endpoint', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  test('exportUsageData calls current usage export endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { taskId: 'usage-export-1' } })

    const payload = {
      range: '30d' as const,
      format: 'xlsx' as const,
      metrics: ['tokens', 'runs'],
    }

    await usageInsightsService.exportUsageData(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/usage/export', payload, undefined, {
      signal: undefined,
    })
  })
})
