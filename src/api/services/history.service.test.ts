import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { historyService } from './history.service'

const mockApiGet = apiClient.get as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
}
const mockApiDelete = apiClient.delete as unknown as {
  mockReset: () => void
}

describe('HistoryService.getHistoryDataItem', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
    mockApiDelete.mockReset()
  })

  test('keeps response text fallback but treats empty file_url as no file output', async () => {
    mockApiGet.mockResolvedValue({
      id: 586,
      api_name: '技术背景研究报告',
      answer_text: '',
      file_url: '',
      created_at: '2026-03-22 10:05:00',
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
    })

    const result = await historyService.getHistoryDataItem('586')

    expect(result.content).toBe('response 内的正文')
    expect(result.file_url).toBeUndefined()
    expect(result.file_output).toBeUndefined()
  })

  test('deletes history through the legacy workflow endpoint without calling project deletion', async () => {
    mockApiGet.mockResolvedValue(undefined)

    await historyService.deleteHistoryDataItem('586')

    expect(apiClient.get).toHaveBeenCalledWith(
      '/user/user/workflowdelete/586',
      undefined,
      undefined,
      { cache: 'no-store' },
    )
    expect(apiClient.delete).not.toHaveBeenCalled()
  })
})
