import { apiClient } from '../client'

interface ChatflowsRequestOptions {
  signal?: AbortSignal
}

interface ListChatflowsParams {
  keyword?: string
  visibility?: 'private' | 'team' | 'global'
  tag?: string
  page?: number
  pageSize?: number
}

interface CreateChatflowPayload {
  name: string
  description?: string
  cloneFrom?: string
  visibility?: 'private' | 'team' | 'global'
  prompt: Record<string, unknown>
  inputChannels?: Array<Record<string, unknown>>
  instructionIds?: string[]
}

interface UpdateChatflowPayload {
  name?: string
  description?: string
  visibility?: 'private' | 'team' | 'global'
  status?: 'draft' | 'published' | 'archived'
  prompt?: Record<string, unknown>
  inputChannels?: Array<Record<string, unknown>>
  instructionIds?: string[]
}

interface PublishChatflowPayload {
  notes: string
  visibility?: 'private' | 'team' | 'global'
}

interface PreviewChatflowPayload {
  inputs: Record<string, unknown>
  message: string
  locale?: string
}

interface ChatflowInstructionRefPayload {
  instructionId: string
  visibility: 'system' | 'team' | 'personal'
  ordering: number
  pinned?: boolean
  metadata?: Record<string, unknown>
}

interface UpdateChatflowInstructionsPayload {
  instructions: ChatflowInstructionRefPayload[]
}

interface ChatflowsApiResponse {
  success: boolean
  data?: Record<string, unknown> | Array<Record<string, unknown>>
}

class ChatflowsService {
  async listChatflows(
    params: ListChatflowsParams = {},
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.get<ChatflowsApiResponse>('/api/chatflows', params, undefined, {
      signal: options?.signal,
    })
  }

  async getChatflow(
    chatflowId: string,
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.get<ChatflowsApiResponse>(
      `/api/chatflows/${chatflowId}`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async listChatflowVersions(
    chatflowId: string,
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.get<ChatflowsApiResponse>(
      `/api/chatflows/${chatflowId}/versions`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async listChatflowInstructions(
    chatflowId: string,
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.get<ChatflowsApiResponse>(
      `/api/chatflows/${chatflowId}/instructions`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async createChatflow(
    payload: CreateChatflowPayload,
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.post<ChatflowsApiResponse, CreateChatflowPayload>(
      '/api/chatflows',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateChatflow(
    chatflowId: string,
    payload: UpdateChatflowPayload,
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.patch<ChatflowsApiResponse, UpdateChatflowPayload>(
      `/api/chatflows/${chatflowId}`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async archiveChatflow(chatflowId: string, options?: ChatflowsRequestOptions): Promise<void> {
    return apiClient.delete<void>(`/api/chatflows/${chatflowId}`, undefined, {
      signal: options?.signal,
    })
  }

  async publishChatflow(
    chatflowId: string,
    payload: PublishChatflowPayload,
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.post<ChatflowsApiResponse, PublishChatflowPayload>(
      `/api/chatflows/${chatflowId}/publish`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async previewChatflow(
    chatflowId: string,
    payload: PreviewChatflowPayload,
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.post<ChatflowsApiResponse, PreviewChatflowPayload>(
      `/api/chatflows/${chatflowId}/preview`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateChatflowInstructions(
    chatflowId: string,
    payload: UpdateChatflowInstructionsPayload,
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.put<ChatflowsApiResponse, UpdateChatflowInstructionsPayload>(
      `/api/chatflows/${chatflowId}/instructions`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async getChatflowVariables(
    chatflowId: string,
    options?: ChatflowsRequestOptions,
  ): Promise<ChatflowsApiResponse> {
    return apiClient.get<ChatflowsApiResponse>(
      `/api/chatflows/${chatflowId}/variables`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }
}

export const chatflowsService = new ChatflowsService()
