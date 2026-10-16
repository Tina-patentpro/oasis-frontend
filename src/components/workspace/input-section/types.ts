import type { CSSProperties, ReactNode } from 'react'

import type { Project } from '@/types/api'
import type { InputSection as InputSectionDefinition } from '@/types/api'
import type { UploadActionMode } from '@/modules/workspace/hooks/content-sections/upload-input-value'

import type { ContentPage, LayoutMode } from '../../../types'

export interface ApiDetailField {
  type: string
  cn_name: string
  content?: string
  en_name: string
}

export interface ApiDetailPayload {
  id: number
  input_schema: ApiDetailField[]
}

export interface InputSectionProps {
  inputPage: string
  inputSections: Record<string, string>
  layoutMode: LayoutMode
  appliedLayout: string
  contentPages: ContentPage[]
  destinations: readonly { key: string; title: string }[]
  onInputPageChange: (page: string) => void
  onInputChange: (page: string, value: string) => void
  onLayoutModeChange: (mode: LayoutMode) => void
  onFileUpload: (
    files: FileList,
    destination: string,
    type: 'file' | 'image',
    options?: { mode?: UploadActionMode },
  ) => Promise<void>
  onReadHistory: (targetKey?: string) => void
  onCopyInput: () => void
  onClearAll: () => void
  onStartNewSession: () => void
  startNewSessionDisabled: boolean
  startNewSessionTooltip: string
  onQuickCreateProject: () => void
  projects: Project[]
  selectedProjectId: number | null
  onProjectChange: (projectId: number | null) => void
  sectionDefinitions: Record<string, InputSectionDefinition | undefined>
  apiDetail?: ApiDetailPayload
  tabsLoadError?: string | null
  onRetryLoadTabs?: () => void
}

export interface InputSectionHeaderProps {
  currentApiField: ApiDetailField | null | undefined
  selectedProjectId: number | null
  projects: Project[]
  onProjectChange: (projectId: number | null) => void
  onQuickCreateProject: () => void
  onStartNewSession: () => void
  startNewSessionDisabled: boolean
  startNewSessionTooltip: string
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  contentPages: ContentPage[]
  inputPage: string
  inputSections: Record<string, string>
  onInputPageChange: (page: string) => void
  baseActionStyle: CSSProperties
  tabsLoadError?: string | null
  onRetryLoadTabs?: () => void
}

export interface InputSectionActionsProps {
  canTriggerReadAction: boolean
  onTriggerReadAction: () => void
  readActionLabel: string
  readActionTooltip: ReactNode
  onCopyInput: () => void
  onClearAll: () => void
  appliedLayout: string
  baseActionStyle: CSSProperties
}
