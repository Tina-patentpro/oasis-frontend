import type { Project } from '@/types/api'
import type { InputSection as InputSectionDefinition } from '@/types/api'
import type { UploadActionMode } from './upload-input-value'

export function buildInputSectionProps(params: {
  inputPage: string
  inputSections: Record<string, string>
  layoutMode: 'auto' | 'contrast' | 'vertical'
  appliedLayout: 'horizontal' | 'vertical' | 'contrast'
  activePages: Array<{ key: string; label: string }>
  destinations: Array<{ key: string; title: string }>
  setInputPage: (page: string) => void
  setInputSection: (page: string, value: string) => void
  setLayoutMode: (mode: 'auto' | 'contrast' | 'vertical') => void
  handleInputFiles: (
    files: FileList,
    destKey: string,
    type: 'file' | 'image',
    options?: { mode?: UploadActionMode },
  ) => Promise<void>
  readHistoryToInput: (targetKey?: string) => void
  copyInput: () => void
  clearAllInputs: () => void
  startNewSession: () => void
  startNewSessionDisabled: boolean
  startNewSessionTooltip: string
  openQuickCreateProject: () => void
  projects: Project[]
  selectedProjectId: number | null
  setSelectedProjectId: (id: number | null) => void
  sectionDefinitions: Record<string, InputSectionDefinition | undefined>
  apiDetail?: import('@/components/workspace/input-section/types').ApiDetailPayload
  tabsLoadError?: string | null
  onRetryLoadTabs?: () => void
}) {
  const {
    inputPage,
    inputSections,
    layoutMode,
    appliedLayout,
    activePages,
    destinations,
    setInputPage,
    setInputSection,
    setLayoutMode,
    handleInputFiles,
    readHistoryToInput,
    copyInput,
    clearAllInputs,
    startNewSession,
    startNewSessionDisabled,
    startNewSessionTooltip,
    openQuickCreateProject,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    sectionDefinitions,
    apiDetail,
    tabsLoadError,
    onRetryLoadTabs,
  } = params

  return {
    inputPage,
    inputSections,
    layoutMode,
    appliedLayout,
    contentPages: activePages,
    destinations,
    onInputPageChange: setInputPage,
    onInputChange: setInputSection,
    onLayoutModeChange: setLayoutMode,
    onFileUpload: handleInputFiles,
    onReadHistory: readHistoryToInput,
    onCopyInput: copyInput,
    onClearAll: clearAllInputs,
    onStartNewSession: startNewSession,
    startNewSessionDisabled,
    startNewSessionTooltip,
    onQuickCreateProject: openQuickCreateProject,
    projects,
    selectedProjectId,
    onProjectChange: setSelectedProjectId,
    sectionDefinitions,
    apiDetail,
    tabsLoadError,
    onRetryLoadTabs,
  }
}

export function buildOutputSectionProps(params: {
  generated: string
  isGenerating: boolean
  generationStatus: 'idle' | 'queued' | 'running' | 'partial_success' | 'failed' | 'success'
  renderMode: 'rich' | 'source'
  appliedLayout: 'horizontal' | 'vertical' | 'contrast'
  canGenerate: boolean
  generateDisabled: boolean
  isAsyncWorkflow: boolean
  themeColor: string
  generate: () => void
  copyGenerated: () => void
  handleDownload: () => Promise<void>
  handleNextStep: () => void
  setRenderMode: (mode: 'rich' | 'source') => void
  downloadableCount: number
  performanceMetrics: {
    token: string | null
    responseMs: number | null
    interfaceMs: number | null
    firstFrameMs: number | null
    renderMs: number | null
    setGeneratedAtMs: number | null
  }
  onFirstFrameMeasured: (token: string, firstFrameMs: number) => void
  onRenderMeasured: (token: string, renderMs: number) => void
}) {
  const {
    generated,
    isGenerating,
    generationStatus,
    renderMode,
    appliedLayout,
    canGenerate,
    generateDisabled,
    isAsyncWorkflow,
    themeColor,
    generate,
    copyGenerated,
    handleDownload,
    handleNextStep,
    setRenderMode,
    downloadableCount,
    performanceMetrics,
    onFirstFrameMeasured,
    onRenderMeasured,
  } = params

  return {
    generated,
    isGenerating,
    generationStatus,
    renderMode,
    appliedLayout,
    canGenerate,
    generateDisabled,
    isAsyncWorkflow,
    themeColor,
    onGenerate: generate,
    onCopy: copyGenerated,
    onDownload: handleDownload,
    onNextStep: handleNextStep,
    onRenderModeChange: setRenderMode,
    downloadableCount,
    performanceMetrics,
    onFirstFrameMeasured,
    onRenderMeasured,
  }
}
