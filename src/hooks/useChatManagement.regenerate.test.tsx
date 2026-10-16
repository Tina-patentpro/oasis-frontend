import { act, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import type { SessionDetail } from '@/types/api'

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

describe('useChatManagement regenerateChat', () => {
  test('trims the previous assistant reply during regenerateChat and appends the new reply afterwards', async () => {
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
          id: 1001,
          userId: 1,
          projectId: 0,
          title: '对话详情',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z',
          chatMessages: [
            {
              id: 11,
              sessionId: 1001,
              role: 'user',
              content: '请继续整理上一版内容',
              mode: 'general',
              createdAt: '2026-04-01T10:00:01.000Z',
            },
            {
              id: 12,
              sessionId: 1001,
              role: 'assistant',
              content: '旧的 AI 回复',
              mode: 'general',
              createdAt: '2026-04-01T10:00:02.000Z',
            },
          ],
        } as SessionDetail,
        'general',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages).toHaveLength(2)
    })

    act(() => {
      result.current.regenerateChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    expect(result.current.chatSession.messages).toHaveLength(1)
    expect(result.current.chatSession.messages[0]?.content).toBe('请继续整理上一版内容')
    expect(sendChatflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '请继续整理上一版内容',
        conversation_id: null,
        type: 3,
      }),
    )

    act(() => {
      deferred.resolve({
        answer: '新的 AI 回复',
        conversation_id: 'conv_456',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.messages).toHaveLength(2)
    expect(result.current.chatSession.messages[1]?.content).toBe('新的 AI 回复')
  })


  test('clears chatLoading and shows readable message when regenerateChat fails', async () => {
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
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1002,
          userId: 1,
          projectId: 0,
          title: '失败重试详情',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z',
          chatMessages: [
            {
              id: 21,
              sessionId: 1002,
              role: 'user',
              content: '请重新生成失败案例',
              mode: 'general',
              createdAt: '2026-04-01T10:00:01.000Z',
            },
            {
              id: 22,
              sessionId: 1002,
              role: 'assistant',
              content: '旧的失败前回复',
              mode: 'general',
              createdAt: '2026-04-01T10:00:02.000Z',
            },
          ],
        } as SessionDetail,
        'general',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages).toHaveLength(2)
    })

    act(() => {
      result.current.regenerateChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    expect(result.current.chatSession.messages).toHaveLength(1)
    expect(result.current.chatSession.messages[0]?.content).toBe('请重新生成失败案例')

    act(() => {
      deferred.reject(new Error('重新生成网络异常'))
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.messages).toHaveLength(1)
    expect(notify).toHaveBeenCalledWith('重新生成失败: 重新生成网络异常')
  })


  test('keeps regenerateChat loading scoped to the originating tab after switching tabs', async () => {
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
          id: 1006,
          userId: 1,
          projectId: 0,
          title: '切换标签页时重新生成',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z',
          chatMessages: [
            {
              id: 31,
              sessionId: 1006,
              role: 'user',
              content: '请重新生成并保持在聚焦标签页',
              mode: 'focus',
              createdAt: '2026-04-01T10:00:01.000Z',
            },
            {
              id: 32,
              sessionId: 1006,
              role: 'assistant',
              content: '旧回复',
              mode: 'focus',
              createdAt: '2026-04-01T10:00:02.000Z',
            },
          ],
        } as SessionDetail,
        'focus',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages).toHaveLength(2)
    })

    act(() => {
      result.current.regenerateChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    act(() => {
      result.current.setChatTab('image')
    })

    await waitFor(() => {
      expect(result.current.chatTab).toBe('image')
    })
    expect(result.current.chatLoading).toBe(false)

    act(() => {
      deferred.resolve({
        answer: '聚焦标签页的新回复',
        conversation_id: 'conv_focus_regenerate',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.messages).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ content: '聚焦标签页的新回复' })]),
    )

    act(() => {
      result.current.setChatTab('focus')
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages).toEqual(
        expect.arrayContaining([expect.objectContaining({ content: '聚焦标签页的新回复' })]),
      )
    })
  })


  test('does not append a stale regenerateChat reply after hydrating another session in the same tab', async () => {
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
          id: 1201,
          userId: 1,
          projectId: 0,
          title: '重新生成中的会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z',
          chatMessages: [
            {
              id: 61,
              sessionId: 1201,
              role: 'user',
              content: '旧会话重新生成请求',
              mode: 'focus',
              createdAt: '2026-04-01T10:00:01.000Z',
            },
            {
              id: 62,
              sessionId: 1201,
              role: 'assistant',
              content: '旧会话原回复',
              mode: 'focus',
              createdAt: '2026-04-01T10:00:02.000Z',
            },
          ],
        } as SessionDetail,
        'focus',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages).toHaveLength(2)
    })

    act(() => {
      result.current.regenerateChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
    })

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1202,
          userId: 1,
          projectId: 0,
          title: '新加载会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-04-01T11:00:00.000Z',
          updatedAt: '2026-04-01T11:00:00.000Z',
          chatMessages: [
            {
              id: 63,
              sessionId: 1202,
              role: 'user',
              content: '新会话消息',
              mode: 'focus',
              createdAt: '2026-04-01T11:00:01.000Z',
            },
          ],
        } as SessionDetail,
        'focus',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1202)
    })

    act(() => {
      deferred.resolve({
        answer: '旧重新生成迟到回复',
        conversation_id: 'conv_stale_regenerate',
      })
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })

    expect(result.current.chatSession.messages).toEqual([
      expect.objectContaining({ content: '新会话消息' }),
    ])
    expect(result.current.chatSession.conversationId).toBeNull()
  })

})
