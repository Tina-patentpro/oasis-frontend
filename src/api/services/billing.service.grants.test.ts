import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { billingService } from './billing.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('billingService grant contract endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  test('listGrants calls current billing grants endpoint with filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          hasMore: false,
        },
        summary: {
          totalCount: 0,
          totalAmount: 0,
          issuedAmount: 0,
          pendingAmount: 0,
          currency: 'CNY',
        },
      },
    })

    await billingService.listGrants({
      recipientId: 'user-123',
      type: 'manual',
      status: 'issued',
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/billing/grants',
      {
        recipientId: 'user-123',
        type: 'manual',
        status: 'issued',
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('createGrant calls current billing grants endpoint', async () => {
    const payload = {
      recipientId: 'user-123',
      type: 'manual' as const,
      amount: 100,
      currency: 'CNY',
      reason: '新用户欢迎奖励',
    }
    mockPost.mockResolvedValue({
      success: true,
      data: {
        id: 'grant-123',
        ...payload,
        status: 'issued',
        granterId: 'admin-1',
        createdAt: '2026-06-29T00:00:00.000Z',
      },
    })

    await billingService.createGrant(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/billing/grants', payload, undefined, {
      signal: undefined,
    })
  })
})
