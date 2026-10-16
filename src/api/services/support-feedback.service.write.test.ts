import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    patch: jest.fn(),
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { supportFeedbackService } from './support-feedback.service'

const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('supportFeedbackService current support and feedback write endpoints', () => {
  beforeEach(() => {
    mockPatch.mockReset()
    mockPost.mockReset()
  })

  test('createSupportTicket calls current support ticket creation endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'ticket-1' } })

    const payload = {
      subject: '登录问题',
      description: '无法收到验证码',
      priority: 'high' as const,
      category: 'auth',
    }

    await supportFeedbackService.createSupportTicket(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/support/tickets', payload, undefined, {
      signal: undefined,
    })
  })

  test('updateSupportTicket calls current support ticket update endpoint', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { id: 'ticket-1' } })

    const payload = {
      status: 'pending',
      assignee: 'support-agent',
      priority: 'normal',
      tags: ['account'],
    }

    await supportFeedbackService.updateSupportTicket('ticket-1', payload)

    expect(mockPatch).toHaveBeenCalledWith('/api/support/tickets/ticket-1', payload, undefined, {
      signal: undefined,
    })
  })

  test('replySupportTicket calls current support ticket reply endpoint', async () => {
    mockPost.mockResolvedValue({ success: true })

    const payload = {
      body: '我们已经收到您的反馈。',
      internal: false,
    }

    await supportFeedbackService.replySupportTicket('ticket-1', payload)

    expect(mockPost).toHaveBeenCalledWith(
      '/api/support/tickets/ticket-1/messages',
      payload,
      undefined,
      { signal: undefined },
    )
  })

  test('createFeedbackSuggestion calls current feedback suggestion creation endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'suggestion-1' } })

    const payload = {
      title: '增加批量导出',
      description: '希望支持批量导出项目。',
      category: 'export',
    }

    await supportFeedbackService.createFeedbackSuggestion(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/feedback/suggestions', payload, undefined, {
      signal: undefined,
    })
  })

  test('voteFeedbackSuggestion calls current feedback suggestion vote endpoint', async () => {
    mockPost.mockResolvedValue({ success: true })

    await supportFeedbackService.voteFeedbackSuggestion('suggestion-1')

    expect(mockPost).toHaveBeenCalledWith(
      '/api/feedback/suggestions/suggestion-1/vote',
      undefined,
      undefined,
      { signal: undefined },
    )
  })
})
