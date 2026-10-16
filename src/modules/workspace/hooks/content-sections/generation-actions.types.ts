import type { Dispatch, SetStateAction } from 'react'

import type { ApiDetail, WorkflowExecutionFile } from '@/types/api'
import type { Tab, ToolState } from '@/types/workspace'
import type { WorkflowOutputTextField } from '@/utils/workflow-output-text'

import type { SessionTrackingHint } from '../sidebar/optimistic-session'
import type { GenerationStatus } from './generation-state'
import type { UploadActionMode } from './upload-input-value'

export interface UseGenerationActionsParams {
  apiDetail: ApiDetail | null
  ensureApiDetailLoaded?: () => Promise<ApiDetail | null>
  inputSections: Record<string, string>
  generated: string
  selectedProjectId: number | null
  activePages: Array<{ key: string; label: string }>
  dynamicTabs: Tab[]
  tab: string
  tool: ToolState
  toolMetadataByName: Record<
    string,
    {
      versions?: Array<{
        id: string
        name: string
        api_process?: string
      }>
    }
  >
  notify: (message: string) => void
  setGenerated: (content: string) => void
  addVersion: (version: { id: string; time: string; text: string }) => void
  saveInputHistory: () => void
  resetInputSections: () => void
  undoInputSections: () => void
  setInputSection: (page: string, value: string) => void
  setInputPage: (page: string) => void
  setTab: (tab: string) => void
  setTool: (tool: ToolState) => void
  startPolling: (taskKey: string, options?: { outputFields?: WorkflowOutputTextField[] }) => void
  stopPolling: () => void
  onMetricsStart?: (token: string) => void
  onMetricsCollected?: (metrics: {
    token: string
    responseMs: number
    interfaceMs: number
    setGeneratedAtMs: number
  }) => void
  onOpenDownloadSelector?: () => void
  onSessionTrackingHint?: (hint: SessionTrackingHint) => void | Promise<void>
}

export interface UseGenerationActionsResult {
  generatedFiles: WorkflowExecutionFile[]
  setGeneratedFiles: Dispatch<SetStateAction<WorkflowExecutionFile[]>>
  generationStatus: GenerationStatus
  destinations: Array<{ key: string; title: string }>
  canGenerate: boolean
  generateDisabled: boolean
  isGenerating: boolean
  handleInputFiles: (
    files: FileList,
    destKey: string,
    type: 'file' | 'image',
    options?: { mode?: UploadActionMode },
  ) => Promise<void>
  copyInput: () => void
  clearAllInputs: () => void
  startNewSession: () => void
  undoInputs: () => void
  copyGenerated: () => void
  applyAsyncCompletionResult: (payload: { text: string; files: WorkflowExecutionFile[] }) => void
  generate: () => void
  handleNextStep: () => void
  handleDownload: () => Promise<void>
}
