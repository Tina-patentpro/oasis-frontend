import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { utilitiesService } from './utilities.service'

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('utilitiesService current data export endpoint', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  test('exportUserData calls current personal data export endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { taskId: 'data-export-1' } })

    const payload = {
      format: 'zip' as const,
      maskSensitive: true,
    }

    await utilitiesService.exportUserData(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/utilities/export/data', payload, undefined, {
      signal: undefined,
    })
  })
})
