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
  createHook,
} from './__tests__/useChatManagement.test-utils'

afterEach(() => {
  jest.clearAllMocks()
})

describe('useChatManagement sendChat', () => {
  test('sets chatLoading during sendChat and clears it after a successful response', async () => {
    const deferred = createDeferred<{ answer: string; conversation_id: string }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    sendChatflowMock.mockImplementation(() => deferred.promise as any)

    const { result, onSessionLinked } = createHook()

    act(() => {
      result.current.changeChatInput('请帮我整理要点')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('请帮我整理要点')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    expect(sendChatflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '请帮我整理要点',
        conversation_id: null,
        type: 1,
      }),
    )

    act(() => {
      deferred.resolve({
        answer: '整理完成',
        conversation_id: 'conv_123',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    const latestMessage =
      result.current.chatSession.messages[result.current.chatSession.messages.length - 1]
    expect(latestMessage?.content).toBe('整理完成')
    expect(onSessionLinked).toHaveBeenCalledTimes(1)
  })

  test('keeps the returned conversation id on the next send for key-content memory', async () => {
    const firstDeferred = createDeferred<{ answer: string; conversation_id: string }>()
    const secondDeferred = createDeferred<{ answer: string; conversation_id: string }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    sendChatflowMock
      .mockImplementationOnce(() => firstDeferred.promise as any)
      .mockImplementationOnce(() => secondDeferred.promise as any)

    const { result } = createHook()

    act(() => {
      result.current.changeChatInput(
        '请记住本轮关键内容：质量打磨记忆探针 = MEMORY_PROBE_FRONTEND。请仅回复：已记录',
      )
    })

    await waitFor(() => {
      expect(result.current.chatInput).toContain('MEMORY_PROBE_FRONTEND')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(sendChatflowMock).toHaveBeenCalledTimes(1)
    })
    expect(sendChatflowMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        conversation_id: null,
        query: expect.stringContaining('MEMORY_PROBE_FRONTEND'),
      }),
    )

    await act(async () => {
      firstDeferred.resolve({
        answer: '已记录',
        conversation_id: 'conv_key_memory',
      })
      await firstDeferred.promise
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    act(() => {
      result.current.changeChatInput('请只回复我上一条消息中的质量打磨记忆探针值，不要解释。')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe(
        '请只回复我上一条消息中的质量打磨记忆探针值，不要解释。',
      )
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(sendChatflowMock).toHaveBeenCalledTimes(2)
    })
    expect(sendChatflowMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        conversation_id: 'conv_key_memory',
        query: '请只回复我上一条消息中的质量打磨记忆探针值，不要解释。',
      }),
    )

    await act(async () => {
      secondDeferred.resolve({
        answer: 'MEMORY_PROBE_FRONTEND',
        conversation_id: 'conv_key_memory',
      })
      await secondDeferred.promise
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })
  })

  test('renders image chatflow file_url in the live assistant response', async () => {
    const imageUrl = '/files/tools/live-result.png?sign=1'
    const deferred = createDeferred<{
      answer: string
      conversation_id: string
      file_url: string
    }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    sendChatflowMock.mockImplementation(() => deferred.promise as any)

    const { result } = createHook()

    act(() => {
      result.current.setChatTab('image')
    })

    await waitFor(() => {
      expect(result.current.chatTab).toBe('image')
    })

    act(() => {
      result.current.changeChatInput('画一张结构示意图')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('画一张结构示意图')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    act(() => {
      deferred.resolve({
        answer: '',
        conversation_id: 'conv_image_live',
        file_url: imageUrl,
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    const latestMessage =
      result.current.chatSession.messages[result.current.chatSession.messages.length - 1]
    expect(latestMessage?.role).toBe('assistant')
    expect(latestMessage?.content).toContain(imageUrl)
    expect(latestMessage?.content).toContain('![')
  })

  test('keeps a Mermaid fenced block from the general chatflow response', async () => {
    const mermaidBlock = [
      '```mermaid',
      'flowchart TD',
      '  A[开始] --> B[真实输入]',
      '  B --> C[页面渲染]',
      '```',
    ].join('\n')
    const deferred = createDeferred<{ answer: string; conversation_id: string }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    sendChatflowMock.mockImplementation(() => deferred.promise as any)

    const { result } = createHook()

    act(() => {
      result.current.setChatTab('general')
    })

    await waitFor(() => {
      expect(result.current.chatTab).toBe('general')
    })

    act(() => {
      result.current.changeChatInput('请返回 Mermaid 图')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('请返回 Mermaid 图')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(sendChatflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '请返回 Mermaid 图',
          type: 3,
        }),
      )
    })

    await act(async () => {
      deferred.resolve({
        answer: mermaidBlock,
        conversation_id: 'conv_mermaid_general',
      })
      await deferred.promise
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    const latestMessage =
      result.current.chatSession.messages[result.current.chatSession.messages.length - 1]
    expect(latestMessage?.role).toBe('assistant')
    expect(latestMessage?.content).toBe(mermaidBlock)
    expect(latestMessage?.content).toContain('```mermaid')
    expect(latestMessage?.content).toContain('flowchart TD')
  })

  test('sendChat uses the explicit input override when provided', async () => {
    const deferred = createDeferred<{ answer: string; conversation_id: string }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    sendChatflowMock.mockImplementation(() => deferred.promise as any)

    const { result } = createHook()

    act(() => {
      result.current.changeChatInput('旧内容')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('旧内容')
    })

    act(() => {
      result.current.sendChat('最新内容')
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    expect(sendChatflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '最新内容',
      }),
    )

    act(() => {
      deferred.resolve({
        answer: '收到最新内容',
        conversation_id: 'conv_override',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })
  })

  test('clears chatLoading and shows readable message when sendChat fails', async () => {
    const deferred = createDeferred<never>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    sendChatflowMock.mockImplementation(() => deferred.promise as any)

    const { result, notify } = createHook()

    act(() => {
      result.current.changeChatInput('失败分支')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('失败分支')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    act(() => {
      deferred.reject(new Error('网络异常'))
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(notify).toHaveBeenCalledWith('发送失败: 网络异常')
  })

  test('cancels an in-flight chat request without appending a late assistant reply', async () => {
    const deferred = createDeferred<{ answer: string; conversation_id: string }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    sendChatflowMock.mockImplementation(() => deferred.promise as any)

    const { result, notify } = createHook()

    act(() => {
      result.current.changeChatInput('需要取消的问题')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('需要取消的问题')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
      expect(sendChatflowMock).toHaveBeenCalledTimes(1)
    })

    const request = sendChatflowMock.mock.calls[0]?.[0]
    expect(request?.signal?.aborted).toBe(false)

    act(() => {
      result.current.cancelChatRequest()
    })

    expect(result.current.chatLoading).toBe(false)
    expect(request?.signal?.aborted).toBe(true)
    expect(notify).toHaveBeenCalledWith('已取消生成')

    act(() => {
      deferred.resolve({
        answer: '这条回复不应出现',
        conversation_id: 'conv_cancelled',
      })
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages).toHaveLength(2)
    })
    expect(result.current.chatSession.messages).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('不应出现'),
        }),
      ]),
    )
  })
})
