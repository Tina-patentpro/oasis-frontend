import { beforeEach, describe, expect, test, jest } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

jest.mock('./billing.service', () => ({
  billingService: {},
}))

jest.mock('./referral.service', () => ({
  referralService: {},
}))

import { apiClient } from '../client'
import { cmsService } from './cms.service'

const mockApiGet = apiClient.get as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
  mock: {
    calls: unknown[][]
  }
}

describe('CMSService.getConfigDetail', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  test('uses /apicategories/configdetail endpoint for model preference config', async () => {
    mockApiGet.mockResolvedValue({ data: {} })

    await cmsService.getConfigDetail()

    expect(mockApiGet).toHaveBeenCalledTimes(1)
    const [endpoint] = mockApiGet.mock.calls[0] as [string]
    expect(endpoint).toBe('/apicategories/configdetail')
  })
})
