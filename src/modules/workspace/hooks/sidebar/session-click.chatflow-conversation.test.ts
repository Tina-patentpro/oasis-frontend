import { beforeEach, describe, expect, jest, test } from '@jest/globals'

const mockSetIsSessionOutputRestoring = jest.fn()

jest.mock('@/api/services', () => ({
  sessionService: {
    getSession: jest.fn(),
  },
}))

jest.mock('@/modules/workspace/events/session-output-restored-event', () => ({
  dispatchSessionOutputRestored: jest.fn(),
}))

jest.mock('@/utils/file-url', () => ({
  normalizeFileUrlList: jest.fn(() => []),
  normalizeFileUrlValue: jest.fn(() => undefined),
}))

jest.mock('../../stores', () => ({
  useContentStore: {
    getState: jest.fn(() => ({
      pages: [],
    })),
  },
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      setIsSessionOutputRestoring: mockSetIsSessionOutputRestoring,
    })),
  },
}))

jest.mock('./tool-version', () => ({
  resolveVersionForTool: jest.fn(() => 'v1'),
}))

import { sessionService } from '@/api/services'

import { handleWorkspaceSessionClick } from './session-click'

beforeEach(() => {
  jest.clearAllMocks()
  mockSetIsSessionOutputRestoring.mockClear()
})

describe('handleWorkspaceSessionClick chatflow conversation restore', () => {
  test('restores conversation id from fetched detail when historical inputs are initial null', async () => {
    const onChatSessionSelect = jest.fn((_payload: unknown) => ({ status: 'restored' as const }))
    const session = {
      id: 4,
      userId: 1,
      projectId: 0,
      title: '工作聚焦',
      toolType: 'chat.focus',
      modelVersion: 'v1',
      status: 'completed',
      createdAt: '2026-06-19T13:50:18.000Z',
      updatedAt: '2026-06-19T13:50:18.000Z',
      type: 2,
      answer_text: '已记录',
      inputs: {
        query: '请记住本轮关键内容：质量打磨记忆探针 = MEMORY_PROBE_0729_BROWSER。请仅回复：已记录',
        type: 1,
        conversation_id: null,
      },
      conversationId: 'conv-from-response',
    }

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(session as any)

    const result = await handleWorkspaceSessionClick({
      session: session as any,
      projectList: [],
      availableTabs: [],
      toolMetadataByName: {},
      filteredToolMetadataByName: {},
      tab: 'chat',
      tool: { name: '工作聚焦', ver: 'v1' },
      setTab: jest.fn(),
      setTool: jest.fn(),
      notify: jest.fn(),
      resolveToolName: (toolKey) => toolKey,
      onChatSessionSelect,
      loadSessionFiles: jest.fn(),
      requestApiDetailLoad: jest.fn(),
    })

    const payload = onChatSessionSelect.mock.calls[0]?.[0] as any

    expect(payload.tab).toBe('focus')
    expect(payload.detail.conversationId).toBe('conv-from-response')
    expect(payload.restoredProjectId).toBeNull()
    expect(result).toEqual({
      status: 'loaded',
      sessionId: 4,
      surface: 'chat',
      restoredProjectId: null,
    })
  })

  test('preserves a list conversation id when the fetched detail omits it', async () => {
    const onChatSessionSelect = jest.fn((_payload: unknown) => ({ status: 'restored' as const }))
    const session = {
      id: 5,
      userId: 1,
      projectId: null,
      title: '旧聊天记录',
      toolType: 'chat.general',
      modelVersion: 'v1',
      status: 'completed',
      createdAt: '2026-06-19T13:50:18.000Z',
      updatedAt: '2026-06-19T13:50:18.000Z',
      answer_text: '历史回答',
      inputs: { query: '继续旧对话' },
      conversationId: 'conv-list-only',
    }
    const detail = {
      ...session,
      inputs: { query: '继续旧对话', conversation_id: '   ' },
      conversationId: null,
    }

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(detail as any)

    const result = await handleWorkspaceSessionClick({
      session: session as any,
      projectList: [],
      availableTabs: [],
      toolMetadataByName: {},
      filteredToolMetadataByName: {},
      tab: 'chat',
      tool: { name: '旧聊天记录', ver: 'v1' },
      setTab: jest.fn(),
      setTool: jest.fn(),
      notify: jest.fn(),
      resolveToolName: (toolKey) => toolKey,
      onChatSessionSelect,
    })

    const payload = onChatSessionSelect.mock.calls[0]?.[0] as any
    expect(payload.detail.conversationId).toBe('conv-list-only')
    expect(result).toMatchObject({ status: 'loaded', surface: 'chat' })
  })
})
