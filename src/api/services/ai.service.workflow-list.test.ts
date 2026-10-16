import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    uploadFile: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { aiService } from './ai.service'

const mockApiGet = apiClient.get as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
}

describe('AIService.getWorkflowList', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  test('keeps workflow response outputs but leaves file_url empty when top-level file_url is empty', async () => {
    mockApiGet.mockResolvedValue({
      total: 1,
      item: [
        {
          id: 586,
          name: '技术背景研究报告',
          type: 1,
          folder_id: 8,
          created_at: '2026-03-22 10:05:00',
          answer: '顶层 answer',
          file_url: '',
          response: JSON.stringify({
            data: {
              outputs: {
                tech_landscape: 'response 内的正文',
                tech_landscape_file: [
                  {
                    filename: '技术背景研究报告.docx',
                    url: '/files/tools/tech-landscape.docx?sign=1',
                  },
                ],
              },
            },
          }),
        },
      ],
    })

    const result = await aiService.getWorkflowList({ page: 1, limit: 20, type: 1 })
    const workflowItem = result.item[0]

    expect(result.total).toBe(1)
    expect(workflowItem?.file_url).toBeUndefined()
    expect('response' in workflowItem && 'data' in workflowItem.response).toBe(true)
    expect((workflowItem as any).response.data.outputs).toEqual(
      expect.objectContaining({
        tech_landscape: 'response 内的正文',
        tech_landscape_file: [
          expect.objectContaining({
            filename: '技术背景研究报告.docx',
            url: '/files/tools/tech-landscape.docx?sign=1',
          }),
        ],
      }),
    )
  })

  test('prefers normalized text for chatflow list items', async () => {
    mockApiGet.mockResolvedValue({
      total: 1,
      item: [
        {
          id: 900,
          api_name: '聊天会话',
          type: 2,
          folder_id: 0,
          created_at: '2026-03-22 12:00:00',
          answer: '来自 answer 的正文',
          answer_text: '',
        },
      ],
    })

    const result = await aiService.getWorkflowList({ page: 1, limit: 20, type: 2 })
    const chatItem = result.item[0]

    expect('response' in chatItem && 'answer' in chatItem.response).toBe(true)
    expect((chatItem as any).response.answer).toBe('来自 answer 的正文')
  })
})
