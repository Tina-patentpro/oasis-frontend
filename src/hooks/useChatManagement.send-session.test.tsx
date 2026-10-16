import { act, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import type { Project, SessionDetail } from '@/types/api'

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

import { EMPTY_CHATFLOW_PROMPTS, createDeferred, createHook } from './__tests__/useChatManagement.test-utils'

afterEach(() => {
  jest.clearAllMocks()
})

describe('useChatManagement sendChat session boundaries', () => {
  test('clears project association when hydrating an independent session and sends with folder_id 0', async () => {
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
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1103,
          userId: 1,
          projectId: 44,
          title: '项目会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T09:00:00',
          updatedAt: '2026-05-21T09:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        { id: 44, name: '项目 A' } as Project,
        44,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(44)
    })

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1104,
          userId: 1,
          projectId: 0,
          title: '独立会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T10:00:00',
          updatedAt: '2026-05-21T10:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1104)
    })
    expect(result.current.chatSession.associatedProjectId).toBeUndefined()

    act(() => {
      result.current.changeChatInput('独立会话问题')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('独立会话问题')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(sendChatflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          folder_id: 0,
        }),
      )
    })

    act(() => {
      deferred.resolve({
        answer: '独立会话回复',
        conversation_id: 'conv_independent',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })
  })


  test('does not append a stale sendChat reply after hydrating another session in the same tab', async () => {
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
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1105,
          userId: 1,
          projectId: 0,
          title: '发送中的会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T09:00:00',
          updatedAt: '2026-05-21T09:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1105)
    })

    act(() => {
      result.current.changeChatInput('旧会话请求')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('旧会话请求')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1106,
          userId: 1,
          projectId: 0,
          title: '新加载的会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T10:00:00',
          updatedAt: '2026-05-21T10:00:00',
          chatMessages: [
            {
              id: 51,
              sessionId: 1106,
              role: 'user',
              content: '新会话已有消息',
              mode: 'focus',
              createdAt: '2026-05-21T10:00:01',
            },
          ],
        } as SessionDetail,
        'focus',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1106)
    })

    act(() => {
      deferred.resolve({
        answer: '旧会话迟到回复',
        conversation_id: 'conv_stale_send',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.messages).toEqual([
      expect.objectContaining({ content: '新会话已有消息' }),
    ])
    expect(result.current.chatSession.conversationId).toBeNull()
  })


  test('does not append a stale sendChat reply after clearing the current conversation', async () => {
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
      result.current.changeChatInput('清空前的问题')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('清空前的问题')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
      expect(sendChatflowMock).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.clearChat()
    })

    expect(result.current.chatLoading).toBe(false)
    expect(result.current.chatSession.messages).toHaveLength(1)
    expect(result.current.chatSession.messages).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ content: expect.stringContaining('清空前的问题') })]),
    )

    act(() => {
      deferred.resolve({
        answer: '清空前请求的迟到回复',
        conversation_id: 'conv_stale_clear',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.messages).toHaveLength(1)
    expect(result.current.chatSession.messages).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ content: '清空前请求的迟到回复' })]),
    )
    expect(result.current.chatSession.conversationId).toBeNull()
  })


  test('does not append a stale sendChat reply after starting a new conversation', async () => {
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
      result.current.changeChatInput('新建前的问题')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('新建前的问题')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
      expect(sendChatflowMock).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.startNewConversation()
    })

    expect(result.current.chatLoading).toBe(false)
    expect(result.current.chatSession.messages).toHaveLength(1)
    expect(result.current.chatSession.messages).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ content: expect.stringContaining('新建前的问题') })]),
    )

    act(() => {
      deferred.resolve({
        answer: '新建前请求的迟到回复',
        conversation_id: 'conv_stale_new',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.messages).toHaveLength(1)
    expect(result.current.chatSession.messages).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ content: '新建前请求的迟到回复' })]),
    )
  })


  test('keeps sendChat loading scoped to the originating tab after switching tabs', async () => {
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
      result.current.changeChatInput('聚焦标签页的问题')
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('聚焦标签页的问题')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    act(() => {
      result.current.setChatTab('general')
    })

    await waitFor(() => {
      expect(result.current.chatTab).toBe('general')
    })
    expect(result.current.chatLoading).toBe(false)

    act(() => {
      deferred.resolve({
        answer: '聚焦标签页的回复',
        conversation_id: 'conv_focus',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.messages).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ content: '聚焦标签页的回复' })]),
    )

    act(() => {
      result.current.setChatTab('focus')
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages).toEqual(
        expect.arrayContaining([expect.objectContaining({ content: '聚焦标签页的回复' })]),
      )
    })
  })

})
