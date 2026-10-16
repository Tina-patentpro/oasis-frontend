import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { conversationsService } from './conversations.service'

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('conversationsService current conversation export endpoint', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  test('exportConversation calls current conversation export endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { taskId: 'conversation-export-1' } })

    const payload = {
      format: 'markdown' as const,
      includeAttachments: true,
    }

    await conversationsService.exportConversation('conversation-1', payload)

    expect(mockPost).toHaveBeenCalledWith(
      '/api/conversations/conversation-1/export',
      payload,
      undefined,
      { signal: undefined },
    )
  })
})
