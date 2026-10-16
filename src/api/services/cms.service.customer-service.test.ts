import { describe, expect, jest, test } from '@jest/globals'

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

import { cmsService } from './cms.service'

describe('CMSService customer service fallback', () => {
  test('uses real project support contact instead of placeholder email', async () => {
    await expect(cmsService.getCustomerServiceInfo()).resolves.toMatchObject({
      email: 'contact@oasisintwrite.com',
      wechat: 'oasis-support',
    })
  })
})
