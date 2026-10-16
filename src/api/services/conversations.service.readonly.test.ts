import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { conversationsService } from './conversations.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('conversationsService read-only conversation endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('getConversations calls conversations list endpoint with filters', async () => {
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

    await conversationsService.getConversations({
      chatflowId: 'chatflow-1',
      projectId: 'project-1',
      keyword: '底盘',
      status: 'active',
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/conversations',
      {
        chatflowId: 'chatflow-1',
        projectId: 'project-1',
        keyword: '底盘',
        status: 'active',
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getConversation calls conversation detail endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'conversation-1' } })

    await conversationsService.getConversation('conversation-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/conversations/conversation-1',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('getConversationMessages calls conversation messages endpoint with filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await conversationsService.getConversationMessages('conversation-1', {
      after: 'message-1',
      limit: 50,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/conversations/conversation-1/messages',
      {
        after: 'message-1',
        limit: 50,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getConversationAttachments calls conversation attachments endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await conversationsService.getConversationAttachments('conversation-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/conversations/conversation-1/attachments',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('streamConversationMessage calls conversation message stream endpoint with message id', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        event: 'completed',
      },
    })

    await conversationsService.streamConversationMessage('conversation-1', {
      messageId: 'message-1',
      transport: 'polling',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/conversations/conversation-1/messages/stream',
      {
        messageId: 'message-1',
        transport: 'polling',
      },
      undefined,
      { signal: undefined },
    )
  })
})
