import type { InputSection, WorkflowStep } from '@/types/api'

export interface ToolVersion {
  id: string
  name: string
  description: string
  api_process?: string
  apiEndpoint?: string
  is_async?: number
}

export interface LegacyTool {
  id: string
  name: string
  category: string
  description: string
  workflow?: string
  versions: ToolVersion[]
  sortOrder: number
  is_async?: number
}

export interface LegacyCategory {
  id: string
  name: string
  tools: string[]
  sortOrder: number
}

export interface Tab {
  k: string
  t: string
  tools: string[]
}

export interface DynamicTabsDataState<T> {
  isLoading: boolean
  data: T | null
  error: Error | null
  isStale: boolean
}

export type WorkflowStepsCache = Record<string, WorkflowStep[]>
export type InputSectionsCache = Record<string, InputSection[]>
