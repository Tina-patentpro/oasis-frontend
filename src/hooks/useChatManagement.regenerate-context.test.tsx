import { act, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('@/api/services', () => ({
  aiService: {
    getChatflowPrompts: jest.fn(),
    sendChatflow: jest.fn(),
    uploadFile: jest.fn(),
  },
  sessionService: {
    associateProject: jest.fn(),
    dissociateProject: jest.fn(),
  },
}))

import { aiService } from '@/api/services'

import {
  EMPTY_CHATFLOW_PROMPTS,
  createDeferred,
  createFileList,
  createHook,
} from './__tests__/useChatManagement.test-utils'

afterEach(() => {
  jest.clearAllMocks()
})

describe('useChatManagement regenerateChat context', () => {
  test('reuses attachment files when regenerating a message sent with attachments', async () => {
    const initialDeferred = createDeferred<{ answer: string; conversation_id: string }>()
    const regenerateDeferred = createDeferred<{ answer: string; conversation_id: string }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    uploadFileMock.mockResolvedValue('https://example.test/files/report.pdf')
    sendChatflowMock
      .mockImplementationOnce(() => initialDeferred.promise as any)
      .mockImplementationOnce(() => regenerateDeferred.promise as any)

    const { result } = createHook()
    const file = new File(['attachment content'], 'report.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.addChatAttachments(createFileList([file]), 'file')
      result.current.changeChatInput('请分析附件')
    })

    await waitFor(() => {
      expect(result.current.chatAttachments).toHaveLength(1)
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(sendChatflowMock).toHaveBeenCalledTimes(1)
    })

    const firstFiles = (sendChatflowMock.mock.calls[0]?.[0] as { files?: unknown[] }).files
    expect(firstFiles).toEqual([
      {
        type: 'document',
        transfer_method: 'remote_url',
        url: 'https://example.test/files/report.pdf',
      },
    ])

    act(() => {
      initialDeferred.resolve({
        answer: '附件分析结果',
        conversation_id: 'conv_attachment',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    act(() => {
      result.current.regenerateChat()
    })

    await waitFor(() => {
      expect(sendChatflowMock).toHaveBeenCalledTimes(2)
    })

    expect(sendChatflowMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: '请分析附件',
        conversation_id: 'conv_attachment',
        files: firstFiles,
      }),
    )

    act(() => {
      regenerateDeferred.resolve({
        answer: '重新分析附件结果',
        conversation_id: 'conv_attachment_next',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })
  })

  test('reuses the existing conversationId for regenerateChat and updates it after a successful response', async () => {
    const initialDeferred = createDeferred<{ answer: string; conversation_id: string }>()
    const regenerateDeferred = createDeferred<{ answer: string; conversation_id: string }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    sendChatflowMock
      .mockImplementationOnce(() => initialDeferred.promise as any)
      .mockImplementationOnce(() => regenerateDeferred.promise as any)

    const { result } = createHook()

    act(() => {
      result.current.changeChatInput('先建立会话')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('先建立会话')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    act(() => {
      initialDeferred.resolve({
        answer: '首次回复',
        conversation_id: 'conv_123',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.conversationId).toBe('conv_123')

    act(() => {
      result.current.regenerateChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    expect(sendChatflowMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: '先建立会话',
        conversation_id: 'conv_123',
        type: 1,
      }),
    )

    act(() => {
      regenerateDeferred.resolve({
        answer: '重新生成后的回复',
        conversation_id: 'conv_456',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.conversationId).toBe('conv_456')
    expect(
      result.current.chatSession.messages[result.current.chatSession.messages.length - 1]?.content,
    ).toBe('重新生成后的回复')
  })

  test('keeps the existing conversationId when regenerateChat fails', async () => {
    const initialDeferred = createDeferred<{ answer: string; conversation_id: string }>()
    const regenerateDeferred = createDeferred<never>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    sendChatflowMock
      .mockImplementationOnce(() => initialDeferred.promise as any)
      .mockImplementationOnce(() => regenerateDeferred.promise as any)

    const { result, notify } = createHook()

    act(() => {
      result.current.changeChatInput('保留会话 ID')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('保留会话 ID')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    act(() => {
      initialDeferred.resolve({
        answer: '会话已建立',
        conversation_id: 'conv_123',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.conversationId).toBe('conv_123')

    act(() => {
      result.current.regenerateChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    expect(sendChatflowMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: '保留会话 ID',
        conversation_id: 'conv_123',
        type: 1,
      }),
    )

    act(() => {
      regenerateDeferred.reject(new Error('二次请求失败'))
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.conversationId).toBe('conv_123')
    expect(notify).toHaveBeenCalledWith('重新生成失败: 二次请求失败')
  })
})
