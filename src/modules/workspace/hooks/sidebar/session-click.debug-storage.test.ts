import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

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

afterEach(() => {
  jest.restoreAllMocks()
})

describe('handleWorkspaceSessionClick debug storage', () => {
  test('does not fail stale session cleanup when debug storage is blocked', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })

    const session = {
      id: 12,
      userId: 1,
      projectId: 1,
      title: '调试存储受限',
      toolType: 'workflow',
      modelVersion: 'fast',
      status: 'completed',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
      type: 1,
      answer_text: '结果',
      api_name: '权利要求书生成-Fast',
      inputs: {},
    }

    ;(
      sessionService.getSession as jest.MockedFunction<typeof sessionService.getSession>
    ).mockResolvedValue(session as any)

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
      notify: jest.fn(),
      resolveToolName: (toolKey) => toolKey,
      loadSessionFiles: jest.fn(),
      requestApiDetailLoad: jest.fn(),
      isSessionClickCurrent: () => false,
    })

    expect(consoleError).not.toHaveBeenCalledWith('加载会话失败:', expect.any(DOMException))
  })
})
