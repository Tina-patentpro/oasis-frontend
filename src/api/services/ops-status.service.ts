import { apiClient } from '../client'

type OpsHealthStatus = 'healthy' | 'warning' | 'error' | 'maintenance'
type OpsEnvironment = 'development' | 'staging' | 'production'

interface OpsRequestOptions {
  signal?: AbortSignal
}

interface HealthStatusResponse {
  status: OpsHealthStatus
  timestamp: string
  services: Record<string, OpsHealthStatus>
  uptime: number
  version: string
}

interface SystemStatusReport {
  status: OpsHealthStatus
  timestamp: string
  uptime: number
  version: string
  environment: OpsEnvironment
}

interface StatusReportRequest {
  system_status: SystemStatusReport
  services?: Array<Record<string, unknown>>
  database?: Record<string, unknown>
  cache?: Record<string, unknown>
  metrics?: Record<string, unknown>
  errors?: Array<Record<string, unknown>>
  business_metrics?: Record<string, unknown>
  monitoring_config?: Record<string, unknown>
}

interface StatusReportResponse {
  response?: {
    status: 'success' | 'error'
    message: string
    timestamp: string
    request_id: string
  }
  data?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

class OpsStatusService {
  async getHealthStatus(options?: OpsRequestOptions): Promise<HealthStatusResponse> {
    return apiClient.get<HealthStatusResponse>('/api/ops/health', undefined, undefined, {
      signal: options?.signal,
    })
  }

  async reportStatus(
    payload: StatusReportRequest,
    options?: OpsRequestOptions,
  ): Promise<StatusReportResponse> {
    return apiClient.post<StatusReportResponse>('/api/ops/status', payload, undefined, {
      signal: options?.signal,
    })
  }
}

export const opsStatusService = new OpsStatusService()
