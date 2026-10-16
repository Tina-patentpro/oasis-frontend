import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { supportFeedbackService } from './support-feedback.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('supportFeedbackService read-only support and feedback endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('listSupportTickets calls support tickets endpoint with filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          hasMore: false,
        },
      },
    })

    await supportFeedbackService.listSupportTickets({
      status: 'open',
      priority: 'high',
      page: 1,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/support/tickets',
      {
        status: 'open',
        priority: 'high',
        page: 1,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getSupportTicket calls support ticket detail endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'ticket-1' } })

    await supportFeedbackService.getSupportTicket('ticket-1')

    expect(mockGet).toHaveBeenCalledWith('/api/support/tickets/ticket-1', undefined, undefined, {
      signal: undefined,
    })
  })

  test('listTicketMessages calls support ticket messages endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await supportFeedbackService.listTicketMessages('ticket-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/support/tickets/ticket-1/messages',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('listKnowledgeBaseCategories calls knowledge base endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await supportFeedbackService.listKnowledgeBaseCategories()

    expect(mockGet).toHaveBeenCalledWith('/api/support/knowledge-base', undefined, undefined, {
      signal: undefined,
    })
  })

  test('listFeedbackSuggestions calls feedback suggestions endpoint with filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          hasMore: false,
        },
      },
    })

    await supportFeedbackService.listFeedbackSuggestions({
      status: 'planned',
      page: 1,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/feedback/suggestions',
      {
        status: 'planned',
        page: 1,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('listFeedbackCampaigns calls feedback campaigns endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await supportFeedbackService.listFeedbackCampaigns()

    expect(mockGet).toHaveBeenCalledWith('/api/feedback/campaigns', undefined, undefined, {
      signal: undefined,
    })
  })
})
