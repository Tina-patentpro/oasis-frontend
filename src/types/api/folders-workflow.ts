// 7. 文件夹/工作流管理模块

import type {
  ChatMessage,
  ChatflowResponse,
  WorkflowExecutionFile,
  WorkflowResponse,
} from './ai-execution'

export type FileUrl = string | string[]

export interface Session {
  id: number
  userId: number
  projectId?: number | null
  title: string
  toolType: string
  modelVersion: string
  status: 'draft' | 'completed'
  createdAt: string
  updatedAt: string
  type?: number
  answer_text?: string
  file_url?: FileUrl
  file_output?: Array<Record<string, unknown>>
  generatedFiles?: WorkflowExecutionFile[]
  api_name?: string
  inputs?: Record<string, unknown> | SessionInput[]
  conversationId?: string | null
}

export interface SessionDetail extends Session {
  inputs?: Record<string, unknown> | SessionInput[]
  outputs?: SessionOutput[]
  chatMessages?: ChatMessage[]
}

export interface SessionInput {
  id: number
  sessionId: number
  sectionKey: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface SessionOutput {
  id: number
  sessionId: number
  content: string
  version: number
  tokensUsed?: number
  cost?: number
  createdAt: string
}

export interface CreateSessionRequest {
  projectId?: number
  title: string
  toolType: string
  modelVersion: string
}

export interface UpdateSessionRequest {
  title?: string
}

export interface UpdateSessionInputsRequest {
  sections: Record<string, string>
}

export interface RenameSessionRequest {
  title: string
}

export interface AssociateProjectRequest {
  projectId: number
}

export interface ListSessionsParams {
  type?: 'independent' | 'projectLinked' | 'all'
  projectId?: number
  page?: number
  pageSize?: number
  search?: string
  status?: 'draft' | 'completed'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  scanMode?: 'fast' | 'accurate'
  cacheMode?: 'default' | 'bypass'
}

export interface WorkflowListItem {
  id: number
  api_name: string
  user_id: number
  inputs: Record<string, unknown>
  response: {
    data: WorkflowResponse
    task_id: string
    workflow_run_id: string
  }
  folder_id: number
  created_at: string
  file_url?: FileUrl
}

export interface ChatflowListItem {
  id: number
  api_name: string
  user_id: number
  inputs: {
    files: unknown[] | null
    query: string
    conversation_id: string | null
  }
  response: ChatflowResponse
  folder_id: number
  created_at: string
  file_url?: FileUrl
}

export type MixedListItem = WorkflowListItem | ChatflowListItem

export interface WorkflowListResponse {
  total: number
  item: MixedListItem[]
}

export interface WorkflowListParams {
  page: number
  limit: number
  type: 0 | 1 | 2
}
