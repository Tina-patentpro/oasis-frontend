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

describe('billingService read-only billing contract endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('getBillingSummary calls current billing summary endpoint', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        balance: 100,
        currency: 'CNY',
      },
    })

    await billingService.getBillingSummary()

    expect(mockGet).toHaveBeenCalledWith('/api/billing/summary', undefined, undefined, {
      signal: undefined,
    })
  })

  test('getBillingUsage calls current billing usage endpoint with range filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        period: {
          from: '2026-06-01T00:00:00.000Z',
          to: '2026-06-29T00:00:00.000Z',
        },
        items: [],
      },
    })

    await billingService.getBillingUsage({
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-29T00:00:00.000Z',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/billing/usage',
      {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-29T00:00:00.000Z',
      },
      undefined,
      { signal: undefined },
    )
  })

  test('listBillingTransactions calls current billing transactions endpoint with paging', async () => {
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
      },
    })

    await billingService.listBillingTransactions({
      type: 'top_up',
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/billing/transactions',
      {
        type: 'top_up',
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('listPricingPlans calls current billing pricing endpoint', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        {
          planId: 'starter',
          name: 'Starter',
          price: 99,
          currency: 'CNY',
        },
      ],
    })

    await billingService.listPricingPlans()

    expect(mockGet).toHaveBeenCalledWith('/api/billing/pricing', undefined, undefined, {
      signal: undefined,
    })
  })

  test('getTopUpOrder calls current billing top-up order endpoint', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        orderId: 'top-up-001',
        status: 'pending',
        amount: 100,
        currency: 'CNY',
      },
    })

    await billingService.getTopUpOrder('top-up-001')

    expect(mockGet).toHaveBeenCalledWith('/api/billing/top-ups/top-up-001', undefined, undefined, {
      signal: undefined,
    })
  })
})
