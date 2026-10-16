// 8. AI 功能模块（执行/流式/异步任务）

export type WorkflowResponseMode = 'blocking' | 'streaming'

export type WorkflowExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export type LegacyStreamEventType =
  | 'start'
  | 'chunk'
  | 'complete'
  | 'error'
  | 'progress'
  | 'milestone'

export type DifyWorkflowEventType =
  | 'workflow_started'
  | 'workflow_finished'
  | 'node_started'
  | 'node_finished'
  | 'message'
  | 'metadata'
  | 'log'
  | 'error'
  | 'ping'

export interface WorkflowAttachmentInput {
  field?: string
  fileId: string
  fileName?: string
  mimeType?: string
  metadata?: Record<string, unknown>
}

export interface GenerateRequest {
  sessionId: number
  toolType: string
  modelVersion: string
  inputs: Record<string, unknown>
  user?: string
  conversationId?: string
  metadata?: Record<string, unknown>
  attachments?: WorkflowAttachmentInput[]
  responseMode?: WorkflowResponseMode
  context?: Record<string, unknown>
}

export interface WorkflowExecutionUsage {
  tokensUsed?: number
  creditsConsumed?: number
  durationMs?: number
  [key: string]: unknown
}

export interface WorkflowExecutionFile {
  fileId: string
  url?: string
  fileName?: string
  mimeType?: string
  size?: number
  checksum?: string
  metadata?: Record<string, unknown>
}

export interface WorkflowOutputSection {
  id?: string
  title?: string
  order?: number
  text?: string
  html?: string
  metadata?: Record<string, unknown>
}

export interface WorkflowExecutionError {
  code?: string
  message?: string
  details?: unknown
}

export interface WorkflowExecutionMetadata {
  conversationId?: string
  messageId?: string
  createdAt?: string
  finishedAt?: string
  [key: string]: unknown
}

export interface GenerateResponse {
  executionId: string
  workflowId?: string
  status?: WorkflowExecutionStatus
  outputs?: Record<string, unknown>
  files?: WorkflowExecutionFile[]
  file_output?: Array<Record<string, unknown>>
  metadata?: WorkflowExecutionMetadata
  usage?: WorkflowExecutionUsage
  error?: WorkflowExecutionError | null
  documentSections?: WorkflowOutputSection[]
  generatedContent?: string
  tokensUsed?: number
  cost?: number
  file_url?: string | string[]
  rawResponse?: unknown
}

export interface LegacyStreamEvent {
  type: LegacyStreamEventType
  content?: string
  message?: string
  fullContent?: string
  step?: number
  progress?: number
}

export interface DifyStreamEvent {
  event: DifyWorkflowEventType | string
  createdAt?: string
  data?: Record<string, unknown>
  message?: string
  outputs?: Record<string, unknown>
  error?: WorkflowExecutionError | null
  type?: string
  raw?: unknown
}

export interface ChatMessage {
  id: number
  sessionId: number
  role: 'user' | 'assistant'
  content: string
  mode: 'general' | 'image' | 'focus'
  tokensUsed?: number
  cost?: number
  createdAt: string
}

export interface SendChatRequest {
  sessionId: number
  message: string
  mode: 'general' | 'image' | 'focus'
  attachments?: ChatAttachment[]
}

export interface ChatAttachment {
  type: 'file' | 'image'
  url: string
}

export interface CreateWorkflowRequest {
  id: number
  key: string
  inputs: Record<string, unknown>
  api_process: string
  folder_id: number
}

export interface WorkflowResponse {
  id: string
  error: null
  status: 'completed' | 'failed' | 'running'
  outputs: {
    Claims?: string
    Claims_report?: Array<{
      id: string | null
      url: string
      size: number
      type: string
      filename: string
      extension: string
      mime_type: string
      tenant_id: string
      related_id: string
      remote_url: string | null
      transfer_method: string
      dify_model_identity: string
    }>
    [key: string]: unknown
  }
  input_schema?: Array<{
    type: string
    cn_name: string
    en_name: string
    content: string
  }>
  created_at: number
  finished_at: number
  total_steps: number
  workflow_id: string
  elapsed_time: number
  total_tokens: number
}

export interface ChatflowResponse {
  id: string
  mode: 'advanced-chat'
  event:
    | 'message'
    | 'ping'
    | 'workflow_started'
    | 'workflow_finished'
    | 'node_started'
    | 'node_finished'
  answer: string
  task_id: string
  metadata: {
    usage: {
      latency: number
      currency: string
      total_price: string
      prompt_price: string
      total_tokens: number
      prompt_tokens: number
      completion_price: string
      time_to_generate: number
      completion_tokens: number
      time_to_first_token: number
      prompt_price_unit: string
      prompt_unit_price: string
      completion_price_unit: string
      completion_unit_price: string
    }
    annotation_reply: unknown
    retriever_resources: unknown[]
  }
  created_at: number
  message_id: string
  conversation_id: string
}

export interface ProcessStatusResponse {
  executionId?: string
  key: string
  current_step: number
  current_step_name: string
  total_steps: number
  steps: string[]
  progress_percent: number
  is_completed: boolean
  session_id?: number
  answer_text?: string
  output?: string
  file_output?: Array<Record<string, unknown>>
  file_url?: string | string[]
  error_message?: string
  status?: WorkflowExecutionStatus
}
