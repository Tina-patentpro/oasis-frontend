import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('@/constants', () => ({
  DESTS: [] as Array<{ key: string; label: string }>,
  TABS: [] as Array<{ k: string; t: string; tools: string[] }>,
}))

jest.mock('@/api/services', () => ({
  aiService: {
    uploadFile: jest.fn(),
    createWithApi: jest.fn(),
  },
}))

jest.mock('@/utils/download', () => ({
  triggerDownload: jest.fn(),
}))

import { aiService } from '@/api/services'
import { ApiError } from '@/api/errors'

import { useGenerationActions } from './generation-actions'
import { useWorkspaceStore } from '../../stores'
import { useAsyncTaskStore } from '../../stores/async-task.store'

function createParams(toolName: string) {
  return {
    apiDetail: null as import('@/types/api').ApiDetail | null,
    inputSections: {},
    generated: '',
    selectedProjectId: 1,
    activePages: [] as Array<{ key: string; label: string }>,
    dynamicTabs: [] as Array<{ k: string; t: string; tools: string[] }>,
    tab: 'tab-a',
    tool: { name: toolName, ver: 'v1' },
    toolMetadataByName: {},
    notify: jest.fn(),
    setGenerated: jest.fn(),
    addVersion: jest.fn(),
    saveInputHistory: jest.fn(),
    resetInputSections: jest.fn(),
    undoInputSections: jest.fn(),
    setInputSection: jest.fn(),
    setInputPage: jest.fn(),
    setTab: jest.fn(),
    setTool: jest.fn(),
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
  }
}

afterEach(() => {
  jest.clearAllMocks()
  useWorkspaceStore.setState({ selectedSessionId: null })
  useAsyncTaskStore.setState({ tasks: {} })
  sessionStorage.clear()
})

describe('useGenerationActions session restore', () => {
  test('restored session content clears stale failed status to success', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockRejectedValue(new ApiError('提交失败', 'UNKNOWN_ERROR', 500))

    const params = createParams('tool-a')
    useWorkspaceStore.setState({ selectedSessionId: 123 })
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('failed')
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('workspace-session-output-restored', {
          detail: {
            sessionId: 123,
            hasText: true,
            hasFiles: false,
            source: 'session-click',
          },
        }),
      )
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('success')
    })
  })

  test('restored empty session clears stale failed status back to idle', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockRejectedValue(new ApiError('提交失败', 'UNKNOWN_ERROR', 500))

    const params = createParams('tool-a')
    useWorkspaceStore.setState({ selectedSessionId: 123 })
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('failed')
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('workspace-session-output-restored', {
          detail: {
            sessionId: 123,
            hasText: false,
            hasFiles: false,
            source: 'session-click',
          },
        }),
      )
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('idle')
    })
  })

  test('ignores restored output event for a different session id', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockRejectedValue(new ApiError('提交失败', 'UNKNOWN_ERROR', 500))

    const params = createParams('tool-a')
    useWorkspaceStore.setState({ selectedSessionId: 999 })
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('failed')
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('workspace-session-output-restored', {
          detail: {
            sessionId: 123,
            hasText: true,
            hasFiles: false,
            source: 'session-click',
          },
        }),
      )
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('failed')
    })
  })

  test('keeps generation status idle when restored session has no result', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockRejectedValue(new ApiError('提交失败', 'UNKNOWN_ERROR', 500))

    const params = createParams('tool-a')
    useWorkspaceStore.setState({ selectedSessionId: 123 })
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('failed')
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('workspace-session-output-restored', {
          detail: {
            sessionId: 123,
            hasText: false,
            hasFiles: false,
            restoredStatus: 'idle',
            source: 'session-click',
          } as any,
        }),
      )
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('idle')
    })
  })
})
