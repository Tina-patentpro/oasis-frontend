import { apiClient } from '../client'

interface DataDeletionRequestOptions {
  signal?: AbortSignal
}

interface ListDeletionRequestsParams {
  requesterId?: string
  targetId?: string
  type?: 'account' | 'data' | 'batch'
  status?: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled'
  page?: number
  pageSize?: number
}

interface PaginationParams {
  page?: number
  pageSize?: number
}

interface DataDeletionApiResponse {
  success: boolean
  data?: Record<string, unknown> | Array<Record<string, unknown>>
}

class DataDeletionService {
  async listDeletionRequests(
    params: ListDeletionRequestsParams = {},
    options?: DataDeletionRequestOptions,
  ): Promise<DataDeletionApiResponse> {
    return apiClient.get<DataDeletionApiResponse>(
      '/api/data-deletion/requests',
      params,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getDeletionRequestDetail(
    requestId: string,
    options?: DataDeletionRequestOptions,
  ): Promise<DataDeletionApiResponse> {
    return apiClient.get<DataDeletionApiResponse>(
      `/api/data-deletion/requests/${requestId}`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getDeletionProof(
    requestId: string,
    options?: DataDeletionRequestOptions,
  ): Promise<DataDeletionApiResponse> {
    return apiClient.get<DataDeletionApiResponse>(
      `/api/data-deletion/requests/${requestId}/proof`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async listDeletionPolicies(
    params: PaginationParams = {},
    options?: DataDeletionRequestOptions,
  ): Promise<DataDeletionApiResponse> {
    return apiClient.get<DataDeletionApiResponse>(
      '/api/data-deletion/policies',
      params,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getDeletionAuditLogs(
    params: PaginationParams = {},
    options?: DataDeletionRequestOptions,
  ): Promise<DataDeletionApiResponse> {
    return apiClient.get<DataDeletionApiResponse>('/api/data-deletion/audit', params, undefined, {
      signal: options?.signal,
    })
  }
}

export const dataDeletionService = new DataDeletionService()
