import type {
  CreateOrderResponse,
  OrderQueryResponse,
  RechargeConfig,
  RechargePackage,
  RechargeRequest,
  RechargeListResponse,
  RunningWaterListParams,
  RunningWaterListResponse,
} from '@/types/api'

import { apiClient } from '../client'
import { isRecord } from '../validation'

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFlag01(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1
}

function readDirectOrNestedPayload<T>(
  response: unknown,
  guard: (value: unknown) => value is T,
): T | null {
  if (guard(response)) {
    return response
  }

  if (!isRecord(response)) {
    return null
  }

  const nested = response['data']
  return guard(nested) ? nested : null
}

function isCreateOrderResponse(value: unknown): value is CreateOrderResponse {
  return (
    isRecord(value) &&
    typeof value['code_url'] === 'string' &&
    typeof value['out_trade_no'] === 'string' &&
    typeof value['message'] === 'string'
  )
}

function isRechargeConfig(value: unknown): value is RechargeConfig {
  return (
    isRecord(value) &&
    isNumber(value['id']) &&
    isNumber(value['min_amount']) &&
    isNumber(value['max_amount']) &&
    isFlag01(value['allow_decimal']) &&
    isNumber(value['min_bonus_eligible_amount']) &&
    isFlag01(value['enable_bonus']) &&
    isFlag01(value['is_enabled']) &&
    isNumber(value['rate']) &&
    typeof value['updated_at'] === 'string'
  )
}

function isRunningWaterListResponse(value: unknown): value is RunningWaterListResponse {
  return isRecord(value) && isNumber(value['total']) && Array.isArray(value['items'])
}

function isRechargeListResponse(value: unknown): value is RechargeListResponse {
  return isRecord(value) && isNumber(value['total']) && Array.isArray(value['items'])
}

/**
 * RechargePackage 关键字段校验。
 * 后端套餐项字段较多，这里只校验最关键的 id 与 name，
 * 缺失则视为无效项过滤掉，避免脏数据进入 UI（A-5）。
 */
function isRechargePackageLike(value: unknown): value is RechargePackage {
  return isRecord(value) && isNumber(value['id']) && typeof value['name'] === 'string'
}

type GrantType = 'manual' | 'automatic' | 'compensation' | 'referral' | 'activity'
type GrantStatus = 'pending' | 'approved' | 'issued' | 'revoked' | 'expired'

interface GrantListParams {
  recipientId?: string
  granterId?: string
  type?: GrantType
  status?: GrantStatus
  policyId?: string
  from?: string
  to?: string
  expiresFrom?: string
  expiresTo?: string
  amountMin?: number
  amountMax?: number
  currency?: string
  sortBy?: 'createdAt' | 'amount' | 'expiresAt' | 'status'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

interface GrantSummary {
  id: string
  type: GrantType
  amount: number
  currency: string
  status: GrantStatus
  recipientId: string
  granterId: string
  policyId?: string
  reason?: string
  createdAt: string
}

interface GrantPagination {
  page?: number
  pageSize?: number
  total?: number
  hasMore?: boolean
}

interface GrantsSummary {
  totalCount?: number
  totalAmount?: number
  issuedAmount?: number
  pendingAmount?: number
  currency?: string
}

interface GrantListResponse {
  success: boolean
  data?: {
    items?: GrantSummary[]
    pagination?: GrantPagination
    summary?: GrantsSummary
  }
}

interface CreateGrantParams {
  recipientId: string
  type: GrantType
  amount: number
  currency: string
  reason: string
  description?: string
  expiresAt?: string
  policyId?: string
  metadata?: Record<string, unknown>
}

interface GrantDetail extends GrantSummary {
  description?: string
  recipient?: Record<string, unknown>
  granter?: Record<string, unknown>
  policy?: Record<string, unknown>
  approvalHistory?: Array<Record<string, unknown>>
  auditLogs?: Array<Record<string, unknown>>
  metadata?: Record<string, unknown>
  updatedAt?: string
}

interface GrantDetailResponse {
  success: boolean
  data?: GrantDetail
}

interface BillingSummaryResponse {
  success: boolean
  data?: Record<string, unknown>
}

interface BillingUsageParams {
  from?: string
  to?: string
  granularity?: string
}

interface BillingUsageResponse {
  success: boolean
  data?: Record<string, unknown>
}

interface BillingTransactionListParams {
  type?: string
  status?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

interface BillingTransactionListResponse {
  success: boolean
  data?: {
    items?: Array<Record<string, unknown>>
    pagination?: {
      page?: number
      pageSize?: number
      total?: number
      hasMore?: boolean
    }
    summary?: Record<string, unknown>
  }
}

interface PricingPlanListResponse {
  success: boolean
  data?: Array<Record<string, unknown>>
}

interface TopUpOrderResponse {
  success: boolean
  data?: Record<string, unknown>
}

class BillingService {
  async listGrants(
    params: GrantListParams = {},
    options?: { signal?: AbortSignal },
  ): Promise<GrantListResponse> {
    return apiClient.get<GrantListResponse>('/api/billing/grants', params, undefined, {
      signal: options?.signal,
    })
  }

  async createGrant(
    params: CreateGrantParams,
    options?: { signal?: AbortSignal },
  ): Promise<GrantDetailResponse> {
    return apiClient.post<GrantDetailResponse>('/api/billing/grants', params, undefined, {
      signal: options?.signal,
    })
  }

  async getBillingSummary(options?: { signal?: AbortSignal }): Promise<BillingSummaryResponse> {
    return apiClient.get<BillingSummaryResponse>('/api/billing/summary', undefined, undefined, {
      signal: options?.signal,
    })
  }

  async getBillingUsage(
    params: BillingUsageParams = {},
    options?: { signal?: AbortSignal },
  ): Promise<BillingUsageResponse> {
    return apiClient.get<BillingUsageResponse>('/api/billing/usage', params, undefined, {
      signal: options?.signal,
    })
  }

  async listBillingTransactions(
    params: BillingTransactionListParams = {},
    options?: { signal?: AbortSignal },
  ): Promise<BillingTransactionListResponse> {
    return apiClient.get<BillingTransactionListResponse>(
      '/api/billing/transactions',
      params,
      undefined,
      { signal: options?.signal },
    )
  }

  async listPricingPlans(options?: { signal?: AbortSignal }): Promise<PricingPlanListResponse> {
    return apiClient.get<PricingPlanListResponse>('/api/billing/pricing', undefined, undefined, {
      signal: options?.signal,
    })
  }

  async getTopUpOrder(
    orderId: string,
    options?: { signal?: AbortSignal },
  ): Promise<TopUpOrderResponse> {
    return apiClient.get<TopUpOrderResponse>(
      `/api/billing/top-ups/${orderId}`,
      undefined,
      undefined,
      { signal: options?.signal },
    )
  }

  async getRechargePackages(): Promise<RechargePackage[]> {
    const response = await apiClient.get<unknown>('/recharge/list')

    let candidates: unknown[] = []
    if (Array.isArray(response)) {
      candidates = response
    } else if (isRecord(response)) {
      const nested = response['data']
      if (Array.isArray(nested)) {
        candidates = nested
      }
    }

    // 校验关键字段，过滤掉后端返回的无效项（缺 id 或 name），避免脏数据进入 UI（A-5）
    return candidates.filter(isRechargePackageLike)
  }

  async createOrder(data: RechargeRequest): Promise<CreateOrderResponse> {
    const response = await apiClient.post<unknown, RechargeRequest>('/recharge/createorder', data)
    const orderResponse = readDirectOrNestedPayload(response, isCreateOrderResponse)

    if (orderResponse) {
      return orderResponse
    }

    throw new Error('无效的订单响应')
  }

  async queryOrderStatus(orderNo: string): Promise<OrderQueryResponse> {
    const response = await apiClient.get<{ code: number; message: string; data: 0 | 1 | 2 }>(
      `/recharge/orderquery?order_no=${orderNo}`,
    )

    // 直接返回整个响应，包含code、message和data
    return response
  }

  // getTransactions 和 getBalance 已移除
  // /user/transactions 和 /user/balance 接口返回 404
  // 请使用 getRunningWaterList 获取流水记录
  // 用户余额请从 userService.getUserDetail() 获取

  async getRechargeConfig(): Promise<RechargeConfig> {
    const response = await apiClient.get<unknown>('/recharge/rechargeconfig')
    const config = readDirectOrNestedPayload(response, isRechargeConfig)

    if (config) {
      return config
    }

    throw new Error('无效的充值配置响应')
  }

  async getRunningWaterList(params: RunningWaterListParams): Promise<RunningWaterListResponse> {
    const queryParams: Record<string, string | number> = {
      page: params.page,
      limit: params.limit,
    }

    if (params.type) {
      queryParams.type = params.type
    }

    const response = await apiClient.get<unknown>('/user/runningwater/list', queryParams)
    const runningWaterList = readDirectOrNestedPayload(response, isRunningWaterListResponse)

    if (runningWaterList) {
      return runningWaterList
    }

    throw new Error('无效的流水记录响应')
  }

  /**
   * 获取充值记录列表
   * 用于 RechargeRecordSection 组件
   */
  async getRechargeList(page: number, limit: number): Promise<RechargeListResponse> {
    // 按 API接口文档-用户端.md 基准：充值记录接口为 GET /user/rechargelist
    const response = await apiClient.get<unknown>('/user/rechargelist', { page, limit })
    const rechargeList = readDirectOrNestedPayload(response, isRechargeListResponse)

    if (rechargeList) {
      return rechargeList
    }

    // 返回空结果
    return { items: [], total: 0 }
  }
}

export const billingService = new BillingService()
