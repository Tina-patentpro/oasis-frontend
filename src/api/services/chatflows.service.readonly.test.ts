import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { chatflowsService } from './chatflows.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('chatflowsService read-only chatflow endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('listChatflows calls chatflows list endpoint with filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          hasMore: false,
        },
      },
    })

    await chatflowsService.listChatflows({
      keyword: '专利',
      visibility: 'team',
      tag: 'draft',
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/chatflows',
      {
        keyword: '专利',
        visibility: 'team',
        tag: 'draft',
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getChatflow calls chatflow detail endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'chatflow-1' } })

    await chatflowsService.getChatflow('chatflow-1')

    expect(mockGet).toHaveBeenCalledWith('/api/chatflows/chatflow-1', undefined, undefined, {
      signal: undefined,
    })
  })

  test('listChatflowVersions calls chatflow versions endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await chatflowsService.listChatflowVersions('chatflow-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/chatflows/chatflow-1/versions',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('listChatflowInstructions calls chatflow instructions endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await chatflowsService.listChatflowInstructions('chatflow-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/chatflows/chatflow-1/instructions',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('getChatflowVariables calls chatflow variables endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { instructions: [], inputChannels: [] } })

    await chatflowsService.getChatflowVariables('chatflow-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/chatflows/chatflow-1/variables',
      undefined,
      undefined,
      { signal: undefined },
    )
  })
})
