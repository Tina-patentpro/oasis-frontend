/**
 * AI服务
 * 处理AI生成、聊天等功能
 */

import type {
  CreateWorkflowRequest,
  FileUrl,
  GenerateRequest,
  GenerateResponse,
  SendChatRequest,
  ChatMessage,
  WorkflowListParams,
  WorkflowListResponse,
  ProcessStatusResponse,
} from '@/types/api'
import { CREATE_WITH_API_RETRY_POLICY, CREATE_WITH_API_TIMEOUT_MS } from './ai.service.config'
import {
  coerceGenerateResponse,
  coerceProcessStatusResponse,
  extractChatflowAnswer,
  parseFileInputValue,
  requireTaskKey,
  type ChatflowRequest,
  type ChatflowResponse,
  type CreateWithApiOptions,
} from './ai-service-normalizers'
import { mapWorkflowListResponse } from './ai-service-workflow-list'

// ==================== Chatflow相关类型 ====================

interface UploadFileResponse {
  filename?: string
  content_type?: string
  file_size?: number
  saved_path?: string
  url?: string
  message?: string
}

export interface ChatflowPromptItem {
  name: string
  description: string
}

export interface ChatflowPromptsResponse {
  通用对话: ChatflowPromptItem[]
  工作聚焦: ChatflowPromptItem[]
  语义生图: ChatflowPromptItem[]
}

import { apiClient } from '../client'

/** Monotonically increasing counter to prevent message-id collisions when Date.now() repeats. */
let _messageIdCounter = 0

class AIService {
  /**
   * 使用新API生成内容
   * @param apiDetailId - API详情的ID
   * @param inputs - 输入参数，key为en_name
   * @param folderId - 文件夹ID，可选
   * @param fileFields - 文件类型字段列表，用于归一化为 Dify 文件对象
   * @param apiProcess - 工作流步骤，用逗号分隔，如："格式检查,内容审查"
   * @param taskKey - 任务key，用于轮询查询进度
   */
  async createWithApi(
    apiDetailId: number,
    inputs: Record<string, string>,
    options: CreateWithApiOptions,
  ): Promise<GenerateResponse> {
    const { folderId = 0, fileFields = [], multiFileFields = [], apiProcess, taskKey } = options
    const normalizedTaskKey = requireTaskKey(taskKey)
    const normalizedApiProcess = typeof apiProcess === 'string' ? apiProcess : ''
    const multiFileFieldSet = new Set(multiFileFields)

    // 集成边界说明：
    // 前端只对接本项目后端接口（/apicategories/create），由后端再对接 Dify。
    // 前端不应直接按 Dify 原生协议拼装请求体。
    // 按当前接口约定：文件参数在 inputs 中传 Dify 文件对象
    // 单文件字段：{type, transfer_method, url}
    // 多文件字段：[{type, transfer_method, url}, ...]
    const processedInputs: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(inputs)) {
      if (!fileFields.includes(key)) {
        processedInputs[key] = value
        continue
      }

      const rawValue = typeof value === 'string' ? value.trim() : ''
      if (!rawValue) {
        continue
      }
      const normalizedFiles = parseFileInputValue(rawValue)

      if (normalizedFiles.length === 0) {
        continue
      }

      if (multiFileFieldSet.has(key)) {
        processedInputs[key] = normalizedFiles
      } else {
        processedInputs[key] = normalizedFiles[0]
      }
    }

    const payload: CreateWorkflowRequest = {
      inputs: processedInputs,
      id: apiDetailId,
      folder_id: folderId,
      api_process: normalizedApiProcess,
      key: normalizedTaskKey,
    }

    const response = await apiClient.post<unknown>('/apicategories/create', payload, undefined, {
      retry: CREATE_WITH_API_RETRY_POLICY,
      // 同步工作流可能执行时间较长，设置足够大的超时以避免前端过早断开连接
      // 需与后端 Nginx proxy_read_timeout 保持一致（推荐 300s）
      timeoutMs: CREATE_WITH_API_TIMEOUT_MS,
    })

    // 如果响应是字符串，直接作为生成内容
    if (typeof response === 'string') {
      return coerceGenerateResponse({
        generatedContent: response,
        status: 'completed',
        rawResponse: response,
      })
    }

    // 如果响应是对象，按原逻辑处理
    return coerceGenerateResponse({
      ...(response as Partial<GenerateResponse>),
      rawResponse: response,
    })
  }

  /**
   * 生成内容（非流式）
   * @deprecated 使用 createWithApi 替代
   */
  /**
   * 生成内容（非流式）
   * @deprecated 使用 createWithApi 替代
   */
  async generate(_data: GenerateRequest): Promise<GenerateResponse> {
    throw new Error(
      '[AIService] generate is not in API接口文档-用户端.md, use createWithApi(/apicategories/create) instead',
    )
  }

  /**
   * 发送聊天消息（非流式）
   */
  async sendChat(data: SendChatRequest): Promise<ChatMessage> {
    const type = data.mode === 'focus' ? 1 : data.mode === 'image' ? 2 : 3
    const files =
      data.attachments?.map((item) => ({
        type: item.type === 'image' ? ('image' as const) : ('document' as const),
        transfer_method: 'remote_url' as const,
        url: item.url,
      })) || []

    const response = await this.sendChatflow({
      query: data.message,
      conversation_id: null,
      type,
      folder_id: 0,
      files: files.length > 0 ? files : undefined,
    })

    return {
      id: Date.now() * 1000 + ++_messageIdCounter,
      sessionId: data.sessionId,
      role: 'assistant',
      content: extractChatflowAnswer(response),
      mode: data.mode,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * 发送Chatflow对话请求
   * @param data 对话请求参数
   * @returns 对话响应
   */
  async sendChatflow(data: ChatflowRequest & { signal?: AbortSignal }): Promise<ChatflowResponse> {
    // 如果files为空数组或undefined，则不传递这个字段
    const { signal, ...rest } = data
    const payload = {
      query: rest.query,
      conversation_id: rest.conversation_id,
      type: rest.type,
      folder_id: rest.folder_id, // folder_id是必须参数
      ...(rest.files && rest.files.length > 0 ? { files: rest.files } : {}),
    }

    const response = await apiClient.post<ChatflowResponse>(
      '/apicategories/charteflowcreate',
      payload,
      undefined,
      {
        signal,
        retry: {
          retries: 1,
          backoffMs: 500,
          retryOn: ['network', 500, 502, 503, 504],
        },
      },
    )

    return response
  }

  /**
   * 上传文件
   * @param file 要上传的文件
   * @returns 上传结果，包含文件的URL
   */
  async uploadFile(file: File, options?: { signal?: AbortSignal }): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await apiClient.uploadFile<UploadFileResponse>('/user/upload', formData, {
        signal: options?.signal,
      })
      const savedPath = response?.saved_path || response?.url

      if (!savedPath) {
        console.error('[AIService] 响应中没有 url 或 saved_path 字段')
        throw new Error('上传失败：未返回文件路径')
      }

      return savedPath
    } catch (error) {
      console.error('[AIService] 文件上传失败')
      throw error
    }
  }

  async getChatflowPrompts(options?: { signal?: AbortSignal }): Promise<ChatflowPromptsResponse> {
    return await apiClient.get<ChatflowPromptsResponse>(
      '/apicategories/chatflowprompt',
      undefined,
      undefined,
      { signal: options?.signal },
    )
  }

  /**
   * 获取用户项目列表（兼容 WorkflowListResponse 结构）
   * 基于 API 文档：GET /user/user/projectlist
   */
  async getWorkflowList(params: WorkflowListParams): Promise<WorkflowListResponse> {
    const response = await apiClient.get<{
      total: number
      items?: Array<{
        id: number
        name?: string
        api_name?: string
        type?: number
        folder_id?: number
        created_at: string
        answer?: string
        answer_text?: string
        generatedContent?: string
        response?: unknown
        file_output?: Array<Record<string, unknown>>
        file_url?: FileUrl | null
      }>
      item?: Array<{
        id: number
        name?: string
        api_name?: string
        type?: number
        folder_id?: number
        created_at: string
        answer?: string
        answer_text?: string
        generatedContent?: string
        response?: unknown
        file_output?: Array<Record<string, unknown>>
        file_url?: FileUrl | null
      }>
    }>('/user/user/projectlist', {
      page: params.page,
      limit: params.limit,
    })

    return mapWorkflowListResponse(response, params)
  }

  /**
   * 查询异步任务进度状态
   * @param taskKey 任务key
   * @returns 任务进度状态
   */
  async queryProcessStatus(
    taskKey: string,
    options?: { signal?: AbortSignal },
  ): Promise<ProcessStatusResponse> {
    const response = await apiClient.get<unknown>(
      `/apicategories/queryprocess/${taskKey}`,
      undefined,
      undefined,
      { signal: options?.signal },
    )
    return coerceProcessStatusResponse(response, taskKey)
  }
}

export const aiService = new AIService()
