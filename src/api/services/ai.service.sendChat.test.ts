import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    uploadFile: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { aiService } from './ai.service'

const mockPost = apiClient.post as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
  mock: { calls: unknown[][] }
}

describe('AIService.sendChat', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  test('maps regular file attachments to document files for chatflow', async () => {
    mockPost.mockResolvedValue({
      answer: 'ok',
      conversation_id: 2001,
    })

    await aiService.sendChat({
      sessionId: 1,
      message: '请读取附件内容，只回答其中的测试标识。',
      mode: 'focus',
      attachments: [
        {
          type: 'file',
          url: 'https://lzhxpy.oasisintwrite.com/uploads/upload-probe.txt',
        },
      ],
    })

    expect(mockPost).toHaveBeenCalledWith(
      '/apicategories/charteflowcreate',
      expect.objectContaining({
        files: [
          {
            type: 'document',
            transfer_method: 'remote_url',
            url: 'https://lzhxpy.oasisintwrite.com/uploads/upload-probe.txt',
          },
        ],
      }),
      undefined,
      expect.any(Object),
    )
  })

  test('preserves chatflow conversation id in follow-up API payloads', async () => {
    mockPost.mockResolvedValue({
      answer: 'MEMORY_PROBE_SERVICE',
      conversation_id: 'conv_key_memory',
    })

    await aiService.sendChatflow({
      query: '请只回复我上一条消息中的质量打磨记忆探针值，不要解释。',
      conversation_id: 'conv_key_memory',
      type: 1,
      folder_id: 0,
    })

    expect(mockPost).toHaveBeenCalledWith(
      '/apicategories/charteflowcreate',
      expect.objectContaining({
        query: '请只回复我上一条消息中的质量打磨记忆探针值，不要解释。',
        conversation_id: 'conv_key_memory',
        type: 1,
        folder_id: 0,
      }),
      undefined,
      expect.any(Object),
    )
  })
})
