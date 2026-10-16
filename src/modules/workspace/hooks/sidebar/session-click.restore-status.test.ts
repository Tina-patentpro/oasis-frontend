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
      inputPage: '',
      inputSections: {},
      generated: '',
      versions: [],
    })),
    setState: jest.fn(),
  },
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      tab: 'tab-a',
      tool: { name: '权利要求书生成 Fast', ver: 'v1' },
      setIsSessionOutputRestoring: mockSetIsSessionOutputRestoring,
    })),
  },
}))

jest.mock('./tool-version', () => ({
  resolveVersionForTool: jest.fn(() => 'v1'),
}))

import { handleWorkspaceSessionClick, resolveRestoredGenerationStatus } from './session-click'
import { sessionService } from '@/api/services'
import { useContentStore } from '../../stores'

beforeEach(() => {
  jest.clearAllMocks()
  mockSetIsSessionOutputRestoring.mockClear()
})

describe('resolveRestoredGenerationStatus', () => {
  test('returns idle for draft session without restored text or files', () => {
    expect(
      resolveRestoredGenerationStatus({
        status: 'draft',
        hasText: false,
        hasFiles: false,
      }),
    ).toBe('idle')
  })

  test('returns success for draft session when restored text exists', () => {
    expect(
      resolveRestoredGenerationStatus({
        status: 'draft',
        hasText: true,
        hasFiles: false,
      }),
    ).toBe('success')
  })

  test('returns success for draft session when restored files exist', () => {
    expect(
      resolveRestoredGenerationStatus({
        status: 'draft',
        hasText: false,
        hasFiles: true,
      }),
    ).toBe('success')
  })

  test('returns idle for completed session without restored text or files', () => {
    expect(
      resolveRestoredGenerationStatus({
        status: 'completed',
        hasText: false,
        hasFiles: false,
      }),
    ).toBe('idle')
  })
})

describe('handleWorkspaceSessionClick restore text cleanup', () => {
  test('leaves restore lease ownership to the caller when a detail request becomes stale', async () => {
    let isLatestClick = true
    let resolveDetail: (value: unknown) => void = () => undefined
    const detailPromise = new Promise((resolve) => {
      resolveDetail = resolve
    })
    const session = {
      id: 9,
      userId: 1,
      projectId: 1,
      title: '旧点击',
      toolType: 'workflow',
      modelVersion: 'fast',
      status: 'completed',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
      type: 1,
      answer_text: '旧点击结果',
      api_name: '权利要求书生成-Fast',
      inputs: {},
    }

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockReturnValue(detailPromise as any)

    const restorePromise = handleWorkspaceSessionClick({
      session: session as any,
      projectList: [{ id: 1, name: '项目A' } as any],
      availableTabs: [{ k: 'tab-a', tools: ['权利要求书生成-Fast'] }],
      toolMetadataByName: {
        '权利要求书生成-Fast': {},
      },
      filteredToolMetadataByName: {
        '权利要求书生成-Fast': {},
      },
      tab: 'tab-a',
      tool: { name: '权利要求书生成-Fast', ver: 'v1' },
      setTab: jest.fn(),
      setTool: jest.fn(),
      notify: jest.fn(),
      resolveToolName: (toolKey) => toolKey,
      loadSessionFiles: jest.fn(),
      requestApiDetailLoad: jest.fn(),
      isSessionClickCurrent: () => isLatestClick,
    })

    isLatestClick = false
    resolveDetail(session)
    await expect(restorePromise).resolves.toEqual({ status: 'stale', sessionId: 9 })

    expect(mockSetIsSessionOutputRestoring).not.toHaveBeenCalled()
  })

  test('removes workflow output field label when restoring legacy session text', async () => {
    const setGenerated = jest.fn()
    const addVersion = jest.fn()
    const setInputPage = jest.fn()
    const resetInputSections = jest.fn()
    const clearVersions = jest.fn()
    const notify = jest.fn()

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue({
      id: 1,
      userId: 1,
      projectId: 1,
      title: '权利要求书生成-Fast',
      toolType: 'workflow',
      modelVersion: 'fast',
      status: 'completed',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
      type: 1,
      answer_text: '权利要求书和生成报告: 本发明公开了一种自适应办公椅系统。',
      api_name: '权利要求书生成-Fast',
      inputs: {},
    } as any)
    ;(useContentStore.getState as jest.Mock).mockReturnValue({
      pages: [],
      inputPage: '',
      inputSections: {},
      generated: '',
      versions: [],
      setInputSection: jest.fn(),
      setGenerated,
      resetInputSections,
      clearVersions,
      addVersion,
      setInputPage,
    })

    await handleWorkspaceSessionClick({
      session: {
        id: 1,
        userId: 1,
        projectId: 1,
        title: '权利要求书生成-Fast',
        toolType: 'workflow',
        modelVersion: 'fast',
        status: 'completed',
        createdAt: '2026-05-06T00:00:00.000Z',
        updatedAt: '2026-05-06T00:00:00.000Z',
        type: 1,
        answer_text: '权利要求书和生成报告: 本发明公开了一种自适应办公椅系统。',
        api_name: '权利要求书生成-Fast',
        inputs: {},
      },
      projectList: [{ id: 1, name: '项目A' } as any],
      availableTabs: [{ k: 'tab-a', tools: ['权利要求书生成-Fast'] }],
      toolMetadataByName: {
        '权利要求书生成-Fast': {},
      },
      filteredToolMetadataByName: {
        '权利要求书生成-Fast': {},
      },
      tab: 'tab-a',
      tool: { name: '权利要求书生成-Fast', ver: 'v1' },
      setTab: jest.fn(),
      setTool: jest.fn(),
      notify,
      resolveToolName: (toolKey) => toolKey,
      loadSessionFiles: jest.fn(),
      requestApiDetailLoad: jest.fn(),
    })

    expect(setGenerated).toHaveBeenLastCalledWith('本发明公开了一种自适应办公椅系统。')
    expect(addVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '本发明公开了一种自适应办公椅系统。',
      }),
    )
  })

  test('skips stale workflow restore after waiting for dynamic input pages', async () => {
    const setInputSection = jest.fn()
    const setGenerated = jest.fn()
    const addVersion = jest.fn()
    const setInputPage = jest.fn()
    const notify = jest.fn()
    let isLatestClick = true
    const contentState = {
      pages: [{ key: 'overview' }],
      inputPage: 'overview',
      inputSections: { overview: '当前输入' },
      generated: '当前生成结果',
      versions: [{ id: 'current', time: '2026-05-06T00:00:00.000Z', text: '当前版本' }],
      setInputSection,
      setGenerated,
      resetInputSections: jest.fn(),
      clearVersions: jest.fn(),
      addVersion,
      setInputPage,
    }
    const session = {
      id: 6,
      userId: 1,
      projectId: 1,
      title: '动态输入页会话',
      toolType: 'workflow',
      modelVersion: 'fast',
      status: 'completed',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
      type: 1,
      answer_text: '旧会话生成结果',
      api_name: '权利要求书生成-Fast',
      inputs: [{ sectionKey: 'claims', content: '旧会话输入' }],
    }

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(session as any)
    ;(useContentStore.getState as jest.Mock).mockReturnValue(contentState)

    await handleWorkspaceSessionClick({
      session: session as any,
      projectList: [{ id: 1, name: '项目A' } as any],
      availableTabs: [{ k: 'tab-a', tools: ['权利要求书生成-Fast'] }],
      toolMetadataByName: {
        '权利要求书生成-Fast': {},
      },
      filteredToolMetadataByName: {
        '权利要求书生成-Fast': {},
      },
      tab: 'tab-a',
      tool: { name: '权利要求书生成-Fast', ver: 'v1' },
      setTab: jest.fn(),
      setTool: jest.fn(),
      notify,
      resolveToolName: (toolKey) => toolKey,
      loadSessionFiles: jest.fn(),
      requestApiDetailLoad: () => {
        setTimeout(() => {
          isLatestClick = false
          contentState.pages = [{ key: 'claims' }]
        }, 20)
      },
      isSessionClickCurrent: () => isLatestClick,
    })

    expect(setInputSection).not.toHaveBeenCalled()
    expect(setGenerated).not.toHaveBeenCalled()
    expect(setGenerated).not.toHaveBeenCalledWith('旧会话生成结果')
    expect(addVersion).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalledWith('会话"动态输入页会话"加载成功')
  })
})

describe('handleWorkspaceSessionClick chatflow image restore', () => {
  test('skips stale chatflow restore when a newer session click is active', async () => {
    const onChatSessionSelect = jest.fn((_payload: unknown) => ({ status: 'restored' as const }))
    let isLatestClick = true
    let resolveDetail: (value: unknown) => void = () => undefined
    const detailPromise = new Promise((resolve) => {
      resolveDetail = resolve
    })
    const session = {
      id: 4,
      userId: 1,
      projectId: 1,
      title: '语义生图',
      toolType: 'chat.image',
      modelVersion: 'v1',
      status: 'completed',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
      type: 2,
      answer_text: '旧会话图片',
      inputs: {
        query: '画旧图',
        type: 2,
      },
      file_url: 'https://cdn.example.com/old.png',
    }

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockReturnValue(detailPromise as any)

    const restorePromise = handleWorkspaceSessionClick({
      session: session as any,
      projectList: [{ id: 1, name: '项目A' } as any],
      availableTabs: [],
      toolMetadataByName: {},
      filteredToolMetadataByName: {},
      tab: 'chat',
      tool: { name: '语义生图', ver: 'v1' },
      setTab: jest.fn(),
      setTool: jest.fn(),
      notify: jest.fn(),
      resolveToolName: (toolKey) => toolKey,
      onChatSessionSelect,
      loadSessionFiles: jest.fn(),
      requestApiDetailLoad: jest.fn(),
      isSessionClickCurrent: () => isLatestClick,
    } as Parameters<typeof handleWorkspaceSessionClick>[0] & {
      isSessionClickCurrent: () => boolean
    })

    isLatestClick = false
    resolveDetail(session)
    await restorePromise

    expect(onChatSessionSelect).not.toHaveBeenCalled()
  })

  test('restores generated image URL into assistant message for image chat history', async () => {
    const onChatSessionSelect = jest.fn((_payload: unknown) => ({ status: 'restored' as const }))
    const imageUrl = 'https://cdn.example.com/generated-cat.png'
    const session = {
      id: 2,
      userId: 1,
      projectId: 1,
      title: '语义生图',
      toolType: 'chat.image',
      modelVersion: 'v1',
      status: 'completed',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
      type: 2,
      answer_text: '已生成图片',
      inputs: {
        query: '画一只猫',
        type: 2,
        conversation_id: 'conversation-1',
      },
      file_url: imageUrl,
    }

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(session as any)

    await handleWorkspaceSessionClick({
      session: session as any,
      projectList: [{ id: 1, name: '项目A' } as any],
      availableTabs: [],
      toolMetadataByName: {},
      filteredToolMetadataByName: {},
      tab: 'chat',
      tool: { name: '语义生图', ver: 'v1' },
      setTab: jest.fn(),
      setTool: jest.fn(),
      notify: jest.fn(),
      resolveToolName: (toolKey) => toolKey,
      onChatSessionSelect,
      loadSessionFiles: jest.fn(),
      requestApiDetailLoad: jest.fn(),
    })

    const payload = onChatSessionSelect.mock.calls[0]?.[0] as any
    const assistantMessage = payload.detail.chatMessages.find(
      (message: { role: string }) => message.role === 'assistant',
    )

    expect(payload.tab).toBe('image')
    expect(assistantMessage.content).toContain('已生成图片')
    expect(assistantMessage.content).toContain(imageUrl)
  })

  test('uses list image URL when fetched detail has empty file_url array', async () => {
    const onChatSessionSelect = jest.fn((_payload: unknown) => ({ status: 'restored' as const }))
    const imageUrl = '/files/tools/restored-image.png?timestamp=1&sign=2'
    const session = {
      id: 3,
      userId: 1,
      projectId: 1,
      title: '语义生图',
      toolType: 'chat.image',
      modelVersion: 'v1',
      status: 'completed',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
      type: 2,
      answer_text: '已生成图片',
      inputs: {
        query: '画一张流程图',
        type: 2,
      },
      file_url: imageUrl,
    }

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue({
      ...session,
      file_url: [],
      file_output: [],
    } as any)

    await handleWorkspaceSessionClick({
      session: session as any,
      projectList: [{ id: 1, name: '项目A' } as any],
      availableTabs: [],
      toolMetadataByName: {},
      filteredToolMetadataByName: {},
      tab: 'chat',
      tool: { name: '语义生图', ver: 'v1' },
      setTab: jest.fn(),
      setTool: jest.fn(),
      notify: jest.fn(),
      resolveToolName: (toolKey) => toolKey,
      onChatSessionSelect,
      loadSessionFiles: jest.fn(),
      requestApiDetailLoad: jest.fn(),
    })

    const payload = onChatSessionSelect.mock.calls[0]?.[0] as any
    const assistantMessage = payload.detail.chatMessages.find(
      (message: { role: string }) => message.role === 'assistant',
    )

    expect(assistantMessage.content).toContain(imageUrl)
  })

  test('restores image chat history when inputs.type is stored as a string', async () => {
    const onChatSessionSelect = jest.fn((_payload: unknown) => ({ status: 'restored' as const }))
    const imageUrl = 'https://cdn.example.com/string-type.png'
    const session = {
      id: 8,
      userId: 1,
      projectId: 1,
      title: '历史会话',
      toolType: 'chat.general',
      modelVersion: 'v1',
      status: 'completed',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
      type: 2,
      answer_text: '字符串类型图片',
      inputs: {
        query: '画字符串类型图片',
        type: '2',
      },
      file_url: imageUrl,
    }

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(session as any)

    await handleWorkspaceSessionClick({
      session: session as any,
      projectList: [{ id: 1, name: '项目A' } as any],
      availableTabs: [],
      toolMetadataByName: {},
      filteredToolMetadataByName: {},
      tab: 'chat',
      tool: { name: '语义生图', ver: 'v1' },
      setTab: jest.fn(),
      setTool: jest.fn(),
      notify: jest.fn(),
      resolveToolName: (toolKey) => toolKey,
      onChatSessionSelect,
      loadSessionFiles: jest.fn(),
      requestApiDetailLoad: jest.fn(),
    })

    const payload = onChatSessionSelect.mock.calls[0]?.[0] as any
    const assistantMessage = payload.detail.chatMessages.find(
      (message: { role: string }) => message.role === 'assistant',
    )

    expect(payload.tab).toBe('image')
    expect(assistantMessage.content).toContain(imageUrl)
  })
})
