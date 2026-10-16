import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { notificationService } from './notification.service'

const mockApiGet = apiClient.get as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
}

describe('notificationService', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  it('getNotifications 支持 item 和字符串 total', async () => {
    mockApiGet.mockResolvedValue({
      item: [
        {
          id: '1001',
          title: '系统提示',
          message: '测试消息',
          isRead: 1,
        },
      ],
      total: '1',
    })

    const response = await notificationService.getNotifications({ page: 1, pageSize: 20 })

    expect(response.items).toHaveLength(1)
    expect(response.items[0]).toMatchObject({
      id: 1001,
      title: '系统提示',
      message: '测试消息',
      read: true,
    })
    expect(response.pagination.total).toBe(1)
  })

  it('getNotifications 在异常结构下返回空列表', async () => {
    mockApiGet.mockResolvedValue(null)

    const response = await notificationService.getNotifications({ page: 1, pageSize: 20 })

    expect(response.items).toEqual([])
    expect(response.pagination.total).toBe(0)
    expect(response.pagination.totalPages).toBe(0)
  })

  it('getUnreadCount 兼容字符串 total', async () => {
    mockApiGet.mockResolvedValue({
      items: [],
      total: '5',
    })

    const response = await notificationService.getUnreadCount()

    expect(response.count).toBe(5)
  })
})
