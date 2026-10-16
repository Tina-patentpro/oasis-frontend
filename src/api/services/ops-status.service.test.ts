import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { opsStatusService } from './ops-status.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('opsStatusService current contract endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  test('getHealthStatus calls health endpoint', async () => {
    mockGet.mockResolvedValue({
      status: 'healthy',
      timestamp: '2026-06-29T00:00:00.000Z',
      services: {
        api: 'healthy',
      },
      uptime: 100,
      version: '1.0.4',
    })

    await opsStatusService.getHealthStatus()

    expect(mockGet).toHaveBeenCalledWith('/api/ops/health', undefined, undefined, {
      signal: undefined,
    })
  })

  test('reportStatus calls status report endpoint', async () => {
    const payload = {
      system_status: {
        status: 'healthy' as const,
        timestamp: '2026-06-29T00:00:00.000Z',
        uptime: 100,
        version: '1.0.4',
        environment: 'production' as const,
      },
    }
    mockPost.mockResolvedValue({
      response: {
        status: 'success',
        message: 'Data collected successfully',
        timestamp: '2026-06-29T00:00:00.000Z',
        request_id: 'req_1',
      },
    })

    await opsStatusService.reportStatus(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/ops/status', payload, undefined, {
      signal: undefined,
    })
  })
})
