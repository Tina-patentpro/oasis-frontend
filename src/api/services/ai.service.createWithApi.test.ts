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
import { CREATE_WITH_API_RETRY_POLICY } from './ai.service.config'

const mockApiPost = apiClient.post as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
  mock: {
    calls: unknown[][]
  }
}

describe('AIService.createWithApi retry policy', () => {
  beforeEach(() => {
    mockApiPost.mockReset()
  })

  test('does not retry 504 for async workflow submission', async () => {
    expect(CREATE_WITH_API_RETRY_POLICY.retries).toBe(0)
    expect(CREATE_WITH_API_RETRY_POLICY.retryOn).not.toContain(504)
  })

  test('posts all required fields for /apicategories/create', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      outputs: {
        content: 'done',
      },
    })

    await aiService.createWithApi(
      123,
      { input_a: 'value' },
      {
        folderId: 8,
        fileFields: [],
        apiProcess: '',
        taskKey: 'task_abc',
      },
    )

    expect(mockApiPost).toHaveBeenCalledTimes(1)
    const [endpoint, payload, validator, options] = mockApiPost.mock.calls[0] as [
      string,
      {
        id: number
        key: string
        inputs: Record<string, unknown>
        api_process: string
        folder_id: number
      },
      unknown,
      { retry: unknown },
    ]

    expect(endpoint).toBe('/apicategories/create')
    expect(validator).toBeUndefined()
    expect(options).toEqual(expect.objectContaining({ retry: CREATE_WITH_API_RETRY_POLICY }))
    expect(payload).toEqual({
      id: 123,
      key: 'task_abc',
      inputs: { input_a: 'value' },
      api_process: '',
      folder_id: 8,
    })
  })

  test('fails fast when taskKey is empty', async () => {
    await expect(
      aiService.createWithApi(
        123,
        { input_a: 'value' },
        {
          folderId: 8,
          fileFields: [],
          apiProcess: 'step_a',
          taskKey: '   ',
        },
      ),
    ).rejects.toThrow('[AIService] createWithApi requires non-empty taskKey')

    expect(mockApiPost).not.toHaveBeenCalled()
  })

  test('uses answer_text as generatedContent for /apicategories/create response', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      answer_text: 'content from answer_text',
      file_url: 'https://example.com/result.docx',
    })

    const result = await aiService.createWithApi(
      123,
      { input_a: 'value' },
      {
        folderId: 8,
        fileFields: [],
        apiProcess: '',
        taskKey: 'task_answer_text',
      },
    )

    expect(result.generatedContent).toBe('content from answer_text')
    expect(result.file_url).toBe('https://example.com/result.docx')
  })

  test.each(['success', 'done', 'finished', 'succeeded'])(
    'normalizes sync completion alias %s to completed status',
    async (statusAlias) => {
      mockApiPost.mockResolvedValue({
        status: statusAlias,
        answer_text: 'content from answer_text',
        file_url: 'https://example.com/result.docx',
      })

      const result = await aiService.createWithApi(
        123,
        { input_a: 'value' },
        {
          folderId: 8,
          fileFields: [],
          apiProcess: '',
          taskKey: `task_sync_${statusAlias}_alias`,
        },
      )

      expect(result.status).toBe('completed')
      expect(result.generatedContent).toBe('content from answer_text')
    },
  )

  test('ignores top-level files field and only keeps backend file_url for frontend downloads', async () => {
    mockApiPost.mockResolvedValue({
      code: 200,
      message: 'success',
      data: {
        answer_text: 'content from answer_text',
        file_url: 'https://example.com/result.docx',
        files: [
          {
            url: 'https://internal.example.com/result.docx',
            filename: '内部文件.docx',
          },
        ],
      },
    })

    const result = await aiService.createWithApi(
      123,
      { input_a: 'value' },
      {
        folderId: 8,
        fileFields: [],
        apiProcess: '',
        taskKey: 'task_ignore_top_level_files',
      },
    )

    expect(result.generatedContent).toBe('content from answer_text')
    expect(result.file_url).toBe('https://example.com/result.docx')
    expect(result.files).toBeUndefined()
  })

  test('preserves top-level file_output so sync workflow can use the same file metadata as async workflow', async () => {
    mockApiPost.mockResolvedValue({
      code: 200,
      message: 'success',
      data: {
        answer_text: '',
        file_url: '/files/tools/final-a.docx?sign=1,/files/tools/final-b.docx?sign=2',
        file_output: [
          {
            url: 'https://preview.example.com/view-a.docx',
            filename: '技术交底书.docx',
          },
          {
            download_url: '/files/tools/real-b.docx?sign=2',
            filename: '技术要素表.docx',
            size: 2048,
          },
        ],
      },
    })

    const result = await aiService.createWithApi(
      123,
      { input_a: 'value' },
      {
        folderId: 8,
        fileFields: [],
        apiProcess: '',
        taskKey: 'task_preserve_sync_file_output',
      },
    )

    expect(result.file_url).toEqual([
      '/files/tools/final-a.docx?sign=1',
      '/files/tools/final-b.docx?sign=2',
    ])
    expect(result.file_output).toEqual([
      expect.objectContaining({
        url: 'https://preview.example.com/view-a.docx',
        filename: '技术交底书.docx',
      }),
      expect.objectContaining({
        download_url: '/files/tools/real-b.docx?sign=2',
        filename: '技术要素表.docx',
        size: 2048,
      }),
    ])
  })

  test('uses only backend file_url for downloads and does not derive file metadata from outputs', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      answer_text: 'content from answer_text',
      file_url: 'https://example.com/a.docx, https://example.com/b.docx,https://example.com/c.docx',
      outputs: {
        technical_disclosure_file: [
          {
            url: '/files/tools/a.docx?sign=1',
            filename: '技术交底书.docx',
            size: 18856,
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ],
        improvement_report_file: [
          {
            url: '/files/tools/b.docx?sign=2',
            filename: '完善建议报告.docx',
            size: 9276,
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ],
        tech_elements_table_file: [
          {
            url: '/files/tools/c.docx?sign=3',
            filename: '技术要素表.docx',
            size: 10324,
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ],
      },
    })

    const result = await aiService.createWithApi(
      123,
      { input_a: 'value' },
      {
        folderId: 8,
        fileFields: [],
        apiProcess: '',
        taskKey: 'task_multi_download_files',
      },
    )

    expect(result.file_url).toEqual([
      'https://example.com/a.docx',
      'https://example.com/b.docx',
      'https://example.com/c.docx',
    ])
    expect(result.files).toBeUndefined()
  })

  test('unwraps fixed backend envelope but ignores embedded response for frontend fields', async () => {
    mockApiPost.mockResolvedValue({
      code: 200,
      message: 'success',
      data: {
        id: 562,
        answer_text: '只使用 answer_text',
        file_url:
          'https://fallback.example.com/a.docx, https://fallback.example.com/b.docx,https://fallback.example.com/c.docx',
        response: JSON.stringify({
          data: {
            outputs: {
              brief_summary: '这段动态文本不应进入预览',
              structured_section: {
                name: '章节一',
                value: '这是一段普通结构化文本，不应被识别成文件',
              },
              any_first_file: {
                filename: '动态文件A.docx',
                size: 111,
                download_url: '/files/tools/a.docx?sign=1',
                mime_type:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              },
              another_bucket: [
                {
                  filename: '动态文件B.docx',
                  size: '222',
                  remote_url: 'https://cdn.example.com/b.docx',
                  mime_type:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                },
                {
                  filename: '动态文件C.docx',
                  size: 333,
                  url: '/files/tools/c.docx?sign=3',
                  mime_type:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                },
              ],
            },
          },
        }),
      },
    })

    const result = await aiService.createWithApi(
      123,
      { input_a: 'value' },
      {
        folderId: 8,
        fileFields: [],
        apiProcess: '',
        taskKey: 'task_dynamic_output_files',
      },
    )

    expect(result.generatedContent).toBe('只使用 answer_text')
    expect(result.executionId).toBe('562')
    expect(result.file_url).toEqual([
      'https://fallback.example.com/a.docx',
      'https://fallback.example.com/b.docx',
      'https://fallback.example.com/c.docx',
    ])
    expect(result.files).toBeUndefined()
  })

  test('omits empty file fields instead of sending null', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      answer_text: 'ok',
    })

    await aiService.createWithApi(
      123,
      {
        single_file: '',
        files: JSON.stringify([
          {
            url: 'https://example.com/input-a.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ]),
      },
      {
        folderId: 8,
        fileFields: ['single_file', 'files'],
        multiFileFields: ['files'],
        apiProcess: '',
        taskKey: 'task_skip_empty_file_field',
      },
    )

    const [, payload] = mockApiPost.mock.calls[0] as [string, { inputs: Record<string, unknown> }]

    expect(Object.prototype.hasOwnProperty.call(payload.inputs, 'single_file')).toBe(false)
    expect(payload.inputs['files']).toEqual([
      {
        type: 'document',
        transfer_method: 'remote_url',
        url: 'https://example.com/input-a.docx',
      },
    ])
  })

  test('keeps declared multi-file inputs as arrays even when only one file is present', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      answer_text: 'ok',
      file_url: [],
    })

    await aiService.createWithApi(
      123,
      {
        attachments: JSON.stringify({
          url: 'https://example.com/input.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      },
      {
        folderId: 8,
        fileFields: ['attachments'],
        apiProcess: '',
        taskKey: 'task_multifile_single_item',
        multiFileFields: ['attachments'],
      },
    )

    const [, payload] = mockApiPost.mock.calls[0] as [
      string,
      {
        inputs: Record<string, unknown>
      },
    ]

    expect(payload.inputs).toEqual({
      attachments: [
        {
          type: 'document',
          transfer_method: 'remote_url',
          url: 'https://example.com/input.docx',
        },
      ],
    })
  })

  test('uses single file object for single-file fields', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      answer_text: 'ok',
    })

    await aiService.createWithApi(
      123,
      {
        attachment: JSON.stringify({
          url: 'https://example.com/input.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      },
      {
        folderId: 8,
        fileFields: ['attachment'],
        apiProcess: '',
        taskKey: 'task_single_file_object',
      },
    )

    const [, payload] = mockApiPost.mock.calls[0] as [string, { inputs: Record<string, unknown> }]

    expect(payload.inputs).toEqual({
      attachment: {
        type: 'document',
        transfer_method: 'remote_url',
        url: 'https://example.com/input.docx',
      },
    })
  })

  test('normalizes multi-file fields to dify file object arrays', async () => {
    mockApiPost.mockResolvedValue({
      status: 'completed',
      answer_text: 'ok',
      file_url: [],
    })

    const result = await aiService.createWithApi(
      123,
      {
        attachments: JSON.stringify([
          {
            url: 'https://example.com/input-a.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          {
            url: 'https://example.com/input-b.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ]),
      },
      {
        folderId: 8,
        fileFields: ['attachments'],
        multiFileFields: ['attachments'],
        apiProcess: '',
        taskKey: 'task_multifile_file_objects',
      },
    )

    expect(result.generatedContent).toBe('ok')
    expect(mockApiPost).toHaveBeenCalledTimes(1)

    const [, payload] = mockApiPost.mock.calls[0] as [string, { inputs: Record<string, unknown> }]
    expect(payload.inputs).toEqual({
      attachments: [
        {
          type: 'document',
          transfer_method: 'remote_url',
          url: 'https://example.com/input-a.docx',
        },
        {
          type: 'document',
          transfer_method: 'remote_url',
          url: 'https://example.com/input-b.docx',
        },
      ],
    })
  })
})
