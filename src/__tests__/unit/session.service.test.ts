import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import { apiClient } from '@/api/client'
import { sessionService } from '@/api/services/session.service'

jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('@/modules/workspace/hooks/workspace-env', () => ({
  isWorkspaceFastBootEnabled: () => true,
}))

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('sessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('normalizes session list items and filters independent sessions', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      total: 2,
      items: [
        {
          id: 1,
          name: '独立会话',
          user_id: 10,
          folder_id: 0,
          created_at: '2026-01-02T00:00:00.000Z',
          type: 1,
          answer_text: '完成',
          inputs: '{"topic":"专利"}',
        },
        {
          id: 2,
          name: '项目会话',
          user_id: 10,
          folder_id: 88,
          created_at: '2026-01-01T00:00:00.000Z',
          type: 1,
        },
      ],
    })

    const result = await sessionService.getSessions({
      type: 'independent',
      page: 1,
      pageSize: 20,
      cacheMode: 'bypass',
    })

    expect(mockApiClient.get).toHaveBeenCalledWith('/user/user/projectlist', {
      page: 1,
      limit: 20,
      folder_id: 0,
    })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: 1,
      userId: 10,
      title: '独立会话',
      status: 'completed',
      answer_text: '完成',
      inputs: { topic: '专利' },
    })
    expect(result.items[0]?.projectId).toBeNull()
  })

  test('normalizes session detail and preserves chatflow image metadata', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      data: {
        id: 7,
        user_id: 10,
        folder_id: '88',
        api_name: '语义生图',
        type: 2,
        created_at: '2026-01-03T00:00:00.000Z',
        answer_text: '图片已生成',
        file_url: ['https://example.com/generated.png'],
        inputs: '{"type":2,"conversation_id":"conv-image"}',
      },
    })

    const detail = await sessionService.getSession(7)

    expect(mockApiClient.get).toHaveBeenCalledWith('/user/user/projectdetail/7')
    expect(detail).toMatchObject({
      id: 7,
      userId: 10,
      projectId: 88,
      title: '语义生图',
      toolType: 'chat.image',
      answer_text: '图片已生成',
      file_url: 'https://example.com/generated.png',
      conversationId: 'conv-image',
    })
  })

  test('restores chatflow conversation id from response when inputs keep the initial null value', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      data: {
        id: 8,
        user_id: 10,
        folder_id: 0,
        api_name: '工作聚焦',
        type: 2,
        created_at: '2026-06-19T13:50:18.000Z',
        answer_text: '已记录\n\n',
        inputs:
          '{"query":"请记住本轮关键内容：质量打磨记忆探针 = MEMORY_PROBE_0729_BROWSER。请仅回复：已记录","conversation_id":null,"type":1,"files":[null]}',
        response:
          '{"conversation_id":"conv-from-response","message_id":"message-1","answer":"已记录\\n\\n","created_at":null,"metadata":{}}',
      },
    })

    const detail = await sessionService.getSession(8)

    expect(detail.toolType).toBe('chat.focus')
    expect(detail.conversationId).toBe('conv-from-response')
  })

  test('renames a session and reloads the updated detail', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({ code: 0, message: 'ok', data: null })
      .mockResolvedValueOnce({
        data: {
          id: 7,
          user_id: 10,
          name: '新名称',
          created_at: '2026-01-03T00:00:00.000Z',
          type: 1,
        },
      })

    const renamed = await sessionService.renameSession(7, { title: '新名称' })

    expect(mockApiClient.get).toHaveBeenNthCalledWith(1, '/user/user/workflowupd/7', {
      name: '新名称',
    })
    expect(mockApiClient.get).toHaveBeenNthCalledWith(2, '/user/user/projectdetail/7')
    expect(renamed.title).toBe('新名称')
  })

  test('deletes a session through the legacy workflow endpoint without calling project deletion', async () => {
    mockApiClient.get.mockResolvedValueOnce(undefined)

    await sessionService.deleteSession(7)

    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/user/user/workflowdelete/7',
      undefined,
      undefined,
      { cache: 'no-store' },
    )
    expect(mockApiClient.delete).not.toHaveBeenCalled()
  })

  test('propagates legacy session deletion failures without trying project deletion', async () => {
    const deletionFailure = new Error('delete failed')
    mockApiClient.get.mockRejectedValueOnce(deletionFailure)

    await expect(sessionService.deleteSession(7)).rejects.toBe(deletionFailure)

    expect(mockApiClient.delete).not.toHaveBeenCalled()
  })

  test('associates and dissociates a session through the move endpoint', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({ code: 0, message: 'ok', data: null })
      .mockResolvedValueOnce({
        data: {
          id: 7,
          user_id: 10,
          folder_id: 88,
          name: '项目会话',
          created_at: '2026-01-03T00:00:00.000Z',
          type: 1,
        },
      })
      .mockResolvedValueOnce({ code: 0, message: 'ok', data: null })
      .mockResolvedValueOnce({
        data: {
          id: 7,
          user_id: 10,
          folder_id: 0,
          name: '独立会话',
          created_at: '2026-01-03T00:00:00.000Z',
          type: 1,
        },
      })

    const associated = await sessionService.associateProject(7, { projectId: 88 })
    const dissociated = await sessionService.dissociateProject(7)

    expect(mockApiClient.get).toHaveBeenNthCalledWith(1, '/user/user/workflowuploadfloder/7/88')
    expect(associated.projectId).toBe(88)
    expect(mockApiClient.get).toHaveBeenNthCalledWith(3, '/user/user/workflowuploadfloder/7/0')
    expect(dissociated.projectId).toBeNull()
  })
})
