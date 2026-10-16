import { apiClient } from '../client'

interface SupportFeedbackRequestOptions {
  signal?: AbortSignal
}

interface ListSupportTicketsParams {
  status?: 'open' | 'pending' | 'resolved' | 'closed'
  priority?: string
  page?: number
}

interface ListFeedbackSuggestionsParams {
  status?: 'reviewing' | 'planned' | 'shipped' | 'rejected'
  page?: number
}

interface TicketAttachmentPayload {
  fileId?: string
  fileName?: string
  downloadUrl?: string
}

interface CreateSupportTicketPayload {
  subject: string
  description: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  category?: string
  attachments?: TicketAttachmentPayload[]
}

interface UpdateSupportTicketPayload {
  status?: string
  assignee?: string
  priority?: string
  tags?: string[]
}

interface ReplySupportTicketPayload {
  body: string
  internal?: boolean
  attachments?: TicketAttachmentPayload[]
}

interface CreateFeedbackSuggestionPayload {
  title: string
  description: string
  category?: string
  attachments?: TicketAttachmentPayload[]
}

interface SupportFeedbackApiResponse {
  success: boolean
  data?: Record<string, unknown> | Array<Record<string, unknown>>
}

class SupportFeedbackService {
  async listSupportTickets(
    params: ListSupportTicketsParams = {},
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.get<SupportFeedbackApiResponse>('/api/support/tickets', params, undefined, {
      signal: options?.signal,
    })
  }

  async getSupportTicket(
    ticketId: string,
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.get<SupportFeedbackApiResponse>(
      `/api/support/tickets/${ticketId}`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async listTicketMessages(
    ticketId: string,
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.get<SupportFeedbackApiResponse>(
      `/api/support/tickets/${ticketId}/messages`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async listKnowledgeBaseCategories(
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.get<SupportFeedbackApiResponse>(
      '/api/support/knowledge-base',
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async listFeedbackSuggestions(
    params: ListFeedbackSuggestionsParams = {},
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.get<SupportFeedbackApiResponse>(
      '/api/feedback/suggestions',
      params,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async listFeedbackCampaigns(
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.get<SupportFeedbackApiResponse>(
      '/api/feedback/campaigns',
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async createSupportTicket(
    payload: CreateSupportTicketPayload,
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.post<SupportFeedbackApiResponse, CreateSupportTicketPayload>(
      '/api/support/tickets',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateSupportTicket(
    ticketId: string,
    payload: UpdateSupportTicketPayload,
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.patch<SupportFeedbackApiResponse, UpdateSupportTicketPayload>(
      `/api/support/tickets/${ticketId}`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async replySupportTicket(
    ticketId: string,
    payload: ReplySupportTicketPayload,
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.post<SupportFeedbackApiResponse, ReplySupportTicketPayload>(
      `/api/support/tickets/${ticketId}/messages`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async createFeedbackSuggestion(
    payload: CreateFeedbackSuggestionPayload,
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.post<SupportFeedbackApiResponse, CreateFeedbackSuggestionPayload>(
      '/api/feedback/suggestions',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async voteFeedbackSuggestion(
    suggestionId: string,
    options?: SupportFeedbackRequestOptions,
  ): Promise<SupportFeedbackApiResponse> {
    return apiClient.post<SupportFeedbackApiResponse>(
      `/api/feedback/suggestions/${suggestionId}/vote`,
      undefined,
      undefined,
      { signal: options?.signal },
    )
  }
}

export const supportFeedbackService = new SupportFeedbackService()
