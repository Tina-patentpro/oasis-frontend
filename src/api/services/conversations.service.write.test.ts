import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    delete: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { conversationsService } from './conversations.service'

const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('conversationsService current create and update endpoints', () => {
  beforeEach(() => {
    mockDelete.mockReset()
    mockPatch.mockReset()
    mockPost.mockReset()
  })

  test('createConversation calls current conversation creation endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'conversation-1' } })

    const payload = {
      chatflowId: 'chatflow-1',
      projectId: 'project-1',
      title: '专利交底沟通',
      metadata: { source: 'manual' },
    }

    await conversationsService.createConversation(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/conversations', payload, undefined, {
      signal: undefined,
    })
  })

  test('updateConversation calls current conversation update endpoint', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { id: 'conversation-1' } })

    const payload = {
      title: '更新后的会话标题',
      projectId: 'project-2',
      pinned: true,
    }

    await conversationsService.updateConversation('conversation-1', payload)

    expect(mockPatch).toHaveBeenCalledWith(
      '/api/conversations/conversation-1',
      payload,
      undefined,
      { signal: undefined },
    )
  })

  test('deleteConversation calls current soft delete endpoint', async () => {
    mockDelete.mockResolvedValue(undefined)

    await conversationsService.deleteConversation('conversation-1')

    expect(mockDelete).toHaveBeenCalledWith('/api/conversations/conversation-1', undefined, {
      signal: undefined,
    })
  })

  test('sendConversationMessage calls current conversation messages endpoint', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        messageId: 'message-1',
        streamUrl: '/api/conversations/conversation-1/messages/stream?messageId=message-1',
      },
    })

    const payload = {
      role: 'user' as const,
      content: '请总结这份专利交底书',
      attachments: [{ id: 'attachment-1', filename: 'disclosure.docx' }],
      options: {
        stream: true,
        temperature: 0.2,
        stopSequences: ['END'],
      },
    }

    await conversationsService.sendConversationMessage('conversation-1', payload)

    expect(mockPost).toHaveBeenCalledWith(
      '/api/conversations/conversation-1/messages',
      payload,
      undefined,
      { signal: undefined },
    )
  })
})
