import { apiClient } from '@/api'

interface WorkflowSummary {
  id: string
  name: string
  category?: string
  description?: string
  icon?: string
  tags?: string[]
  lastExecutionAt?: string
}

interface ListWorkflowsParams {
  page?: number
  pageSize?: number
  search?: string
  categories?: string[]
  includeArchived?: boolean
}

export const listWorkflows = (params?: ListWorkflowsParams) =>
  apiClient.get<import('@/types/api').PaginatedResponse<WorkflowSummary>>('/workflows', params)
