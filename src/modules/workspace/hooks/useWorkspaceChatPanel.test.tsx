import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { ChatSession, ChatTabKey, Theme } from '@/types'
import type { Project, SessionDetail } from '@/types/api'

const mockUseChatManagement = jest.fn()
let mockChatTabVisibility: Record<ChatTabKey, boolean>
let mockIsSessionOutputRestoring: boolean

jest.mock('@/components/ChatPanel', () => ({
  ChatPanel: () => null,
}))

jest.mock('@/hooks', () => ({
  useChatManagement: (...args: unknown[]) => mockUseChatManagement(...args),
}))

jest.mock('../stores', () => ({
  useContentStore: (selector: (state: { generated: string }) => unknown) =>
    selector({ generated: '中栏生成内容' }),
  useWorkspaceStore: (selector: (state: { isSessionOutputRestoring: boolean }) => unknown) =>
    selector({ isSessionOutputRestoring: mockIsSessionOutputRestoring }),
}))

jest.mock('@/stores/useModelPreferenceStore', () => ({
  useModelPreferenceStore: () => ({
    chatTabVisibility: mockChatTabVisibility,
  }),
}))

import { useWorkspaceChatPanel } from './useWorkspaceChatPanel'

const theme: Theme = {
  background: '#eff6ff',
  primary: '#93c5fd',
  primaryHover: '#60a5fa',
  primaryForeground: '#111827',
  name: '浅蓝',
}

const project: Project = {
  id: 7,
  userId: 1,
  name: '重点项目',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const sessionDetail: SessionDetail = {
  id: 21,
  userId: 1,
  title: '历史会话',
  toolType: 'chat',
  modelVersion: 'focus',
  status: 'completed',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createChatSession(): ChatSession {
  return {
    input: '',
    attachments: [],
    messages: [{ id: 'welcome', role: 'assistant', content: '你好' }],
  }
}

function createChatManagementResult(overrides: Record<string, unknown> = {}) {
  return {
    chatTab: 'general',
    setChatTab: jest.fn(),
    chatSession: createChatSession(),
    chatLoading: false,
    chatError: null,
    readMenuOpen: false,
    setReadMenuOpen: jest.fn(),
    readMenuBtnRef: { current: null },
    readMenuRef: { current: null },
    changeChatInput: jest.fn(),
    addChatAttachments: jest.fn(),
    removeChatAttachment: jest.fn(),
    sendChat: jest.fn(),
    regenerateChat: jest.fn(),
    clearChat: jest.fn(),
    setChatAssociatedProject: jest.fn(),
    setChatAssociatedProjectLocal: jest.fn(),
    readFromGenerated: jest.fn(),
    readFromHistory: jest.fn(),
    handleHistoryDataConfirm: jest.fn(),
    hydrateChatSessionFromDetail: jest.fn(),
    startNewConversation: jest.fn(),
    ...overrides,
  }
}

function createParams(notify = jest.fn()) {
  return {
    notify,
    showConfirm: jest.fn(),
    hideConfirm: jest.fn(),
    historyDialog: {
      isOpen: false,
      open: jest.fn(),
      close: jest.fn(),
      setOpen: jest.fn(),
      options: null,
    },
    chatWidth: 420,
    currentTheme: theme,
    projects: [project],
    openQuickCreateProject: jest.fn(),
    refreshSessions: jest.fn(async () => undefined),
    onWorkspaceProjectSelect: jest.fn(),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockChatTabVisibility = {
    general: true,
    focus: true,
    image: true,
  }
  mockIsSessionOutputRestoring = false
  mockUseChatManagement.mockReturnValue(createChatManagementResult())
})

describe('useWorkspaceChatPanel', () => {
  test('loads a history session into its own visible chat tab', () => {
    const hydrateChatSessionFromDetail = jest.fn()
    mockUseChatManagement.mockReturnValue(
      createChatManagementResult({ hydrateChatSessionFromDetail }),
    )

    const { result } = renderHook(() => useWorkspaceChatPanel(createParams()))

    let restoreResult: unknown
    act(() => {
      restoreResult = result.current.loadSessionFromSidebar(sessionDetail, 'focus', project, 33)
    })

    expect(hydrateChatSessionFromDetail).toHaveBeenCalledWith(sessionDetail, 'focus', project, 33)
    expect(restoreResult).toEqual({ status: 'restored' })
  })

  test('does not load a hidden tab history session into another visible tab', () => {
    mockChatTabVisibility = {
      general: true,
      focus: false,
      image: true,
    }
    const notify = jest.fn()
    const hydrateChatSessionFromDetail = jest.fn()
    mockUseChatManagement.mockReturnValue(
      createChatManagementResult({ hydrateChatSessionFromDetail }),
    )

    const { result } = renderHook(() => useWorkspaceChatPanel(createParams(notify)))

    let restoreResult: unknown
    act(() => {
      restoreResult = result.current.loadSessionFromSidebar(sessionDetail, 'focus', project, 33)
    })

    expect(hydrateChatSessionFromDetail).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(
      '该历史会话所属的对话模式当前已隐藏，请先在模型设置中启用后再打开',
    )
    expect(notify).toHaveBeenCalledTimes(1)
    expect(restoreResult).toEqual({ status: 'blocked', reason: 'hidden-mode' })
  })

  test('passes the history dialog opener to chat management for project-scoped reads', () => {
    const params = createParams()

    renderHook(() => useWorkspaceChatPanel(params))

    expect(mockUseChatManagement).toHaveBeenCalledWith(
      expect.any(Function),
      params.historyDialog.setOpen,
      expect.any(Function),
      expect.any(Function),
      params.historyDialog.open,
    )
  })

  test('keeps chat input loading while a sidebar session is restoring', () => {
    mockIsSessionOutputRestoring = true

    const { result } = renderHook(() => useWorkspaceChatPanel(createParams()))

    expect(result.current.chatPanelProps.loading).toBe(true)
  })
})
