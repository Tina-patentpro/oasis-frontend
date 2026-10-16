import { apiClient } from '../client'

interface UsageRequestOptions {
  signal?: AbortSignal
}

interface UsageRangeParams {
  from?: string
  to?: string
}

interface UsageSummaryParams extends UsageRangeParams {
  granularity?: string
}

interface UsageBreakdownParams extends UsageRangeParams {
  dimension?: string
}

interface TopUsageUsersParams extends UsageRangeParams {
  limit?: number
}

interface UsageAnomaliesParams extends UsageRangeParams {
  severity?: string
  status?: string
}

interface ExportUsageDataPayload {
  range: '7d' | '30d' | '90d'
  format: 'csv' | 'xlsx'
  metrics?: string[]
}

interface UsageApiResponse {
  success: boolean
  data?: Record<string, unknown>
}

class UsageInsightsService {
  async getUsageSummary(
    params: UsageSummaryParams = {},
    options?: UsageRequestOptions,
  ): Promise<UsageApiResponse> {
    return apiClient.get<UsageApiResponse>('/api/usage/summary', params, undefined, {
      signal: options?.signal,
    })
  }

  async getUsageBreakdown(
    params: UsageBreakdownParams = {},
    options?: UsageRequestOptions,
  ): Promise<UsageApiResponse> {
    return apiClient.get<UsageApiResponse>('/api/usage/breakdown', params, undefined, {
      signal: options?.signal,
    })
  }

  async getTopUsageUsers(
    params: TopUsageUsersParams = {},
    options?: UsageRequestOptions,
  ): Promise<UsageApiResponse> {
    return apiClient.get<UsageApiResponse>('/api/usage/users/top', params, undefined, {
      signal: options?.signal,
    })
  }

  async getUsageAnomalies(
    params: UsageAnomaliesParams = {},
    options?: UsageRequestOptions,
  ): Promise<UsageApiResponse> {
    return apiClient.get<UsageApiResponse>('/api/usage/anomalies', params, undefined, {
      signal: options?.signal,
    })
  }

  async exportUsageData(
    payload: ExportUsageDataPayload,
    options?: UsageRequestOptions,
  ): Promise<UsageApiResponse> {
    return apiClient.post<UsageApiResponse, ExportUsageDataPayload>(
      '/api/usage/export',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }
}

export const usageInsightsService = new UsageInsightsService()
