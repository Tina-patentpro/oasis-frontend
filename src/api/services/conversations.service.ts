import { apiClient } from '../client'

interface ConversationsRequestOptions {
  signal?: AbortSignal
}

interface GetConversationsParams {
  chatflowId?: string
  projectId?: string
  keyword?: string
  status?: 'active' | 'archived'
  page?: number
  pageSize?: number
}

interface GetConversationMessagesParams {
  after?: string
  limit?: number
}

interface StreamConversationMessageParams {
  messageId: string
  transport?: 'sse' | 'polling'
}

interface CreateConversationPayload {
  chatflowId: string
  projectId?: string
  title?: string
  initialMessage?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

interface UpdateConversationPayload {
  title?: string
  projectId?: string
  status?: 'active' | 'archived'
  pinned?: boolean
  metadata?: Record<string, unknown>
}

interface SendConversationMessagePayload {
  role: 'user' | 'system'
  content: string
  attachments?: Array<Record<string, unknown>>
  options?: {
    stream?: boolean
    temperature?: number
    stopSequences?: string[]
  }
}

interface ExportConversationPayload {
  format: 'pdf' | 'json' | 'markdown'
  includeAttachments?: boolean
}

interface ConversationsApiResponse {
  success: boolean
  data?: Record<string, unknown> | Array<Record<string, unknown>>
}

class ConversationsService {
  async getConversations(
    params: GetConversationsParams = {},
    options?: ConversationsRequestOptions,
  ): Promise<ConversationsApiResponse> {
    return apiClient.get<ConversationsApiResponse>('/api/conversations', params, undefined, {
      signal: options?.signal,
    })
  }

  async getConversation(
    conversationId: string,
    options?: ConversationsRequestOptions,
  ): Promise<ConversationsApiResponse> {
    return apiClient.get<ConversationsApiResponse>(
      `/api/conversations/${conversationId}`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getConversationMessages(
    conversationId: string,
    params: GetConversationMessagesParams = {},
    options?: ConversationsRequestOptions,
  ): Promise<ConversationsApiResponse> {
    return apiClient.get<ConversationsApiResponse>(
      `/api/conversations/${conversationId}/messages`,
      params,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getConversationAttachments(
    conversationId: string,
    options?: ConversationsRequestOptions,
  ): Promise<ConversationsApiResponse> {
    return apiClient.get<ConversationsApiResponse>(
      `/api/conversations/${conversationId}/attachments`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async createConversation(
    payload: CreateConversationPayload,
    options?: ConversationsRequestOptions,
  ): Promise<ConversationsApiResponse> {
    return apiClient.post<ConversationsApiResponse, CreateConversationPayload>(
      '/api/conversations',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateConversation(
    conversationId: string,
    payload: UpdateConversationPayload,
    options?: ConversationsRequestOptions,
  ): Promise<ConversationsApiResponse> {
    return apiClient.patch<ConversationsApiResponse, UpdateConversationPayload>(
      `/api/conversations/${conversationId}`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async deleteConversation(
    conversationId: string,
    options?: ConversationsRequestOptions,
  ): Promise<void> {
    return apiClient.delete<void>(`/api/conversations/${conversationId}`, undefined, {
      signal: options?.signal,
    })
  }

  async sendConversationMessage(
    conversationId: string,
    payload: SendConversationMessagePayload,
    options?: ConversationsRequestOptions,
  ): Promise<ConversationsApiResponse> {
    return apiClient.post<ConversationsApiResponse, SendConversationMessagePayload>(
      `/api/conversations/${conversationId}/messages`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async streamConversationMessage(
    conversationId: string,
    params: StreamConversationMessageParams,
    options?: ConversationsRequestOptions,
  ): Promise<ConversationsApiResponse> {
    return apiClient.get<ConversationsApiResponse>(
      `/api/conversations/${conversationId}/messages/stream`,
      params,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async exportConversation(
    conversationId: string,
    payload: ExportConversationPayload,
    options?: ConversationsRequestOptions,
  ): Promise<ConversationsApiResponse> {
    return apiClient.post<ConversationsApiResponse, ExportConversationPayload>(
      `/api/conversations/${conversationId}/export`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }
}

export const conversationsService = new ConversationsService()
