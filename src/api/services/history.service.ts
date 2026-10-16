/**
 * 历史数据服务
 * 负责历史数据的获取、管理与导出
 */

import type {
  FileUrl,
  PaginatedResponse,
  HistoryDataItem,
  HistorySearchParams,
  HistoryDataBatch,
} from '@/types/api'
import { normalizeFileUrlValue } from '@/utils/file-url'
import { normalizeWorkflowResultPayload } from '@/utils/workflow-result'

import { apiClient } from '../client'
import { SESSION_ROUTES } from '../core/session-routes'
import { requestLegacySessionDelete } from './session-service-requests'

interface ProjectListItem {
  id: number
  name?: string
  api_name?: string
  answer?: string
  answer_text?: string
  response?: unknown
  file_output?: Array<Record<string, unknown>>
  file_url?: FileUrl | null
  created_at: string
  updated_at?: string
  type?: number
}

function normalizeHistoryFileUrl(value: unknown): FileUrl | undefined {
  return normalizeFileUrlValue(value)
}

function convertProjectToHistoryDataItem(item: ProjectListItem): HistoryDataItem {
  const type = item.type === 2 ? 'chatflow' : 'workflow'
  const title = item.name || item.api_name || '未命名记录'
  const normalizedWorkflowResult = normalizeWorkflowResultPayload(item)

  return {
    id: String(item.id),
    title,
    content: normalizedWorkflowResult.text || '',
    date: new Date(item.created_at).toLocaleDateString('zh-CN'),
    type,
    tags: [],
    read: false,
    createdAt: item.created_at,
    updatedAt: item.updated_at || item.created_at,
    file_url: normalizeHistoryFileUrl(normalizedWorkflowResult.file_url),
    file_output: normalizedWorkflowResult.file_output,
  }
}

class HistoryService {
  async getHistoryData(params?: HistorySearchParams): Promise<PaginatedResponse<HistoryDataItem>> {
    // 按 API 文档基线使用项目列表接口，再在前端按类型筛选
    const response = await apiClient.get<{
      total: number
      items?: ProjectListItem[]
      item?: ProjectListItem[]
    }>(SESSION_ROUTES.list, {
      page: params?.page || 1,
      limit: params?.pageSize || 50,
      folder_id: params?.projectId,
      keyword: params?.keyword || '',
    })

    const rawItems = Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.item)
        ? response.item
        : []

    const filteredItems = rawItems.filter((item) => {
      if (!params?.type || params.type === 'all') {
        return true
      }
      if (params.type === 'workflow') {
        return item.type === 1 || item.type === undefined
      }
      if (params.type === 'chatflow') {
        return item.type === 2
      }
      return true
    })

    const items = filteredItems.map(convertProjectToHistoryDataItem)
    const total =
      !params?.type || params.type === 'all' ? (response?.total ?? items.length) : items.length

    return {
      items,
      pagination: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 50,
        total,
        totalPages: Math.ceil(total / (params?.pageSize || 50)),
      },
    }
  }

  /**
   * 获取工作流详情
   * @param id 工作流ID
   */
  async getHistoryDataItem(id: string): Promise<HistoryDataItem> {
    const response = await apiClient.get<{
      id?: number
      name?: string
      api_name?: string
      answer?: string
      answer_text?: string
      response?: unknown
      file_output?: Array<Record<string, unknown>>
      file_url?: FileUrl | null
      created_at?: string
      updated_at?: string
      type?: number
    }>(`${SESSION_ROUTES.detail}/${id}`)

    const createdAt = response?.created_at || new Date().toISOString()
    const title = response?.name || response?.api_name || '未命名记录'
    const itemType = response?.type === 2 ? 'chatflow' : 'workflow'
    const normalizedWorkflowResult = normalizeWorkflowResultPayload(response)

    return {
      id: String(response?.id || id),
      title,
      content: normalizedWorkflowResult.text || '',
      date: new Date(createdAt).toLocaleDateString('zh-CN'),
      type: itemType,
      tags: [],
      read: false,
      createdAt,
      updatedAt: response?.updated_at || createdAt,
      file_url: normalizeHistoryFileUrl(normalizedWorkflowResult.file_url),
      file_output: normalizedWorkflowResult.file_output,
    }
  }

  /**
   * 搜索历史数据
   * @deprecated 使用 getHistoryData 方法,通过 keyword 参数即可实现搜索
   */
  async searchHistoryData(
    params: HistorySearchParams,
  ): Promise<PaginatedResponse<HistoryDataItem>> {
    // 直接使用 getHistoryData,它已支持搜索
    return this.getHistoryData(params)
  }

  /**
   * 批量获取历史数据详情
   * @deprecated 后端无批量获取接口,使用 Promise.all + getHistoryDataItem 替代
   */
  async getHistoryDataBatch(ids: string[]): Promise<HistoryDataBatch> {
    const results = await Promise.allSettled(ids.map((id) => this.getHistoryDataItem(id)))

    const items: HistoryDataItem[] = []
    const notFound: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        items.push(result.value)
      } else {
        notFound.push(ids[index])
      }
    })

    return { items, notFound }
  }

  /**
   * 删除工作流
   * @param id 工作流ID
   */
  async deleteHistoryDataItem(id: string): Promise<void> {
    await requestLegacySessionDelete(id)
  }

  /**
   * 批量删除工作流
   * @param ids 工作流ID数组
   */
  async batchDeleteHistoryData(ids: string[]): Promise<void> {
    // 并发删除所有会话记录
    await Promise.all(ids.map((id) => this.deleteHistoryDataItem(id)))
  }

  /**
   * 标记为已读
   * @deprecated 后端不支持此功能
   */
  async markAsRead(_id: string): Promise<void> {
    console.warn('[HistoryService] markAsRead is not supported by backend.')
    // 不抛出错误,静默处理
  }

  /**
   * 批量标记为已读
   * @deprecated 后端不支持此功能
   */
  async batchMarkAsRead(_ids: string[]): Promise<void> {
    console.warn('[HistoryService] batchMarkAsRead is not supported by backend.')
    // 不抛出错误,静默处理
  }

  /**
   * 获取历史数据统计
   * @deprecated 后端不支持此接口,可从前端通过 getHistoryData 自行计算
   */
  async getHistoryStats(): Promise<{
    total: number
    byType: Record<string, number>
    recentCount: number
  }> {
    console.warn(
      '[HistoryService] getHistoryStats is not supported by backend. Calculate from client side using getHistoryData.',
    )
    throw new Error('Not supported. Use getHistoryData and calculate stats on client side.')
  }

  /**
   * 导出历史数据
   * @deprecated 后端暂无专用导出接口,需要前端自行实现导出逻辑
   */
  async exportHistoryData(_params?: HistorySearchParams): Promise<{
    downloadUrl: string
    expiresIn: number
  }> {
    console.warn(
      '[HistoryService] exportHistoryData is not supported yet. Implement export logic on client side.',
    )
    throw new Error('Not implemented. Export logic should be handled on client side.')
  }

  /**
   * 更新工作流标题
   * @param id 工作流ID
   * @param title 新标题
   */
  async updateHistoryTitle(id: string, title: string): Promise<void> {
    await apiClient.get(`${SESSION_ROUTES.rename}/${id}`, { name: title })
  }

  /**
   * 移动工作流到文件夹
   * @param id 工作流ID
   * @param folderId 目标文件夹ID
   */
  async moveToFolder(id: string, folderId: number): Promise<void> {
    await apiClient.get(`${SESSION_ROUTES.move}/${id}/${folderId}`)
  }
}

export const historyService = new HistoryService()
