import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { Project, Session, SessionDetail } from '@/types/api'

const mockSetIsSessionOutputRestoring = jest.fn()
type MockContentState = {
  pages: Array<{ key: string; label?: string }>
  inputPage: string
  inputSections: Record<string, string>
  generated: string
  versions: Array<{ id: string; time: string; text: string }>
  setInputSection: jest.Mock
  setGenerated: jest.Mock
  resetInputSections: jest.Mock
  clearVersions: jest.Mock
  addVersion: jest.Mock
  setInputPage: jest.Mock
}

let mockContentState: MockContentState
const mockSetInputSection = jest.fn((page: string, content: string) => {
  mockContentState.inputSections = { ...mockContentState.inputSections, [page]: content }
})
const mockSetGenerated = jest.fn((generated: string) => {
  mockContentState.generated = generated
})
const mockResetInputSections = jest.fn(() => {
  mockContentState.inputSections = Object.fromEntries(
    mockContentState.pages.map((page) => [page.key, '']),
  )
})
const mockClearVersions = jest.fn(() => {
  mockContentState.versions = []
})
const mockAddVersion = jest.fn((version: { id: string; time: string; text: string }) => {
  mockContentState.versions = [...mockContentState.versions, version]
})
const mockSetInputPage = jest.fn((inputPage: string) => {
  mockContentState.inputPage = inputPage
})
const mockSetContentState = jest.fn((patch: Partial<MockContentState>) => {
  Object.assign(mockContentState, patch)
})
const mockWorkspaceState = {
  tab: 'x-tab',
  tool: { name: 'X 工具', ver: 'x-version' },
  setIsSessionOutputRestoring: mockSetIsSessionOutputRestoring,
  activeSessionRestoreOwner: null as symbol | null,
  activeSessionRestoreCancel: null as (() => void) | null,
  pendingSessionRestoreToolKey: null as string | null,
  pendingSessionRestoreToolOwner: null as symbol | null,
  sessionRestoreCommitRevision: 0,
  beginSessionRestore: jest.fn((createCancel: (owner: symbol) => () => void) => {
    mockWorkspaceState.activeSessionRestoreCancel?.()
    const owner = Symbol('test-session-restore')
    mockWorkspaceState.activeSessionRestoreOwner = owner
    mockWorkspaceState.activeSessionRestoreCancel = createCancel(owner)
    mockSetIsSessionOutputRestoring(true)
    return owner
  }),
  cancelActiveSessionRestore: jest.fn(() => {
    mockWorkspaceState.activeSessionRestoreCancel?.()
  }),
  setTabForSessionRestore: jest.fn((owner: symbol, tab: string) => {
    if (mockWorkspaceState.activeSessionRestoreOwner === owner) {
      mockWorkspaceState.tab = tab
    }
  }),
  setToolForSessionRestore: jest.fn(
    (owner: symbol, tool: { name: string; ver: string }) => {
      if (mockWorkspaceState.activeSessionRestoreOwner !== owner) {
        return
      }
      mockWorkspaceState.tool = tool
      mockWorkspaceState.pendingSessionRestoreToolKey = `${tool.name}::${tool.ver}`
      mockWorkspaceState.pendingSessionRestoreToolOwner = owner
    },
  ),
  finishSessionRestore: jest.fn((owner: symbol, committed: boolean) => {
    if (mockWorkspaceState.activeSessionRestoreOwner !== owner) {
      return
    }
    mockWorkspaceState.activeSessionRestoreOwner = null
    mockWorkspaceState.activeSessionRestoreCancel = null
    mockSetIsSessionOutputRestoring(false)
    if (committed) {
      mockWorkspaceState.sessionRestoreCommitRevision += 1
    }
  }),
}
const mockWaitForInputPagesReady = jest.fn<() => Promise<void>>()

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
    getState: jest.fn(() => mockContentState),
    setState: (patch: Partial<MockContentState>) => mockSetContentState(patch),
  },
  useWorkspaceStore: {
    getState: jest.fn(() => mockWorkspaceState),
  },
}))

jest.mock('./session-click-input-restore', () => {
  const actual = jest.requireActual<typeof import('./session-click-input-restore')>(
    './session-click-input-restore',
  )
  return {
    ...actual,
    waitForInputPagesReady: () => mockWaitForInputPagesReady(),
  }
})

jest.mock('./tool-version', () => ({
  resolveVersionForTool: jest.fn(() => 'v1'),
}))

import { sessionService } from '@/api/services'

import { handleWorkspaceSessionClick } from './session-click'
import { useWorkspaceSessionClickHandler } from './use-workspace-session-click-handler'

const project7 = { id: 7, name: '列表项目' } as Project
const project33 = { id: 33, name: '详情项目' } as Project

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 41,
    userId: 1,
    projectId: 7,
    title: '历史会话',
    toolType: 'chat.focus',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-07-17T00:00:00.000Z',
    updatedAt: '2026-07-17T00:00:00.000Z',
    type: 2,
    inputs: { query: '恢复聊天', type: 1, conversation_id: 'conversation-41' },
    ...overrides,
  }
}

function createDetail(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    ...createSession(),
    ...overrides,
  }
}

function createParams(
  session: Session,
  overrides: Record<string, unknown> = {},
): Parameters<typeof handleWorkspaceSessionClick>[0] {
  return {
    session,
    projectList: [project7, project33],
    availableTabs: [],
    toolMetadataByName: {},
    filteredToolMetadataByName: {},
    tab: 'workspace',
    tool: { name: '工具', ver: 'fast' },
    setTab: jest.fn(),
    setTool: jest.fn(),
    notify: jest.fn(),
    resolveToolName: (toolKey) => toolKey,
    onChatSessionSelect: jest.fn((_payload: unknown) => ({ status: 'restored' })) as any,
    loadSessionFiles: jest.fn(),
    requestApiDetailLoad: jest.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockContentState = {
    pages: [{ key: 'x-input', label: 'X 输入' }],
    inputPage: 'x-input',
    inputSections: { 'x-input': 'X 尚未保存的输入' },
    generated: 'X 已生成内容',
    versions: [{ id: 'x-version', time: '2026-07-17T00:00:00.000Z', text: 'X 版本' }],
    setInputSection: mockSetInputSection,
    setGenerated: mockSetGenerated,
    resetInputSections: mockResetInputSections,
    clearVersions: mockClearVersions,
    addVersion: mockAddVersion,
    setInputPage: mockSetInputPage,
  }
  mockWorkspaceState.tab = 'x-tab'
  mockWorkspaceState.tool = { name: 'X 工具', ver: 'x-version' }
  mockWorkspaceState.activeSessionRestoreOwner = null
  mockWorkspaceState.activeSessionRestoreCancel = null
  mockWorkspaceState.pendingSessionRestoreToolKey = null
  mockWorkspaceState.pendingSessionRestoreToolOwner = null
  mockWorkspaceState.sessionRestoreCommitRevision = 0
  mockWaitForInputPagesReady.mockResolvedValue()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('handleWorkspaceSessionClick transaction', () => {
  test('restores X atomically when workflow A is preparing schema and newer B detail fails', async () => {
    let releaseSchemaWait!: () => void
    mockWaitForInputPagesReady.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releaseSchemaWait = resolve
      }),
    )
    const workflowA = createSession({
      id: 51,
      projectId: 7,
      title: 'A 工具',
      api_name: 'A 工具',
      toolType: 'workflow',
      type: 1,
      inputs: { 'a-input': 'A 输入' },
    })
    const failedB = createSession({ id: 52, title: 'B 聊天' })
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockImplementation((sessionId) => {
      if (sessionId === workflowA.id) {
        return Promise.resolve(
          createDetail({
            id: workflowA.id,
            title: 'A 工具',
            api_name: 'A 工具',
            toolType: 'workflow',
            type: 1,
            inputs: { 'a-input': 'A 输入' },
          }),
        )
      }
      return Promise.reject(new Error('B detail 500'))
    })

    const setTab = jest.fn((tab: string) => {
      mockWorkspaceState.tab = tab
    })
    const setTool = jest.fn((tool: { name: string; ver: string }) => {
      mockWorkspaceState.tool = tool
    })
    const params = {
      availableTabs: [{ k: 'a-tab', tools: ['A 工具'] }],
      filteredToolMetadataByName: { 'A 工具': { versions: [{ id: 'v1' }] } },
      loadSessionFiles: jest.fn(),
      notify: jest.fn(),
      onChatSessionSelect: jest.fn(() => ({ status: 'restored' as const })),
      onSessionActivated: jest.fn(),
      projectList: [project7, project33],
      requestApiDetailLoad: jest.fn(),
      resolveToolName: (value: string) => value,
      sessionClickSeqRef: { current: 0 },
      setPendingSessionId: jest.fn(),
      setSelectedProjectId: jest.fn(),
      setSelectedSessionId: jest.fn(),
      setTab,
      setTool,
      tab: 'x-tab',
      tool: { name: 'X 工具', ver: 'x-version' },
      toolMetadataByName: { 'A 工具': { versions: [{ id: 'v1' }] } },
    }
    const { result } = renderHook(() => useWorkspaceSessionClickHandler(params))

    let workflowPromise!: Promise<void>
    act(() => {
      workflowPromise = result.current.handleSessionClick(workflowA)
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockWaitForInputPagesReady).toHaveBeenCalledTimes(1)

    // Simulate the provisional schema commit that can occur while A is waiting.
    mockContentState.pages = [{ key: 'a-input', label: 'A 输入' }]
    mockContentState.inputPage = 'a-input'
    mockContentState.inputSections = { 'a-input': '' }

    let failedPromise!: Promise<void>
    act(() => {
      failedPromise = result.current.handleSessionClick(failedB)
    })
    const stateImmediatelyAfterBClick = {
      tab: mockWorkspaceState.tab,
      tool: { ...mockWorkspaceState.tool },
      pages: mockContentState.pages.map((page) => ({ ...page })),
      inputPage: mockContentState.inputPage,
      inputSections: { ...mockContentState.inputSections },
      generated: mockContentState.generated,
      versions: mockContentState.versions.map((version) => ({ ...version })),
    }
    await act(async () => {
      await failedPromise
      releaseSchemaWait()
      await workflowPromise
    })

    const expectedX = {
      tab: 'x-tab',
      tool: { name: 'X 工具', ver: 'x-version' },
      pages: [{ key: 'x-input', label: 'X 输入' }],
      inputPage: 'x-input',
      inputSections: { 'x-input': 'X 尚未保存的输入' },
      generated: 'X 已生成内容',
      versions: [{ id: 'x-version', time: '2026-07-17T00:00:00.000Z', text: 'X 版本' }],
    }
    expect(stateImmediatelyAfterBClick).toEqual(expectedX)
    expect({
      tab: mockWorkspaceState.tab,
      tool: mockWorkspaceState.tool,
      pages: mockContentState.pages,
      inputPage: mockContentState.inputPage,
      inputSections: mockContentState.inputSections,
      generated: mockContentState.generated,
      versions: mockContentState.versions,
    }).toEqual(expectedX)
    expect(params.setSelectedSessionId).not.toHaveBeenCalled()
    expect(params.onSessionActivated).not.toHaveBeenCalled()
  })

  test('rejects the transaction when the authoritative detail request fails', async () => {
    const session = createSession()
    const notify = jest.fn()
    const onChatSessionSelect = jest.fn()
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockRejectedValue(new Error('detail 500'))

    const result = await handleWorkspaceSessionClick(
      createParams(session, { notify, onChatSessionSelect }),
    )

    expect(result).toEqual({ status: 'failed', sessionId: 41, reason: 'detail-load' })
    expect(onChatSessionSelect).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalledWith('会话"历史会话"加载成功')
    expect(warning).toHaveBeenCalledTimes(1)
    expect(warning).toHaveBeenCalledWith('[workspace] 会话详情加载失败')
    expect(mockSetIsSessionOutputRestoring).not.toHaveBeenCalled()
  })

  test('maps a hidden chat mode refusal without reporting success', async () => {
    const session = createSession()
    const notify = jest.fn()
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(createDetail())

    const result = await handleWorkspaceSessionClick(
      createParams(session, {
        notify,
        onChatSessionSelect: jest.fn(() => ({ status: 'blocked', reason: 'hidden-mode' })),
      }) as any,
    )

    expect(result).toEqual({ status: 'failed', sessionId: 41, reason: 'chat-mode-hidden' })
    expect(notify).not.toHaveBeenCalledWith('会话"历史会话"加载成功')
  })

  test('maps a missing outer chat callback to handler unavailable', async () => {
    const session = createSession()
    const notify = jest.fn()
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(createDetail())

    const result = await handleWorkspaceSessionClick(
      createParams(session, { notify, onChatSessionSelect: undefined }),
    )

    expect(result).toEqual({
      status: 'failed',
      sessionId: 41,
      reason: 'chat-handler-unavailable',
    })
    expect(notify).not.toHaveBeenCalledWith('会话"历史会话"加载成功')
  })

  test('fails closed when a legacy chat callback returns no restore result', async () => {
    const session = createSession()
    const notify = jest.fn()
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(createDetail())

    const result = await handleWorkspaceSessionClick(
      createParams(session, {
        notify,
        onChatSessionSelect: jest.fn(() => undefined) as any,
      }),
    )

    expect(result).toEqual({
      status: 'failed',
      sessionId: 41,
      reason: 'chat-handler-unavailable',
    })
    expect(notify).toHaveBeenCalledWith('当前无法恢复该聊天会话，请稍后重试')
    expect(notify).not.toHaveBeenCalledWith('会话"历史会话"加载成功')
  })

  test('maps a chat restore exception without logging the exception object', async () => {
    const session = createSession()
    const notify = jest.fn()
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(createDetail())

    const result = await handleWorkspaceSessionClick(
      createParams(session, {
        notify,
        onChatSessionSelect: jest.fn(() => {
          throw new Error('sensitive restore detail')
        }),
      }),
    )

    expect(result).toEqual({ status: 'failed', sessionId: 41, reason: 'restore-failed' })
    expect(errorLog.mock.calls.flat()).not.toContainEqual(expect.any(Error))
    expect(warning).toHaveBeenCalledWith('[workspace] 会话恢复失败')
    expect(warning.mock.calls.flat()).not.toContainEqual(expect.any(Error))
    expect(notify).not.toHaveBeenCalledWith('会话"历史会话"加载成功')
  })

  test('uses the detail project id as the chat restore authority', async () => {
    const session = createSession({ projectId: 7 })
    const onChatSessionSelect = jest.fn((_payload: unknown) => ({ status: 'restored' }))
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(createDetail({ projectId: 33 }))

    const result = await handleWorkspaceSessionClick(
      createParams(session, { onChatSessionSelect }) as any,
    )

    expect(onChatSessionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        project: project33,
        restoredProjectId: 33,
      }),
    )
    expect(result).toEqual({
      status: 'loaded',
      sessionId: 41,
      surface: 'chat',
      restoredProjectId: 33,
    })
  })

  test('preserves an authoritative workflow project id absent from the root list', async () => {
    const session = createSession({ projectId: 7, type: 1, toolType: 'workflow' })
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(createDetail({ projectId: 55, type: 1, toolType: 'workflow', inputs: {} }))

    const result = await handleWorkspaceSessionClick(
      createParams(session, { projectList: [project7], onChatSessionSelect: undefined }),
    )

    expect(result).toEqual({
      status: 'loaded',
      sessionId: 41,
      surface: 'workflow',
      restoredProjectId: 55,
    })
  })

  test('falls back to the list project only when the detail project field is missing', async () => {
    const session = createSession({ projectId: 7 })
    const onChatSessionSelect = jest.fn((_payload: unknown) => ({ status: 'restored' }))
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(createDetail({ projectId: undefined }))

    await handleWorkspaceSessionClick(createParams(session, { onChatSessionSelect }) as any)

    expect(onChatSessionSelect).toHaveBeenCalledWith(
      expect.objectContaining({ restoredProjectId: 7 }),
    )
  })

  test('does not fall back to the list project when detail explicitly has no project', async () => {
    const session = createSession({ projectId: 7 })
    const onChatSessionSelect = jest.fn((_payload: unknown) => ({ status: 'restored' }))
    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(createDetail({ projectId: null }))

    await handleWorkspaceSessionClick(createParams(session, { onChatSessionSelect }) as any)

    expect(onChatSessionSelect).toHaveBeenCalledWith(
      expect.objectContaining({ project: null, restoredProjectId: null }),
    )
  })
})
