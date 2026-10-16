import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    delete: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { chatflowsService } from './chatflows.service'

const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>
const mockPut = apiClient.put as jest.MockedFunction<typeof apiClient.put>

describe('chatflowsService current create and update endpoints', () => {
  beforeEach(() => {
    mockDelete.mockReset()
    mockPatch.mockReset()
    mockPost.mockReset()
    mockPut.mockReset()
  })

  test('createChatflow calls current chatflow creation endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'chatflow-1' } })

    const payload = {
      name: '专利问答助手',
      description: '用于专利问答',
      visibility: 'team' as const,
      prompt: { system: '请按专利代理标准回答' },
      instructionIds: ['instruction-1'],
    }

    await chatflowsService.createChatflow(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/chatflows', payload, undefined, {
      signal: undefined,
    })
  })

  test('updateChatflow calls current chatflow update endpoint', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { id: 'chatflow-1' } })

    const payload = {
      name: '更新后的问答助手',
      visibility: 'private' as const,
      prompt: { system: '更新后的提示词' },
    }

    await chatflowsService.updateChatflow('chatflow-1', payload)

    expect(mockPatch).toHaveBeenCalledWith('/api/chatflows/chatflow-1', payload, undefined, {
      signal: undefined,
    })
  })

  test('updateChatflowInstructions calls current chatflow instructions endpoint', async () => {
    mockPut.mockResolvedValue({ success: true, data: { instructions: [] } })

    const payload = {
      instructions: [
        {
          instructionId: 'instruction-1',
          visibility: 'team' as const,
          ordering: 1,
          pinned: true,
        },
      ],
    }

    await chatflowsService.updateChatflowInstructions('chatflow-1', payload)

    expect(mockPut).toHaveBeenCalledWith(
      '/api/chatflows/chatflow-1/instructions',
      payload,
      undefined,
      { signal: undefined },
    )
  })

  test('archiveChatflow calls current chatflow archive endpoint', async () => {
    mockDelete.mockResolvedValue(undefined)

    await chatflowsService.archiveChatflow('chatflow-1')

    expect(mockDelete).toHaveBeenCalledWith('/api/chatflows/chatflow-1', undefined, {
      signal: undefined,
    })
  })

  test('publishChatflow calls current chatflow publish endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { version: 'v2' } })

    const payload = {
      notes: '优化提示词',
      visibility: 'team' as const,
    }

    await chatflowsService.publishChatflow('chatflow-1', payload)

    expect(mockPost).toHaveBeenCalledWith('/api/chatflows/chatflow-1/publish', payload, undefined, {
      signal: undefined,
    })
  })

  test('previewChatflow calls current chatflow preview endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { responsePreview: '预览结果' } })

    const payload = {
      inputs: { title: '专利交底书' },
      message: '请生成摘要',
      locale: 'zh-CN',
    }

    await chatflowsService.previewChatflow('chatflow-1', payload)

    expect(mockPost).toHaveBeenCalledWith('/api/chatflows/chatflow-1/preview', payload, undefined, {
      signal: undefined,
    })
  })
})
