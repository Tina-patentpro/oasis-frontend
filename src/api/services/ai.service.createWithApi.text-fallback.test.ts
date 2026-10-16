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

const mockApiPost = apiClient.post as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
}

describe('AIService.createWithApi text fallback', () => {
  beforeEach(() => {
    mockApiPost.mockReset()
  })

  test('prefers answer_text over generatedContent when both are present', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      answer_text: 'content from answer_text',
      generatedContent: 'lower priority generatedContent',
    })

    const result = await aiService.createWithApi(
      123,
      { input_a: 'value' },
      {
        folderId: 8,
        fileFields: [],
        apiProcess: '',
        taskKey: 'task_answer_priority',
      },
    )

    expect(result.generatedContent).toBe('content from answer_text')
  })

  test('uses outputs.output as generatedContent fallback when top-level text is absent', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      outputs: {
        output: 'content from outputs.output',
      },
    })

    const result = await aiService.createWithApi(
      123,
      { input_a: 'value' },
      {
        folderId: 8,
        fileFields: [],
        apiProcess: '',
        taskKey: 'task_output',
      },
    )

    expect(result.generatedContent).toBe('content from outputs.output')
    expect(result.outputs?.['output']).toBe('content from outputs.output')
  })

  test('concatenates text blocks from outputs when top-level text is absent', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      result: 'legacy result field',
      summary: 'legacy summary field',
      outputs: {
        result: 'legacy outputs.result',
        Claims: 'legacy outputs.Claims',
      },
    })

    const result = await aiService.createWithApi(
      123,
      { input_a: 'value' },
      {
        folderId: 8,
        fileFields: [],
        apiProcess: '',
        taskKey: 'task_output_text_blocks',
      },
    )

    expect(result.generatedContent).toBe('legacy outputs.result\n\nlegacy outputs.Claims')
  })
})
