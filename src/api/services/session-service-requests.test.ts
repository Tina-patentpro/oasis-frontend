import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { requestLegacySessionDelete } from './session-service-requests'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('requestLegacySessionDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('uses the declared legacy GET endpoint without browser caching', async () => {
    mockApiClient.get.mockResolvedValueOnce(undefined)

    await requestLegacySessionDelete(586)

    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/user/user/workflowdelete/586',
      undefined,
      undefined,
      { cache: 'no-store' },
    )
    expect(mockApiClient.delete).not.toHaveBeenCalled()
  })
})
