import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import type { ApiDetail } from '@/types/api'

import { ToolGroupSection } from '@/components/workspace/left-sidebar/ToolGroupSection'
import { InputSectionHeader } from '@/components/workspace/input-section/InputSectionHeader'

import { useContentStore, useWorkspaceStore } from '../stores'
import { useWorkspaceContentSections } from './useWorkspaceContentSections'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

const mockGetApiDetail = jest.fn<(name: string) => Promise<ApiDetail>>()
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

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function buildApiDetail(
  name: string,
  fields: Array<{ key: string; label: string }>,
  isAsync = 0,
): ApiDetail {
  return {
    id: 1,
    name,
    api_type: 'Workflow',
    price: 0,
    is_async: isAsync,
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
  useThemeStore: (
    selector: (state: { currentTheme: { primary: string; primaryHover: string } }) => unknown,
  ) =>
    selector({
      currentTheme: {
        primary: '#10b981',
        primaryHover: '#059669',
      },
    }),
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
  const stopPolling = jest.fn()
  return {
    useAsyncTaskPolling: () => ({
      startPolling,
      stopPolling,
      status: 'idle',
    }),
  }
})

jest.mock('@/app/providers/NotificationProvider', () => {
  const refetch = jest.fn(async () => undefined)
  return {
    useNotificationCenter: () => ({
      refetch,
    }),
  }
})

jest.mock('./content-sections', () => {
  const setGeneratedFiles = jest.fn()
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
    buildOutputSectionProps: (params: { generated: string; isAsyncWorkflow: boolean }) => ({
      generated: params.generated,
      isAsyncWorkflow: params.isAsyncWorkflow,
    }),
    buildSectionDefinitions: () => ({}),
    resolveFinalResult,
    useGenerationActions: (): Record<string, unknown> => ({
      generatedFiles: [],
      setGeneratedFiles,
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

function Probe() {
  const { inputSectionProps, outputSectionProps } = useWorkspaceContentSections({
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
  })

  return (
    <div>
      <div data-testid="active-input-page">{inputSectionProps.inputPage}</div>
      <div data-testid="input-page-labels">
        {inputSectionProps.contentPages.map((page: { label: string }) => page.label).join('|')}
      </div>
      <div data-testid="start-new-session-disabled">
        {String(inputSectionProps.startNewSessionDisabled)}
      </div>
      <div data-testid="start-new-session-tooltip">{inputSectionProps.startNewSessionTooltip}</div>
      <div data-testid="workflow-is-async">{String(outputSectionProps.isAsyncWorkflow)}</div>
      <div data-testid="output-generated">{outputSectionProps.generated}</div>
    </div>
  )
}

function ToolSwitchingHarness() {
  const { inputSectionProps } = useWorkspaceContentSections({
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
  })

  const tool = useWorkspaceStore((state) => state.tool)
  const setTool = useWorkspaceStore((state) => state.setTool)

  const toolMetadataByName = {
    底盘研究: {
      versions: [
        { id: 'Basic', name: 'Basic', description: '基础模型', apiEndpoint: 'tool-a-endpoint' },
      ],
    },
    说明书生成: {
      versions: [
        { id: 'Basic', name: 'Basic', description: '基础模型', apiEndpoint: 'tool-b-endpoint' },
      ],
    },
  } as any

  return (
    <div>
      <ToolGroupSection
        tab="patent"
        tabs={[{ k: 'patent', t: '专利撰写', tools: ['底盘研究', '说明书生成'] }]}
        tool={tool}
        currentTab={{ k: 'patent', t: '专利撰写', tools: ['底盘研究', '说明书生成'] }}
        showVersionInfo={false}
        modelVersions={toolMetadataByName[tool.name]?.versions ?? []}
        selectedVersionValue="Basic"
        activeToolMetadata={toolMetadataByName[tool.name]}
        toolMetadataByName={toolMetadataByName}
        makePillStyle={() => ({})}
        onTabChange={jest.fn()}
        onToolChange={setTool}
        onToolVersionChange={(ver) => setTool({ ...tool, ver })}
        onVersionInfoToggle={jest.fn()}
      />
      <InputSectionHeader
        currentApiField={null}
        selectedProjectId={inputSectionProps.selectedProjectId}
        projects={inputSectionProps.projects}
        onProjectChange={inputSectionProps.onProjectChange}
        onQuickCreateProject={inputSectionProps.onQuickCreateProject}
        onStartNewSession={inputSectionProps.onStartNewSession}
        startNewSessionDisabled={false}
        startNewSessionTooltip=""
        layoutMode={inputSectionProps.layoutMode}
        onLayoutModeChange={inputSectionProps.onLayoutModeChange}
        contentPages={inputSectionProps.contentPages}
        inputPage={inputSectionProps.inputPage}
        inputSections={inputSectionProps.inputSections}
        onInputPageChange={inputSectionProps.onInputPageChange}
        baseActionStyle={{}}
      />
    </div>
  )
}

describe('useWorkspaceContentSections tool switching', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockGetApiDetail.mockReset()
    mockGenerationState.generationStatus = 'idle'
    mockGenerationState.canGenerate = true
    mockGenerationState.generateDisabled = false
    mockGenerationState.isGenerating = false

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
      pendingSessionRestoreToolKey: null,
      projectOrderByUser: {},
    })
  })

  test('同步工作流生成中时，会透传禁用新会话和等待提示', async () => {
    mockGenerationState.generationStatus = 'running'
    mockGenerationState.generateDisabled = true
    mockGenerationState.isGenerating = true
    mockGetApiDetail.mockResolvedValue(
      buildApiDetail(
        '底盘研究',
        [
          { key: 'techField', label: '技术领域' },
          { key: 'background', label: '背景技术' },
        ],
        0,
      ),
    )

    render(<Probe />)

    await waitFor(() => {
      expect(screen.getByTestId('active-input-page').textContent).toBe('techField')
    })

    expect(screen.getByTestId('start-new-session-disabled').textContent).toBe('true')
    expect(screen.getByTestId('start-new-session-tooltip').textContent).toBe(
      '同步工作流正在生成中，请等待结束后再开启新会话',
    )
    expect(screen.getByTestId('workflow-is-async').textContent).toBe('false')
  })

  test('异步工作流生成中时，会保留新会话入口并透传异步标记', async () => {
    mockGenerationState.generationStatus = 'running'
    mockGenerationState.generateDisabled = true
    mockGenerationState.isGenerating = true
    mockGetApiDetail.mockResolvedValue(
      buildApiDetail(
        '底盘研究',
        [
          { key: 'techField', label: '技术领域' },
          { key: 'background', label: '背景技术' },
        ],
        1,
      ),
    )

    render(<Probe />)

    await waitFor(() => {
      expect(screen.getByTestId('workflow-is-async').textContent).toBe('true')
    })

    expect(screen.getByTestId('start-new-session-disabled').textContent).toBe('false')
    expect(screen.getByTestId('start-new-session-tooltip').textContent).toBe(
      '在不切换当前工具的前提下，开始一个新会话并清空输入与输出',
    )
  })

  test('clicking the left tool button makes the right-side first page active for the new tool', async () => {
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

    render(<ToolSwitchingHarness />)

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
      expect(
        screen.getByRole('tab', { name: /技术领域输入页面/ }).getAttribute('aria-selected'),
      ).toBe('true')
    })

    await act(async () => {
      screen.getByRole('button', { name: '说明书生成' }).click()
    })

    await waitFor(() => {
      expect(mockGetApiDetail).toHaveBeenCalledWith('tool-b-endpoint')
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
        screen.getByRole('tab', { name: /权利要求书输入页面/ }).getAttribute('aria-selected'),
      ).toBe('true')
    })
  })
})
