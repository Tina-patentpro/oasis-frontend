import { apiClient } from '../client'

interface PerformanceRequestOptions {
  signal?: AbortSignal
}

interface PerformanceRangeParams {
  from?: string
  to?: string
}

interface PerformanceRecordsParams extends PerformanceRangeParams {
  page?: number
  pageSize?: number
  metric?: string
  route?: string
}

interface PerformanceStatisticsParams extends PerformanceRangeParams {
  metric?: string
  route?: string
}

interface SlowestPagesParams extends PerformanceRangeParams {
  limit?: number
}

interface PerformanceMetricsPayload {
  metrics: {
    FCP: number
    LCP: number
    TTFB: number
    CLS: number
    FID: number
  }
  grade: 'excellent' | 'good' | 'fair' | 'poor'
  url: string
}

interface PerformanceApiResponse {
  success: boolean
  data?: Record<string, unknown>
}

class PerformanceService {
  async submitPerformanceMetrics(
    payload: PerformanceMetricsPayload,
    options?: PerformanceRequestOptions,
  ): Promise<PerformanceApiResponse> {
    return apiClient.post<PerformanceApiResponse, PerformanceMetricsPayload>(
      '/api/performance/metrics',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async getPerformanceRecords(
    params: PerformanceRecordsParams = {},
    options?: PerformanceRequestOptions,
  ): Promise<PerformanceApiResponse> {
    return apiClient.get<PerformanceApiResponse>('/api/performance/records', params, undefined, {
      signal: options?.signal,
    })
  }

  async getPerformanceStatistics(
    params: PerformanceStatisticsParams = {},
    options?: PerformanceRequestOptions,
  ): Promise<PerformanceApiResponse> {
    return apiClient.get<PerformanceApiResponse>('/api/performance/statistics', params, undefined, {
      signal: options?.signal,
    })
  }

  async getSlowestPages(
    params: SlowestPagesParams = {},
    options?: PerformanceRequestOptions,
  ): Promise<PerformanceApiResponse> {
    return apiClient.get<PerformanceApiResponse>(
      '/api/performance/slowest-pages',
      params,
      undefined,
      { signal: options?.signal },
    )
  }

  async cleanupExpiredData(options?: PerformanceRequestOptions): Promise<PerformanceApiResponse> {
    return apiClient.delete<PerformanceApiResponse>('/api/performance/cleanup', undefined, {
      signal: options?.signal,
    })
  }
}

export const performanceService = new PerformanceService()
