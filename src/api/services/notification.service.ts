/**
 * 通知服务
 * 处理用户消息通知相关操作
 */

import type {
  UserMessage,
  GetUserMessageListRequest,
  GetUserMessageListResponse,
  Notification,
  PaginatedResponse,
} from '@/types/api'

import { apiClient } from '../client'

class NotificationService {
  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
    return undefined
  }

  private normalizeMessageListResponse(raw: unknown): GetUserMessageListResponse {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { items: [], total: 0 }
    }

    const record = raw as Record<string, unknown>
    const rawItems = Array.isArray(record['items'])
      ? record['items']
      : Array.isArray(record['item'])
        ? record['item']
        : []

    const items: UserMessage[] = rawItems
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null
        }

        const row = item as Record<string, unknown>
        const id = this.toNumber(row['id'])
        if (id === undefined) {
          return null
        }

        const title =
          typeof row['title'] === 'string' && row['title'].trim().length > 0
            ? row['title']
            : '系统通知'
        const content =
          typeof row['content'] === 'string'
            ? row['content']
            : typeof row['message'] === 'string'
              ? row['message']
              : ''
        const isReadRaw = this.toNumber(row['is_read']) ?? this.toNumber(row['isRead']) ?? 0
        const createdAt =
          typeof row['created_at'] === 'string' && row['created_at'].trim().length > 0
            ? row['created_at']
            : new Date().toISOString()

        return {
          id,
          title,
          content,
          is_read: isReadRaw > 0 ? 1 : 0,
          created_at: createdAt,
        } satisfies UserMessage
      })
      .filter((item): item is UserMessage => item !== null)

    const total = this.toNumber(record['total']) ?? items.length

    return {
      items,
      total,
    }
  }

  /**
   * 获取用户消息列表
   */
  async getUserMessageList(
    params: GetUserMessageListRequest,
    options?: { signal?: AbortSignal },
  ): Promise<GetUserMessageListResponse> {
    const { page, limit, type } = params

    const response = await apiClient.get<unknown>(
      '/user/usermessagelist',
      {
        page,
        limit,
        type,
      },
      undefined,
      { signal: options?.signal },
    )

    return this.normalizeMessageListResponse(response)
  }

  /**
   * 获取全部消息
   */
  async getAllMessages(
    page: number = 1,
    limit: number = 20,
    options?: { signal?: AbortSignal },
  ): Promise<GetUserMessageListResponse> {
    return this.getUserMessageList(
      {
        page,
        limit,
        type: 0, // 0表示全部
      },
      options,
    )
  }

  /**
   * 获取未读消息
   */
  async getUnreadMessages(
    page: number = 1,
    limit: number = 20,
    options?: { signal?: AbortSignal },
  ): Promise<GetUserMessageListResponse> {
    return this.getUserMessageList(
      {
        page,
        limit,
        type: 1, // 1表示未读
      },
      options,
    )
  }

  /**
   * 将UserMessage转换为Notification格式
   */
  private convertToNotification(userMessage: UserMessage): Notification {
    return {
      id: userMessage.id,
      title: userMessage.title,
      message: userMessage.content,
      read: userMessage.is_read === 1,
      createdAt: userMessage.created_at,
      type: 'info', // 默认类型，可根据需要从title推断
    }
  }

  /**
   * 获取通知列表（兼容旧的接口格式）
   */
  async getNotifications(
    params: {
      page?: number
      pageSize?: number
      read?: boolean
    },
    options?: { signal?: AbortSignal },
  ): Promise<PaginatedResponse<Notification>> {
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const type = params.read === undefined ? 0 : params.read ? 0 : 1

    // apiClient会自动提取data字段；同时兼容 data/item/total 的多种返回形式
    const response = await apiClient.get<unknown>(
      '/user/usermessagelist',
      {
        page,
        limit: pageSize,
        type,
      },
      undefined,
      { signal: options?.signal },
    )
    const data = this.normalizeMessageListResponse(response)
    const notifications = data.items.map((item) => this.convertToNotification(item))

    const result = {
      items: notifications,
      pagination: {
        page,
        pageSize,
        total: data.total,
        totalPages: Math.ceil(data.total / pageSize),
      },
    }

    return result
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(options?: { signal?: AbortSignal }): Promise<{ count: number }> {
    const response = await this.getUnreadMessages(1, 1, options)
    const normalized = this.normalizeMessageListResponse(response)
    return {
      count: normalized.total,
    }
  }

  /**
   * 标记单条消息为已读
   */
  async markAsRead(id: number): Promise<{ code: number; message: string; data: {} }> {
    return await apiClient.get(`/user/userhasread/${id}`)
  }

  /**
   * 标记所有消息为已读
   */
  async markAllAsRead(): Promise<{ code: number; message: string; data: {} }> {
    return await apiClient.get('/user/userhasreadall')
  }

  /**
   * 删除单条消息
   */
  async deleteNotification(id: number): Promise<{ code: number; message: string; data: {} }> {
    return await apiClient.get(`/user/userhasdel/${id}`)
  }

  /**
   * 清空所有消息
   */
  async clearAllNotifications(): Promise<{ code: number; message: string; data: {} }> {
    return await apiClient.get('/user/userhasdelall')
  }
}

export const notificationService = new NotificationService()
