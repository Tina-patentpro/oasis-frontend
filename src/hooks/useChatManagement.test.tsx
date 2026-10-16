import { act, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import type { ChatflowPromptsResponse } from '@/api/services/ai.service'
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

import {
  EMPTY_CHATFLOW_PROMPTS,
  createDeferred,
  createFileList,
  createHook,
} from './__tests__/useChatManagement.test-utils'

afterEach(() => {
  jest.clearAllMocks()
})

describe('useChatManagement', () => {
  test('defaults to the focus chat tab on first render', () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result } = createHook()

    expect(result.current.chatTab).toBe('focus')
  })


  test('preserves message createdAt when hydrating chat history detail', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result } = createHook()

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1003,
          userId: 1,
          projectId: 0,
          title: '历史详情',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T09:00:00',
          updatedAt: '2026-05-21T09:00:00',
          chatMessages: [
            {
              id: 31,
              sessionId: 1003,
              role: 'user',
              content: '历史消息',
              mode: 'general',
              createdAt: '2026-05-21T09:30:00',
            },
          ],
        } as SessionDetail,
        'general',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages[0]?.createdAt).toBe('2026-05-21T09:30:00')
    })
  })


  test('does not keep previous messages when hydrating a detail with empty chatMessages', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result } = createHook()

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1101,
          userId: 1,
          projectId: 0,
          title: '先加载有消息的会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T09:00:00',
          updatedAt: '2026-05-21T09:00:00',
          chatMessages: [
            {
              id: 41,
              sessionId: 1101,
              role: 'user',
              content: '旧会话消息',
              mode: 'general',
              createdAt: '2026-05-21T09:30:00',
            },
          ],
        } as SessionDetail,
        'general',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages).toHaveLength(1)
    })

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1102,
          userId: 1,
          projectId: 0,
          title: '空消息会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T10:00:00',
          updatedAt: '2026-05-21T10:00:00',
          chatMessages: [],
        } as SessionDetail,
        'general',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1102)
    })
    expect(result.current.chatSession.messages).toEqual([])
  })

  test('does not inherit previous conversation id when hydrating a different session without one', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result } = createHook()

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1201,
          userId: 1,
          projectId: 0,
          title: '带对话上下文的历史会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T09:00:00',
          updatedAt: '2026-05-21T09:00:00',
          conversationId: 'conv_a',
          chatMessages: [],
        } as SessionDetail,
        'general',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1201)
    })
    expect(result.current.chatSession.conversationId).toBe('conv_a')

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1202,
          userId: 1,
          projectId: 0,
          title: '没有对话上下文的另一个历史会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T10:00:00',
          updatedAt: '2026-05-21T10:00:00',
          chatMessages: [],
        } as SessionDetail,
        'general',
        null,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1202)
    })
    expect(result.current.chatSession.conversationId).toBeNull()
  })


  test('keeps an empty hydrated history session when chatflow prompts load later', async () => {
    const promptDeferred = createDeferred<ChatflowPromptsResponse>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockImplementation(() => promptDeferred.promise)

    const { result } = createHook()

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1111,
          userId: 1,
          projectId: 55,
          title: '空消息历史会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T09:00:00',
          updatedAt: '2026-05-21T09:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        { id: 55, name: '历史项目' } as Project,
        55,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1111)
    })
    expect(result.current.chatSession.messages).toEqual([])
    expect(result.current.chatSession.associatedProjectId).toBe(55)

    await act(async () => {
      promptDeferred.resolve({
        通用对话: [{ name: '新的通用提示语', description: '新的通用描述' }],
        工作聚焦: [{ name: '新的工作聚焦提示语', description: '新的工作聚焦描述' }],
        语义生图: [{ name: '新的语义生图提示语', description: '新的语义生图描述' }],
      })
      await promptDeferred.promise
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1111)
    })
    expect(result.current.chatSession.messages).toEqual([])
    expect(result.current.chatSession.associatedProjectId).toBe(55)
    expect(result.current.chatSession.associatedProjectName).toBe('历史项目')
  })

  test('preserves unsent draft attachments and project when chatflow prompts load later', async () => {
    const promptDeferred = createDeferred<ChatflowPromptsResponse>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockImplementation(() => promptDeferred.promise)

    const { result } = createHook()
    const attachment = new File(['合同内容'], 'contract.md', { type: 'text/markdown' })

    act(() => {
      result.current.changeChatInput('这是一段还没发送的草稿')
      result.current.addChatAttachments(createFileList([attachment]), 'file')
      result.current.setChatAssociatedProject({ id: 9901, name: '用户刚切换的项目' } as Project)
    })

    await waitFor(() => {
      expect(result.current.chatInput).toBe('这是一段还没发送的草稿')
    })
    expect(result.current.chatAttachments).toHaveLength(1)
    expect(result.current.chatAttachments[0]?.name).toBe('contract.md')
    expect(result.current.chatSession.associatedProjectId).toBe(9901)

    await act(async () => {
      promptDeferred.resolve({
        通用对话: [{ name: '新的通用提示语', description: '新的通用描述' }],
        工作聚焦: [{ name: '新的工作聚焦提示语', description: '新的工作聚焦描述' }],
        语义生图: [{ name: '新的语义生图提示语', description: '新的语义生图描述' }],
      })
      await promptDeferred.promise
    })

    await waitFor(() => {
      expect(result.current.chatSession.messages[0]?.content).toBe('新的工作聚焦描述')
    })
    expect(result.current.chatInput).toBe('这是一段还没发送的草稿')
    expect(result.current.chatAttachments).toHaveLength(1)
    expect(result.current.chatAttachments[0]?.name).toBe('contract.md')
    expect(result.current.chatSession.associatedProjectId).toBe(9901)
    expect(result.current.chatSession.associatedProjectName).toBe('用户刚切换的项目')
  })

  test('appends generated result to existing chat input instead of replacing it', () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result, notify } = createHook()

    act(() => {
      result.current.changeChatInput('已有草稿')
      result.current.readFromGenerated('生成结果')
    })

    expect(result.current.chatInput).toBe('已有草稿\n\n生成结果')
    expect(notify).toHaveBeenCalledWith('已将生成结果追加到输入框末尾')
  })

  test('removes thinking content before appending generated result', () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result, notify } = createHook()

    act(() => {
      result.current.changeChatInput('已有草稿')
      result.current.readFromGenerated('<think>内部推理</think>\n\n最终正文')
    })

    expect(result.current.chatInput).toBe('已有草稿\n\n最终正文')
    expect(result.current.chatInput).not.toContain('内部推理')
    expect(notify).toHaveBeenCalledWith('已将生成结果追加到输入框末尾')
  })

  test('starts focus and image conversations without preset project ids', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result, onWorkspaceProjectSelect } = createHook()

    act(() => {
      result.current.startNewConversation()
    })

    expect(result.current.chatSession.associatedProjectId).toBeUndefined()
    expect(onWorkspaceProjectSelect).toHaveBeenLastCalledWith(null)

    act(() => {
      result.current.setChatTab('image')
    })

    await waitFor(() => {
      expect(result.current.chatTab).toBe('image')
    })

    act(() => {
      result.current.startNewConversation()
    })

    expect(result.current.chatSession.associatedProjectId).toBeUndefined()
    expect(onWorkspaceProjectSelect).toHaveBeenLastCalledWith(null)
  })

  test('appends non-empty history records to existing chat input', () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result, notify } = createHook()

    act(() => {
      result.current.changeChatInput('已有草稿')
      result.current.handleHistoryDataConfirm([' 历史一 ', '', '历史二'])
    })

    expect(result.current.chatInput).toBe('已有草稿\n\n历史一\n\n历史二')
    expect(notify).toHaveBeenCalledWith('已将 2 条历史资料追加到输入框末尾')
  })

  test('removes thinking content before appending history records', () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result, notify } = createHook()

    act(() => {
      result.current.changeChatInput('已有草稿')
      result.current.handleHistoryDataConfirm(['<think>内部推理</think>\n\n最终正文'])
    })

    expect(result.current.chatInput).toBe('已有草稿\n\n最终正文')
    expect(result.current.chatInput).not.toContain('内部推理')
    expect(notify).toHaveBeenCalledWith('已将 1 条历史资料追加到输入框末尾')
  })

  test('skips history records that only contain thinking content', () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result, notify } = createHook()

    act(() => {
      result.current.changeChatInput('已有草稿')
      result.current.handleHistoryDataConfirm(['<think>只有思考过程</think>'])
    })

    expect(result.current.chatInput).toBe('已有草稿')
    expect(notify).not.toHaveBeenCalledWith('已将 1 条历史资料追加到输入框末尾')
  })

  test('opens project-scoped history dialog when reading history from an associated chat session', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const notify = jest.fn<(message: string) => void>()
    const setHistoryDialogOpen = jest.fn<(open: boolean) => void>()
    const onSessionLinked = jest.fn<() => void>()
    const onWorkspaceProjectSelect = jest.fn<(projectId: number | null) => void>()
    const openHistoryDialog = jest.fn<
      (options?: { projectId?: number; type?: string; title?: string }) => void
    >()

    const { result } = createHook({
      notify,
      setHistoryDialogOpen,
      onSessionLinked,
      onWorkspaceProjectSelect,
      openHistoryDialog,
    })

    act(() => {
      result.current.setChatAssociatedProjectLocal({ id: 77, name: '工学键盘' } as Project)
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(77)
    })

    act(() => {
      result.current.readFromHistory()
    })

    expect(openHistoryDialog).toHaveBeenCalledWith({
      projectId: 77,
      title: '读取项目历史资料：工学键盘',
    })
    expect(setHistoryDialogOpen).not.toHaveBeenCalledWith(true)
  })

})
