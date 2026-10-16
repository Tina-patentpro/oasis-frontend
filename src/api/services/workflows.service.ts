import { apiClient } from '../client'

interface WorkflowsRequestOptions {
  signal?: AbortSignal
}

interface GetWorkflowsParams {
  category?: string
  keyword?: string
  page?: number
  pageSize?: number
}

interface GetWorkflowExecutionResultParams {
  includeInputs?: boolean
  includeSensitive?: boolean
}

interface GetWorkflowExecutionsParams {
  page?: number
  pageSize?: number
  projectId?: string
  status?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  from?: string
  to?: string
  includeInputsSummary?: boolean
}

interface GetWorkflowPresetsParams {
  sourceWorkflowId?: string
  targetWorkflowId?: string
}

interface WorkflowExecutionPayload {
  inputs: Record<string, unknown>
  attachments?: Array<{
    field: string
    fileId: string
    fileName?: string
    mimeType?: string
  }>
  projectId?: string
  presetId?: string
  metadata?: Record<string, unknown>
}

interface WorkflowChainStepPayload {
  workflowId: string
  mapping?: Array<{
    targetField: string
    source: string
    transform?: string
  }>
}

interface CreateWorkflowChainPayload {
  name: string
  description?: string
  visibility?: 'private' | 'team' | 'global'
  steps: WorkflowChainStepPayload[]
}

interface WorkflowsApiResponse {
  success: boolean
  data?: Record<string, unknown> | Array<Record<string, unknown>>
}

class WorkflowsService {
  async getWorkflows(
    params: GetWorkflowsParams = {},
    options?: WorkflowsRequestOptions,
  ): Promise<WorkflowsApiResponse> {
    return apiClient.get<WorkflowsApiResponse>('/api/workflows', params, undefined, {
      signal: options?.signal,
    })
  }

  async getWorkflowDetail(
    workflowId: string,
    options?: WorkflowsRequestOptions,
  ): Promise<WorkflowsApiResponse> {
    return apiClient.get<WorkflowsApiResponse>(
      `/api/workflows/${workflowId}`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async executeWorkflow(
    workflowId: string,
    payload: WorkflowExecutionPayload,
    options?: WorkflowsRequestOptions,
  ): Promise<WorkflowsApiResponse> {
    return apiClient.post<WorkflowsApiResponse, WorkflowExecutionPayload>(
      `/api/workflows/${workflowId}/execute`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async getWorkflowExecutionResult(
    executionId: string,
    params: GetWorkflowExecutionResultParams = {},
    options?: WorkflowsRequestOptions,
  ): Promise<WorkflowsApiResponse> {
    return apiClient.get<WorkflowsApiResponse>(
      `/api/workflow-executions/${executionId}`,
      params,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getWorkflowExecutionProgress(
    executionId: string,
    options?: WorkflowsRequestOptions,
  ): Promise<WorkflowsApiResponse> {
    return apiClient.get<WorkflowsApiResponse>(
      `/api/workflow-executions/${executionId}/progress`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getWorkflowExecutions(
    workflowId: string,
    params: GetWorkflowExecutionsParams = {},
    options?: WorkflowsRequestOptions,
  ): Promise<WorkflowsApiResponse> {
    return apiClient.get<WorkflowsApiResponse>(
      `/api/workflows/${workflowId}/executions`,
      params,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getWorkflowPresets(
    params: GetWorkflowPresetsParams = {},
    options?: WorkflowsRequestOptions,
  ): Promise<WorkflowsApiResponse> {
    return apiClient.get<WorkflowsApiResponse>('/api/workflow-presets', params, undefined, {
      signal: options?.signal,
    })
  }

  async createWorkflowChain(
    payload: CreateWorkflowChainPayload,
    options?: WorkflowsRequestOptions,
  ): Promise<WorkflowsApiResponse> {
    return apiClient.post<WorkflowsApiResponse, CreateWorkflowChainPayload>(
      '/api/workflow-chains',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }
}

export const workflowsService = new WorkflowsService()
