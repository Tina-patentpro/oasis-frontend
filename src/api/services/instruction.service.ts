import { apiClient } from '../client'

// ==================== 指令库相关类型 ====================

export interface Instruction {
  id: number
  type: number // 1: 工作聚焦, 2: 语义生图, 3: 通用对话
  title: string
  content: string
  is_new: number // 0: 否, 1: 是
  created_at: string
  can_delete?: boolean
  is_custom?: boolean
}

interface InstructionListParams {
  type: number
  page?: number
  limit?: number
}

interface CreateInstructionParams {
  type: number
  title: string
  content: string
  is_new: number
}

interface InstructionListResponse {
  total: number
  item: Instruction[]
}

type InstructionVisibility = 'personal' | 'team' | 'public'

interface CurrentInstructionListParams {
  visibility?: InstructionVisibility
  category?: string
  page?: number
  pageSize?: number
}

interface CurrentInstructionSummary {
  id: string
  name: string
  description?: string
  category: string
  language?: string
  visibility: InstructionVisibility
  tags?: string[]
  isTemplate?: boolean
  usageCount?: number
  folder?: string
  createdAt: string
  updatedAt?: string
}

interface CurrentInstructionDetail extends CurrentInstructionSummary {
  content: string
  owner: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }
  version?: string
  isDeleted?: boolean
}

interface CurrentInstructionPagination {
  page?: number
  pageSize?: number
  total?: number
  hasMore?: boolean
}

interface CurrentInstructionListResponse {
  success: boolean
  data?: {
    items?: CurrentInstructionSummary[]
    pagination?: CurrentInstructionPagination
  }
}

interface CreateCurrentInstructionParams {
  name: string
  content: string
  language: string
  visibility: InstructionVisibility
  description?: string
  category?: string
  tags?: string[]
  folder?: string
  isTemplate?: boolean
  templateId?: string
  metadata?: Record<string, unknown>
}

interface UpdateCurrentInstructionParams {
  name?: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  visibility?: InstructionVisibility
  folder?: string
  isTemplate?: boolean
  metadata?: Record<string, unknown>
}

interface CurrentInstructionDetailResponse {
  success: boolean
  data?: CurrentInstructionDetail
}

// ==================== 指令库服务 ====================

class InstructionService {
  async listInstructions(
    params: CurrentInstructionListParams = {},
    options?: { signal?: AbortSignal },
  ): Promise<CurrentInstructionListResponse> {
    return apiClient.get<CurrentInstructionListResponse>('/api/instructions', params, undefined, {
      signal: options?.signal,
    })
  }

  async createInstructionRecord(
    params: CreateCurrentInstructionParams,
    options?: { signal?: AbortSignal },
  ): Promise<CurrentInstructionDetailResponse> {
    return apiClient.post<CurrentInstructionDetailResponse>(
      '/api/instructions',
      params,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateInstruction(
    instructionId: string,
    params: UpdateCurrentInstructionParams,
    options?: { signal?: AbortSignal },
  ): Promise<CurrentInstructionDetailResponse> {
    return apiClient.patch<CurrentInstructionDetailResponse>(
      `/api/instructions/${instructionId}`,
      params,
      undefined,
      { signal: options?.signal },
    )
  }

  /**
   * 获取指令列表
   * @param params 查询参数
   * @returns 指令列表
   */
  async getInstructionList(params: InstructionListParams): Promise<InstructionListResponse> {
    return this.getInstructionListWithOptions(params)
  }

  async getInstructionListWithOptions(
    params: InstructionListParams,
    options?: { signal?: AbortSignal },
  ): Promise<InstructionListResponse> {
    const { type, page = 1, limit = 10 } = params
    const response = await apiClient.get<InstructionListResponse>(
      `/apicategories/instructionlist`,
      {
        type,
        page,
        limit,
      },
      undefined,
      { signal: options?.signal },
    )

    return response
  }

  /**
   * 获取工作聚焦指令（type=1）
   */
  async getFocusInstructions(
    page = 1,
    limit = 10,
    options?: { signal?: AbortSignal },
  ): Promise<InstructionListResponse> {
    const response = await this.getInstructionListWithOptions({ type: 1, page, limit }, options)
    return response
  }

  /**
   * 获取语义生图指令（type=2）
   */
  async getImageInstructions(
    page = 1,
    limit = 10,
    options?: { signal?: AbortSignal },
  ): Promise<InstructionListResponse> {
    const response = await this.getInstructionListWithOptions({ type: 2, page, limit }, options)
    return response
  }

  /**
   * 获取通用对话指令（type=3）
   */
  async getGeneralInstructions(
    page = 1,
    limit = 10,
    options?: { signal?: AbortSignal },
  ): Promise<InstructionListResponse> {
    const response = await this.getInstructionListWithOptions({ type: 3, page, limit }, options)
    return response
  }

  /**
   * 创建指令
   * @param params 创建参数
   * @returns 创建结果
   */
  async createInstruction(params: CreateInstructionParams): Promise<{ id: number }> {
    const response = await apiClient.post<{ id: number }>(
      `/apicategories/instructioncreate`,
      params,
    )

    return response
  }

  /**
   * 删除指令
   * @param id 指令ID
   */
  async deleteInstruction(id: number): Promise<void> {
    await apiClient.post(`/apicategories/instructiondelete`, { id })
  }

  /**
   * 获取所有类型的指令列表（用于下载对话框）
   * @returns 包含三种类型指令的列表
   */
  async getAllInstructionsForDownload(options?: {
    signal?: AbortSignal
  }): Promise<Record<number, Instruction[]>> {
    const [type1, type2, type3] = await Promise.all([
      this.getInstructionListWithOptions({ type: 1, page: 1, limit: 50 }, options),
      this.getInstructionListWithOptions({ type: 2, page: 1, limit: 50 }, options),
      this.getInstructionListWithOptions({ type: 3, page: 1, limit: 50 }, options),
    ])

    return {
      1: type1.item || [],
      2: type2.item || [],
      3: type3.item || [],
    }
  }
}

/**
 * 指令库服务
 * 用于获取不同类型对话模式的预设指令
 */
export const instructionService = new InstructionService()
