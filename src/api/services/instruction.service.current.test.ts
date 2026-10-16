import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { instructionService } from './instruction.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>

describe('instructionService current contract endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPatch.mockReset()
  })

  test('listInstructions calls current instructions endpoint with filters', async () => {
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

    await instructionService.listInstructions({
      visibility: 'team',
      category: 'writing',
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/instructions',
      {
        visibility: 'team',
        category: 'writing',
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('createInstructionRecord calls current create endpoint', async () => {
    const payload = {
      name: '写作助手',
      content: '请润色这段文字',
      language: 'zh-CN',
      visibility: 'personal' as const,
    }
    mockPost.mockResolvedValue({ success: true, data: { id: 'ins_1' } })

    await instructionService.createInstructionRecord(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/instructions', payload, undefined, {
      signal: undefined,
    })
  })

  test('updateInstruction calls current update endpoint', async () => {
    const payload = {
      name: '更新后的指令',
      tags: ['writing'],
    }
    mockPatch.mockResolvedValue({ success: true, data: { id: 'ins_1' } })

    await instructionService.updateInstruction('ins_1', payload)

    expect(mockPatch).toHaveBeenCalledWith('/api/instructions/ins_1', payload, undefined, {
      signal: undefined,
    })
  })
})
