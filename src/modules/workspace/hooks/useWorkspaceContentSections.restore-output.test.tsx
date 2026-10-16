import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, renderHook, waitFor } from '@testing-library/react'

import type { ApiDetail } from '@/types/api'

import { useContentStore, useWorkspaceStore } from '../stores'
import { useWorkspaceContentSections } from './useWorkspaceContentSections'

const mockGetApiDetail = jest.fn<(name: string) => Promise<ApiDetail>>()
const mockSetGeneratedFiles = jest.fn()
const mockStopPolling = jest.fn()
const mockResetWorkflowTimeline = jest.fn()
const mockGenerationState = {
  generationStatus: 'idle' as
    | 'idle'
    | 'queued'
    | 'running'
    | 'partial_success'
    | 'failed'
    | 'success',
  canGenerate: true,
  generateDisabled: false,
  isGenerating: false,
}

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

type SessionRestoreStore = ReturnType<typeof useWorkspaceStore.getState> & {
  beginSessionRestore?: (createCancel: (owner: symbol) => () => void) => symbol
  finishSessionRestore?: (owner: symbol, committed: boolean) => void
  setToolForSessionRestore?: (
    owner: symbol,
    tool: { name: string; ver: string },
  ) => void
}

function sessionRestoreStore(): SessionRestoreStore {
  return useWorkspaceStore.getState() as SessionRestoreStore
}

function beginTestSessionRestore(): symbol {
  return sessionRestoreStore().beginSessionRestore!((owner) => () => {
    sessionRestoreStore().finishSessionRestore!(owner, false)
  })
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function buildApiDetail(name: string, fields: Array<{ key: string; label: string }>): ApiDetail {
  return {
    id: 1,
    name,
    api_type: 'Workflow',
    price: 0,
    is_async: 0,
    input_schema: fields.map((field) => ({
      type: 'text',
      cn_name: field.label,
      en_name: field.key,
      content: '',
    })),
    output_schema: [],
    created_at: '',
    updated_at: '',
  }
}

function restoreClaimInput(value: string) {
  useContentStore.setState({
    pages: [{ key: 'claim', label: '权利要求书' }],
    inputPage: 'claim',
    inputSections: { claim: value },
  })
}

function expectClaimInput(value: string) {
  expect(useContentStore.getState()).toMatchObject({
    pages: [{ key: 'claim', label: '权利要求书' }],
    inputPage: 'claim',
    inputSections: { claim: value },
  })
}

jest.mock('@/api/services', () => ({
  cmsService: {
    getApiDetail: (name: string) => mockGetApiDetail(name),
  },
}))

jest.mock('@/constants', () => ({
  FALLBACK_CONTENT_PAGES: [{ key: 'userInstruction', label: '用户指令' }],
}))

jest.mock('@/stores', () => ({
  useAsyncToolStore: Object.assign(
    (selector: (state: { asyncEndpointMap: Record<string, boolean> }) => unknown) =>
      selector({ asyncEndpointMap: {} }),
    {
      getState: () => ({
        asyncEndpointMap: {},
        setEndpointAsync: jest.fn(),
      }),
    },
  ),
}))

jest.mock('@/hooks/useDynamicTabs', () => {
  const dynamicTabs = {
    resolveToolId: (toolName: string) => toolName,
    getWorkflowSteps: (): unknown[] => [],
    getInputSections: (): unknown[] => [],
    loadToolDetails: async () => {},
    tabs: [] as unknown[],
    toolMetadataByName: {},
    getApiEndpointForTool: (toolName: string) => {
      if (toolName === '底盘研究') return 'tool-a-endpoint'
      if (toolName === '说明书生成') return 'tool-b-endpoint'
      return null
    },
  }

  return {
    useDynamicTabs: () => dynamicTabs,
  }
})

jest.mock('@/hooks/useAsyncTaskPolling', () => {
  const startPolling = jest.fn()
  return {
    useAsyncTaskPolling: () => ({
      startPolling,
      stopPolling: mockStopPolling,
      phase: 'idle',
      status: null,
    }),
  }
})

jest.mock('./content-sections/use-workflow-timeline', () => ({
  useWorkflowTimeline: () => ({
    workflowTimeline: [],
    resetWorkflowTimeline: mockResetWorkflowTimeline,
  }),
}))

jest.mock('@/app/providers/NotificationProvider', () => {
  const refetch = jest.fn(async () => undefined)
  return {
    useNotificationCenter: () => ({
      refetch,
    }),
  }
})

jest.mock('./content-sections', () => {
  const handleInputFiles = jest.fn(async () => undefined)
  const copyInput = jest.fn()
  const clearAllInputs = jest.fn()
  const startNewSession = jest.fn()
  const undoInputs = jest.fn()
  const copyGenerated = jest.fn()
  const applyAsyncCompletionResult = jest.fn()
  const generate = jest.fn()
  const handleNextStep = jest.fn()
  const handleDownload = jest.fn(async () => undefined)
  const readHistoryToInput = jest.fn()
  const loadSessionFiles = jest.fn()
  const resolveFinalResult = jest.fn()

  return {
    applyPollingStatusToWorkflowSteps: (steps: unknown[]) => steps,
    buildDynamicInputSections: (apiDetail: ApiDetail | null) =>
      apiDetail?.input_schema.map((field) => ({
        key: field.en_name,
        label: field.cn_name,
        placeholder: field.content,
        inputMode: 'text',
        isMultiFile: false,
        supportsFileUpload: false,
        supportsImageUpload: false,
        required: false,
      })) ?? [],
    buildInputSectionProps: (params: {
      inputPage: string
      inputSections: Record<string, string>
      activePages: Array<{ key: string; label: string }>
      setInputPage: (page: string) => void
      selectedProjectId: number | null
      setSelectedProjectId: (id: number | null) => void
      startNewSessionDisabled: boolean
      startNewSessionTooltip: string
    }): Record<string, unknown> => ({
      inputPage: params.inputPage,
      inputSections: params.inputSections,
      contentPages: params.activePages,
      onInputPageChange: params.setInputPage,
      selectedProjectId: params.selectedProjectId,
      onProjectChange: params.setSelectedProjectId,
      projects: [],
      onQuickCreateProject: jest.fn(),
      onStartNewSession: jest.fn(),
      startNewSessionDisabled: params.startNewSessionDisabled,
      startNewSessionTooltip: params.startNewSessionTooltip,
      layoutMode: 'auto',
      onLayoutModeChange: jest.fn(),
      sectionDefinitions: {},
      apiDetail: null,
    }),
    buildOutputSectionProps: (params: { generated: string }) => ({
      generated: params.generated,
    }),
    buildSectionDefinitions: () => ({}),
    resolveFinalResult,
    useGenerationActions: (): Record<string, unknown> => ({
      generatedFiles: [],
      setGeneratedFiles: mockSetGeneratedFiles,
      generationStatus: mockGenerationState.generationStatus,
      destinations: [],
      canGenerate: mockGenerationState.canGenerate,
      generateDisabled: mockGenerationState.generateDisabled,
      isGenerating: mockGenerationState.isGenerating,
      handleInputFiles,
      copyInput,
      clearAllInputs,
      startNewSession,
      undoInputs,
      copyGenerated,
      applyAsyncCompletionResult,
      generate,
      handleNextStep,
      handleDownload,
    }),
    useHistoryActions: () => ({
      readHistoryToInput,
      loadSessionFiles,
    }),
    createSessionTrackingRegistry: () => ({
      contextByTaskKey: {},
      resolvedSessionIdByTaskKey: {},
    }),
    buildSessionTrackingHint: jest.fn(),
    buildResolvedSessionTrackingHint: jest.fn(),
    clearSessionTrackingContext: jest.fn(),
    registerSessionTrackingContext: jest.fn(),
  }
})

function renderWorkspaceContentSections() {
  return renderHook(() =>
    useWorkspaceContentSections({
      notify: jest.fn(),
      openDownloadDialog: jest.fn(),
      openHistoryDialog: jest.fn(),
      openLocalHistoryDialog: jest.fn(),
      setHistoryConfirmCallback: jest.fn(),
      openQuickCreateProject: jest.fn(),
      currentTheme: { primary: '#10b981' } as any,
      appliedLayout: 'horizontal',
      layoutMode: 'auto',
      setLayoutMode: jest.fn(),
      projects: [],
      sessions: [],
      selectedProjectId: null,
      setSelectedProjectId: jest.fn(),
    }),
  )
}

describe('useWorkspaceContentSections restored output', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockGetApiDetail.mockReset()
    mockGenerationState.generationStatus = 'idle'
    mockGenerationState.canGenerate = true
    mockGenerationState.generateDisabled = false
    mockGenerationState.isGenerating = false
    mockSetGeneratedFiles.mockReset()
    mockStopPolling.mockReset()
    mockResetWorkflowTimeline.mockReset()

    useContentStore.setState({
      hydrated: true,
      title: '',
      pages: [],
      inputPage: '',
      inputSections: {},
      inputHistory: [],
      generated: '',
      versions: [],
      isGenerating: false,
    })

    useWorkspaceStore.setState({
      hydrated: true,
      tab: 'draft',
      tool: { name: '底盘研究' as any, ver: 'Basic' },
      managementTab: 'history',
      showVersionInfo: false,
      selectedProjectId: null,
      selectedSessionId: null,
      isSessionOutputRestoring: false,
      activeSessionRestoreOwner: null,
      activeSessionRestoreCancel: null,
      sessionRestoreCommitRevision: 0,
      pendingSessionRestoreToolKey: null,
      pendingSessionRestoreToolOwner: null,
      projectOrderByUser: {},
    })
  })

  test('preserves restored generated files when session restoration finishes', async () => {
    mockGetApiDetail.mockResolvedValue(buildApiDetail('底盘研究', []))

    renderWorkspaceContentSections()

    await waitFor(() => {
      expect(mockGetApiDetail).toHaveBeenCalled()
    })
    mockSetGeneratedFiles.mockClear()

    act(() => {
      useWorkspaceStore.setState({ isSessionOutputRestoring: true })
    })
    act(() => {
      useWorkspaceStore.setState({ isSessionOutputRestoring: false })
    })

    await waitFor(() => {
      expect(mockSetGeneratedFiles).not.toHaveBeenCalledWith([])
    })
  })

  test('resets to the first page of the newly selected tool instead of consuming stale api detail', async () => {
    const requests = {
      'tool-a-endpoint': createDeferred<ApiDetail>(),
      'tool-b-endpoint': createDeferred<ApiDetail>(),
    }

    mockGetApiDetail.mockImplementation((name: string) => {
      const request = requests[name as keyof typeof requests]
      if (!request) {
        return Promise.reject(new Error(`unexpected endpoint: ${name}`))
      }
      return request.promise
    })

    const { result } = renderWorkspaceContentSections()

    await waitFor(() => {
      expect(mockGetApiDetail).toHaveBeenCalledWith('tool-a-endpoint')
    })

    await act(async () => {
      requests['tool-a-endpoint'].resolve(
        buildApiDetail('底盘研究', [
          { key: 'techField', label: '技术领域' },
          { key: 'background', label: '背景技术' },
        ]),
      )
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.inputSectionProps.inputPage).toBe('techField')
      expect(
        result.current.inputSectionProps.contentPages
          .map((page: { label: string }) => page.label)
          .join('|'),
      ).toBe('技术领域|背景技术')
    })

    act(() => {
      restoreClaimInput('旧工具输入')
      useWorkspaceStore.getState().setTool({ name: '说明书生成' as any, ver: 'Basic' })
    })

    await waitFor(() => {
      expect(mockGetApiDetail).toHaveBeenCalledWith('tool-b-endpoint')
    })
    expect(useContentStore.getState()).toMatchObject({
      pages: [],
      inputPage: 'userInstruction',
      inputSections: {},
    })

    await act(async () => {
      requests['tool-b-endpoint'].resolve(
        buildApiDetail('说明书生成', [
          { key: 'claim', label: '权利要求书' },
          { key: 'techField', label: '技术领域' },
          { key: 'background', label: '背景技术' },
        ]),
      )
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(
        result.current.inputSectionProps.contentPages
          .map((page: { label: string }) => page.label)
          .join('|'),
      ).toBe('权利要求书|技术领域|背景技术')
      expect(result.current.inputSectionProps.inputPage).toBe('claim')
    })
  })

  test('keeps restored output when the session restore flag is cleared without switching tools', async () => {
    mockGetApiDetail.mockResolvedValue(
      buildApiDetail('底盘研究', [{ key: 'techField', label: '技术领域' }]),
    )

    useContentStore.setState({
      generated: '已恢复的历史结果',
    })
    const owner = beginTestSessionRestore()
    sessionRestoreStore().setToolForSessionRestore!(owner, {
      name: '底盘研究',
      ver: 'Basic',
    })

    const { result } = renderWorkspaceContentSections()

    await waitFor(() => {
      expect(result.current.outputSectionProps.generated).toBe('已恢复的历史结果')
    })

    act(() => {
      sessionRestoreStore().finishSessionRestore!(owner, false)
    })

    await waitFor(() => {
      expect(result.current.outputSectionProps.generated).toBe('已恢复的历史结果')
    })
  })

  test.each([
    ['preserves restored input while session restoration remains active', false, '已恢复输入'],
    ['preserves rollback input when restoration clears in the same batch', true, '回滚输入快照'],
  ])('%s', async (_name, clearRestoreInSameBatch, inputValue) => {
    mockGetApiDetail.mockImplementation(() => new Promise<ApiDetail>(() => {}))
    renderWorkspaceContentSections()
    let restoreOwner!: symbol

    await act(async () => {
      const workspace = sessionRestoreStore()
      restoreOwner = beginTestSessionRestore()
      workspace.setToolForSessionRestore!(restoreOwner, {
        name: '说明书生成',
        ver: 'Basic',
      })
      restoreClaimInput(inputValue)
      if (clearRestoreInSameBatch) {
        workspace.finishSessionRestore!(restoreOwner, false)
      }
      await Promise.resolve()
    })
    expectClaimInput(inputValue)

    if (!clearRestoreInSameBatch) {
      await act(async () => {
        sessionRestoreStore().finishSessionRestore!(restoreOwner, false)
      })
      expectClaimInput(inputValue)
    }
  })

  test('defers polling and timeline reset for a provisional restore until its loaded commit', async () => {
    mockGetApiDetail.mockImplementation(() => new Promise<ApiDetail>(() => {}))
    renderWorkspaceContentSections()
    await waitFor(() => {
      expect(mockGetApiDetail).toHaveBeenCalledWith('tool-a-endpoint')
    })
    mockStopPolling.mockClear()
    mockResetWorkflowTimeline.mockClear()

    const store = sessionRestoreStore()
    expect(store.beginSessionRestore).toEqual(expect.any(Function))
    expect(store.setToolForSessionRestore).toEqual(expect.any(Function))
    expect(store.finishSessionRestore).toEqual(expect.any(Function))

    const owner = beginTestSessionRestore()
    act(() => {
      sessionRestoreStore()
        .setToolForSessionRestore!(owner, { name: '说明书生成' as any, ver: 'Basic' })
    })
    await waitFor(() => {
      expect(useWorkspaceStore.getState().tool.name).toBe('说明书生成')
    })
    expect(mockStopPolling).not.toHaveBeenCalled()
    expect(mockResetWorkflowTimeline).not.toHaveBeenCalled()

    act(() => {
      sessionRestoreStore().finishSessionRestore!(owner, true)
    })
    await waitFor(() => {
      expect(mockStopPolling).toHaveBeenCalledTimes(1)
      expect(mockResetWorkflowTimeline).toHaveBeenCalledTimes(1)
    })
  })

  test('keeps X polling when A rolls back during schema wait and B fails before detail commit', async () => {
    mockGetApiDetail.mockImplementation(() => new Promise<ApiDetail>(() => {}))
    renderWorkspaceContentSections()
    await waitFor(() => {
      expect(mockGetApiDetail).toHaveBeenCalledWith('tool-a-endpoint')
    })
    mockStopPolling.mockClear()
    mockResetWorkflowTimeline.mockClear()

    const store = sessionRestoreStore()
    expect(store.beginSessionRestore).toEqual(expect.any(Function))
    expect(store.setToolForSessionRestore).toEqual(expect.any(Function))
    expect(store.finishSessionRestore).toEqual(expect.any(Function))

    const ownerA = beginTestSessionRestore()
    act(() => {
      sessionRestoreStore()
        .setToolForSessionRestore!(ownerA, { name: '说明书生成' as any, ver: 'Basic' })
    })
    await waitFor(() => {
      expect(useWorkspaceStore.getState().tool.name).toBe('说明书生成')
    })
    expect(mockStopPolling).not.toHaveBeenCalled()

    act(() => {
      const current = sessionRestoreStore()
      current.setToolForSessionRestore!(ownerA, { name: '底盘研究' as any, ver: 'Basic' })
      current.finishSessionRestore!(ownerA, false)
    })
    const ownerB = beginTestSessionRestore()
    act(() => {
      sessionRestoreStore().finishSessionRestore!(ownerB, false)
    })

    await waitFor(() => {
      expect(useWorkspaceStore.getState().tool.name).toBe('底盘研究')
      expect(useWorkspaceStore.getState().pendingSessionRestoreToolKey).toBeNull()
    })
    expect(mockStopPolling).not.toHaveBeenCalled()
    expect(mockResetWorkflowTimeline).not.toHaveBeenCalled()
  })
})
