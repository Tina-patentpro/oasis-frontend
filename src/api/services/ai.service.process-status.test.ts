import { beforeEach, describe, expect, test, jest } from '@jest/globals'

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

describe('AIService.queryProcessStatus', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  test('preserves optional completion metadata when backend provides it', async () => {
    mockApiGet.mockResolvedValue({
      id: 562,
      key: 'task_1',
      current_step: 3,
      current_step_name: '完成',
      total_steps: 3,
      steps: ['S1', 'S2', 'S3'],
      progress_percent: 100,
      is_completed: true,
      session_id: 456,
      answer_text: 'final answer',
      file_url: 'https://example.com/output.docx',
      error_message: '',
    })

    const result = await aiService.queryProcessStatus('task_1')

    expect(result.key).toBe('task_1')
    expect(result.is_completed).toBe(true)
    expect(result.executionId).toBe('562')
    expect(result.session_id).toBe(456)
    expect(result.answer_text).toBe('final answer')
    expect(result.file_url).toBe('https://example.com/output.docx')
    expect(result.error_message).toBe('')
  })

  test('preserves wrapped backend id as executionId for async polling responses', async () => {
    mockApiGet.mockResolvedValue({
      code: 200,
      message: 'success',
      data: {
        id: 789,
        key: 'task_wrapped_id',
        current_step: 3,
        current_step_name: '完成',
        total_steps: 3,
        steps: ['S1', 'S2', 'S3'],
        progress_percent: 100,
        is_completed: true,
        answer_text: 'wrapped answer',
      },
    })

    const result = await aiService.queryProcessStatus('task_wrapped_id')

    expect(result.executionId).toBe('789')
    expect(result.key).toBe('task_wrapped_id')
    expect(result.answer_text).toBe('wrapped answer')
  })

  test.each(['success', 'done', 'finished', 'succeeded'])(
    'normalizes async completion alias %s to completed status',
    async (statusAlias) => {
      mockApiGet.mockResolvedValue({
        key: `task_${statusAlias}_alias`,
        current_step: 2,
        current_step_name: '完成',
        total_steps: 2,
        steps: ['S1', 'S2'],
        progress_percent: 100,
        status: statusAlias,
        answer_text: 'final answer',
      })

      const result = await aiService.queryProcessStatus(`task_${statusAlias}_alias`)

      expect(result.status).toBe('completed')
      expect(result.is_completed).toBe(true)
      expect(result.answer_text).toBe('final answer')
    },
  )

  test('splits comma-separated file_url strings into multiple download urls', async () => {
    mockApiGet.mockResolvedValue({
      key: 'task_multi_file',
      current_step: 3,
      current_step_name: '完成',
      total_steps: 3,
      steps: ['S1', 'S2', 'S3'],
      progress_percent: 100,
      is_completed: true,
      answer_text: 'final answer',
      file_url: 'https://example.com/a.docx, https://example.com/b.docx,https://example.com/c.docx',
    })

    const result = await aiService.queryProcessStatus('task_multi_file')

    expect(result.file_url).toEqual([
      'https://example.com/a.docx',
      'https://example.com/b.docx',
      'https://example.com/c.docx',
    ])
  })

  test('unwraps fixed backend envelope but ignores embedded response for frontend fields', async () => {
    mockApiGet.mockResolvedValue({
      code: 200,
      message: 'success',
      data: {
        key: 'task_wrapped',
        current_step: 3,
        current_step_name: '完成',
        total_steps: 3,
        steps: ['S1', 'S2', 'S3'],
        progress_percent: 100,
        is_completed: true,
        answer_text: 'wrapped answer',
        output: '这段 output 不应作为主要文本来源',
        file_url:
          'https://fallback.example.com/a.docx, https://fallback.example.com/b.docx,https://fallback.example.com/c.docx',
        response: JSON.stringify({
          data: {
            outputs: {
              custom_text_block: '动态文本',
              first_dynamic_file: {
                filename: '文件A.docx',
                size: 100,
                download_url: '/files/tools/a.docx?sign=1',
              },
              second_dynamic_file_group: [
                {
                  filename: '文件B.docx',
                  size: 200,
                  remote_url: 'https://cdn.example.com/b.docx',
                },
                {
                  filename: '文件C.docx',
                  size: 300,
                  url: '/files/tools/c.docx?sign=3',
                },
              ],
            },
          },
        }),
      },
    })

    const result = await aiService.queryProcessStatus('task_wrapped')

    expect(result.answer_text).toBe('wrapped answer')
    expect(result.file_url).toEqual([
      'https://fallback.example.com/a.docx',
      'https://fallback.example.com/b.docx',
      'https://fallback.example.com/c.docx',
    ])
    expect(result.file_output).toBeUndefined()
  })

  test('keeps output as raw field and does not remap it to answer_text', async () => {
    mockApiGet.mockResolvedValue({
      key: 'task_2',
      current_step: 5,
      current_step_name: '完成',
      total_steps: 5,
      steps: ['S1', 'S2', 'S3', 'S4', 'S5'],
      progress_percent: 100,
      is_completed: true,
      output: 'final markdown from output',
      file_output: [
        {
          url: '/files/tools/result.docx?sign=abc',
          filename: 'result.docx',
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 1024,
        },
      ],
    })

    const result = await aiService.queryProcessStatus('task_2')

    expect(result.output).toBe('final markdown from output')
    expect(result.answer_text).toBeUndefined()
    expect(result.file_url).toBeUndefined()
  })

  test('preserves top-level file_output records without rewriting them', async () => {
    mockApiGet.mockResolvedValue({
      key: 'task_2_1',
      current_step: 5,
      current_step_name: '完成',
      total_steps: 5,
      steps: ['S1', 'S2', 'S3', 'S4', 'S5'],
      progress_percent: 100,
      is_completed: true,
      output: 'final markdown from output',
      file_output: [
        {
          url: 'https://example.com/op/view.aspx?src=https%3A%2F%2Fcdn.example.com%2Fresult.docx',
          download_url: 'https://cdn.example.com/result.docx',
        },
      ],
    })

    const result = await aiService.queryProcessStatus('task_2_1')

    expect(result.file_output).toEqual([
      expect.objectContaining({
        url: 'https://example.com/op/view.aspx?src=https%3A%2F%2Fcdn.example.com%2Fresult.docx',
        download_url: 'https://cdn.example.com/result.docx',
      }),
    ])
    expect(result.file_url).toBeUndefined()
  })

  test('does not infer answer_text from legacy result/text/content fields', async () => {
    mockApiGet.mockResolvedValue({
      key: 'task_3',
      current_step: 5,
      current_step_name: '完成',
      total_steps: 5,
      steps: ['S1', 'S2', 'S3', 'S4', 'S5'],
      progress_percent: 100,
      is_completed: true,
      result: 'legacy result',
      text: 'legacy text',
      content: 'legacy content',
    })

    const result = await aiService.queryProcessStatus('task_3')

    expect(result.output).toBeUndefined()
    expect(result.answer_text).toBeUndefined()
  })
})
