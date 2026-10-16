import { apiClient } from '../client'

interface ProjectsCurrentRequestOptions {
  signal?: AbortSignal
}

interface GetProjectsCurrentParams {
  keyword?: string
  status?: 'active' | 'archived'
  owner?: string
  page?: number
  pageSize?: number
}

interface ListProjectWorkflowsParams {
  status?: string
  page?: number
}

interface PaginationParams {
  page?: number
}

interface CreateProjectPayload {
  name: string
  description?: string
  tags?: string[]
  visibility?: 'private' | 'team' | 'organization'
  owner?: string
  customFields?: Record<string, unknown>
}

interface UpdateProjectPayload {
  name?: string
  description?: string
  status?: 'active' | 'archived'
  tags?: string[]
  owner?: string
  visibility?: 'private' | 'team' | 'organization'
  customFields?: Record<string, unknown>
}

interface ExportProjectPayload {
  format: 'zip' | 'json'
  includePrivateNotes?: boolean
}

interface ProjectsCurrentApiResponse {
  success: boolean
  data?: Record<string, unknown> | Array<Record<string, unknown>>
}

class ProjectsCurrentService {
  async getProjects(
    params: GetProjectsCurrentParams = {},
    options?: ProjectsCurrentRequestOptions,
  ): Promise<ProjectsCurrentApiResponse> {
    return apiClient.get<ProjectsCurrentApiResponse>('/api/projects', params, undefined, {
      signal: options?.signal,
    })
  }

  async getProjectDetail(
    projectId: string,
    options?: ProjectsCurrentRequestOptions,
  ): Promise<ProjectsCurrentApiResponse> {
    return apiClient.get<ProjectsCurrentApiResponse>(
      `/api/projects/${projectId}`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getProjectSummary(
    projectId: string,
    options?: ProjectsCurrentRequestOptions,
  ): Promise<ProjectsCurrentApiResponse> {
    return apiClient.get<ProjectsCurrentApiResponse>(
      `/api/projects/${projectId}/summary`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async createProject(
    payload: CreateProjectPayload,
    options?: ProjectsCurrentRequestOptions,
  ): Promise<ProjectsCurrentApiResponse> {
    return apiClient.post<ProjectsCurrentApiResponse, CreateProjectPayload>(
      '/api/projects',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateProject(
    projectId: string,
    payload: UpdateProjectPayload,
    options?: ProjectsCurrentRequestOptions,
  ): Promise<ProjectsCurrentApiResponse> {
    return apiClient.patch<ProjectsCurrentApiResponse, UpdateProjectPayload>(
      `/api/projects/${projectId}`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async deleteProject(projectId: string, options?: ProjectsCurrentRequestOptions): Promise<void> {
    return apiClient.delete<void>(`/api/projects/${projectId}`, undefined, {
      signal: options?.signal,
    })
  }

  async listProjectWorkflows(
    projectId: string,
    params: ListProjectWorkflowsParams = {},
    options?: ProjectsCurrentRequestOptions,
  ): Promise<ProjectsCurrentApiResponse> {
    return apiClient.get<ProjectsCurrentApiResponse>(
      `/api/projects/${projectId}/workflows`,
      params,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async listProjectConversations(
    projectId: string,
    params: PaginationParams = {},
    options?: ProjectsCurrentRequestOptions,
  ): Promise<ProjectsCurrentApiResponse> {
    return apiClient.get<ProjectsCurrentApiResponse>(
      `/api/projects/${projectId}/conversations`,
      params,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async listProjectAttachments(
    projectId: string,
    options?: ProjectsCurrentRequestOptions,
  ): Promise<ProjectsCurrentApiResponse> {
    return apiClient.get<ProjectsCurrentApiResponse>(
      `/api/projects/${projectId}/attachments`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async exportProject(
    projectId: string,
    payload: ExportProjectPayload,
    options?: ProjectsCurrentRequestOptions,
  ): Promise<ProjectsCurrentApiResponse> {
    return apiClient.post<ProjectsCurrentApiResponse, ExportProjectPayload>(
      `/api/projects/${projectId}/export`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }
}

export const projectsCurrentService = new ProjectsCurrentService()
