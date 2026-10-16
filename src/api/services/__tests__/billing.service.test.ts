/**
 * BillingService unit tests
 * Covers: getRechargePackages, createOrder, queryOrderStatus,
 *         getRechargeConfig, getRunningWaterList, getRechargeList.
 */
import { describe, expect, jest, test, beforeEach } from '@jest/globals'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>()
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.mock('@/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

// Import after mocks
import { billingService } from '../billing.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePackage(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: '基础套餐',
    recharge_amount: 50,
    bonus_amount: 5,
    is_recommended: 1,
    sort_order: 0,
    is_active: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    amount: 50,
    bonusAmount: 5,
    recommended: true,
    sortOrder: 0,
    description: '基础充值套餐',
    ...overrides,
  }
}

function makeRechargeConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    min_amount: 10,
    max_amount: 5000,
    allow_decimal: 0,
    min_bonus_eligible_amount: 100,
    enable_bonus: 1,
    is_enabled: 1,
    rate: 40,
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
})

// ---------------------------------------------------------------------------
// getRechargePackages
// ---------------------------------------------------------------------------

describe('BillingService.getRechargePackages', () => {
  test('returns array when API responds with a raw array', async () => {
    const packages = [makePackage(), makePackage({ id: 2, name: '进阶套餐' })]
    mockGet.mockResolvedValueOnce(packages)

    const result = await billingService.getRechargePackages()

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('基础套餐')
    expect(result[1].name).toBe('进阶套餐')
  })

  test('unwraps { data: [...] } envelope', async () => {
    const packages = [makePackage()]
    mockGet.mockResolvedValueOnce({ data: packages })

    const result = await billingService.getRechargePackages()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  test('returns empty array when response has no recognizable data', async () => {
    mockGet.mockResolvedValueOnce({ unexpected: true })

    const result = await billingService.getRechargePackages()

    expect(result).toEqual([])
  })

  test('filters out items missing required id/name fields', async () => {
    // 后端返回了数组，但部分项缺关键字段时，应过滤掉无效项而非整批返回脏数据
    const packages = [
      makePackage(),
      { name: '缺少id的项' }, // 缺 id
      { id: 3 }, // 缺 name
      makePackage({ id: 4, name: '进阶套餐' }),
    ]
    mockGet.mockResolvedValueOnce(packages)

    const result = await billingService.getRechargePackages()

    expect(result).toHaveLength(2)
    expect(result.map((p) => p.id)).toEqual([1, 4])
  })

  test('calls apiClient.get with correct endpoint', async () => {
    mockGet.mockResolvedValueOnce([])

    await billingService.getRechargePackages()

    expect(mockGet).toHaveBeenCalledWith('/recharge/list')
  })
})

// ---------------------------------------------------------------------------
// createOrder
// ---------------------------------------------------------------------------

describe('BillingService.createOrder', () => {
  const orderRequest = { amount: 50, bonus_amount: 5, type: 1 as const }

  test('returns CreateOrderResponse when code_url is present directly', async () => {
    const orderResponse = {
      code_url: 'weixin://wxpay/bizpayurl?pr=abc123',
      out_trade_no: 'ORDER-001',
      message: 'success',
    }
    mockPost.mockResolvedValueOnce(orderResponse)

    const result = await billingService.createOrder(orderRequest)

    expect(result.code_url).toBe('weixin://wxpay/bizpayurl?pr=abc123')
    expect(result.out_trade_no).toBe('ORDER-001')
  })

  test('unwraps { data: {...} } envelope for order response', async () => {
    const inner = {
      code_url: 'weixin://wxpay/bizpayurl?pr=xyz789',
      out_trade_no: 'ORDER-002',
      message: 'ok',
    }
    mockPost.mockResolvedValueOnce({ data: inner })

    const result = await billingService.createOrder(orderRequest)

    expect(result.out_trade_no).toBe('ORDER-002')
  })

  test('throws when response lacks code_url', async () => {
    mockPost.mockResolvedValueOnce({ message: 'something unexpected' })

    await expect(billingService.createOrder(orderRequest)).rejects.toThrow('无效的订单响应')
  })

  test('throws when order response has code_url but misses out_trade_no', async () => {
    mockPost.mockResolvedValueOnce({
      code_url: 'weixin://wxpay/bizpayurl?pr=missing-order-no',
      message: 'ok',
    })

    await expect(billingService.createOrder(orderRequest)).rejects.toThrow('无效的订单响应')
  })

  test('calls apiClient.post with correct endpoint and payload', async () => {
    mockPost.mockResolvedValueOnce({
      code_url: 'http://pay.example.com',
      out_trade_no: 'ORD-1',
      message: 'ok',
    })

    await billingService.createOrder(orderRequest)

    expect(mockPost).toHaveBeenCalledWith('/recharge/createorder', orderRequest)
  })
})

// ---------------------------------------------------------------------------
// queryOrderStatus
// ---------------------------------------------------------------------------

describe('BillingService.queryOrderStatus', () => {
  test('returns order status response from API', async () => {
    mockGet.mockResolvedValueOnce({ code: 0, message: 'ok', data: 1 })

    const result = await billingService.queryOrderStatus('ORDER-001')

    expect(result).toEqual({ code: 0, message: 'ok', data: 1 })
  })

  test('calls apiClient.get with correct URL including order_no', async () => {
    mockGet.mockResolvedValueOnce({ code: 0, message: '', data: 0 })

    await billingService.queryOrderStatus('ORDER-XYZ')

    expect(mockGet).toHaveBeenCalledWith('/recharge/orderquery?order_no=ORDER-XYZ')
  })
})

// ---------------------------------------------------------------------------
// getRechargeConfig
// ---------------------------------------------------------------------------

describe('BillingService.getRechargeConfig', () => {
  test('returns config when min_amount is present directly', async () => {
    const config = makeRechargeConfig()
    mockGet.mockResolvedValueOnce(config)

    const result = await billingService.getRechargeConfig()

    expect(result.min_amount).toBe(10)
    expect(result.max_amount).toBe(5000)
    expect(result.rate).toBe(40)
  })

  test('unwraps { data: {...} } envelope for config', async () => {
    const config = makeRechargeConfig({ min_amount: 20, rate: 30 })
    mockGet.mockResolvedValueOnce({ data: config })

    const result = await billingService.getRechargeConfig()

    expect(result.min_amount).toBe(20)
    expect(result.rate).toBe(30)
  })

  test('throws when response lacks min_amount', async () => {
    mockGet.mockResolvedValueOnce({ unexpected: true })

    await expect(billingService.getRechargeConfig()).rejects.toThrow('无效的充值配置响应')
  })

  test('throws when config response has min_amount but misses required fields', async () => {
    mockGet.mockResolvedValueOnce({ min_amount: 10 })

    await expect(billingService.getRechargeConfig()).rejects.toThrow('无效的充值配置响应')
  })
})

// ---------------------------------------------------------------------------
// getRunningWaterList
// ---------------------------------------------------------------------------

describe('BillingService.getRunningWaterList', () => {
  test('returns response when items is present directly', async () => {
    const response = {
      total: 2,
      items: [
        {
          id: 1,
          uid: 10,
          title: '消费',
          link_id: 0,
          type: 'consumption',
          money: 5,
          balance: 95,
          pm: 0,
          create_time: '2026-03-01',
        },
        {
          id: 2,
          uid: 10,
          title: '充值',
          link_id: 0,
          type: 'topup',
          money: 50,
          balance: 145,
          pm: 1,
          create_time: '2026-03-02',
        },
      ],
    }
    mockGet.mockResolvedValueOnce(response)

    const result = await billingService.getRunningWaterList({ page: 1, limit: 10 })

    expect(result.total).toBe(2)
    expect(result.items).toHaveLength(2)
  })

  test('unwraps { data: {...} } envelope', async () => {
    const inner = { total: 0, items: [] }
    mockGet.mockResolvedValueOnce({ data: inner })

    const result = await billingService.getRunningWaterList({ page: 1, limit: 10 })

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })

  test('includes optional type filter in query params', async () => {
    mockGet.mockResolvedValueOnce({ total: 0, items: [] })

    await billingService.getRunningWaterList({ page: 2, limit: 20, type: 'consumption' })

    expect(mockGet).toHaveBeenCalledWith('/user/runningwater/list', {
      page: 2,
      limit: 20,
      type: 'consumption',
    })
  })

  test('throws when running water response has items but misses total', async () => {
    mockGet.mockResolvedValueOnce({ items: [] })

    await expect(billingService.getRunningWaterList({ page: 1, limit: 10 })).rejects.toThrow(
      '无效的流水记录响应',
    )
  })
})

// ---------------------------------------------------------------------------
// getRechargeList
// ---------------------------------------------------------------------------

describe('BillingService.getRechargeList', () => {
  test('returns recharge list when items is present directly', async () => {
    const response = {
      total: 1,
      items: [
        {
          order_no: 'RCH-001',
          amount: 100,
          bonus_amount: 10,
          pay_time: '2026-03-01T10:00:00Z',
          created_time: '2026-03-01T09:59:00Z',
          user_id: 42,
          user: { id: 42, username: 'tester' },
        },
      ],
    }
    mockGet.mockResolvedValueOnce(response)

    const result = await billingService.getRechargeList(1, 10)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].order_no).toBe('RCH-001')
    expect(result.total).toBe(1)
  })

  test('returns empty result when response is unrecognized', async () => {
    mockGet.mockResolvedValueOnce({ unexpected: true })

    const result = await billingService.getRechargeList(1, 10)

    expect(result).toEqual({ items: [], total: 0 })
  })

  test('returns empty result when recharge list has items but misses total', async () => {
    mockGet.mockResolvedValueOnce({ items: [] })

    const result = await billingService.getRechargeList(1, 10)

    expect(result).toEqual({ items: [], total: 0 })
  })

  test('calls apiClient.get with correct endpoint and pagination', async () => {
    mockGet.mockResolvedValueOnce({ total: 0, items: [] })

    await billingService.getRechargeList(3, 25)

    expect(mockGet).toHaveBeenCalledWith('/user/rechargelist', { page: 3, limit: 25 })
  })
})
