import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('@/constants', () => ({
  DESTS: [] as Array<{ key: string; label: string }>,
  TABS: [] as Array<{ k: string; t: string; tools: string[] }>,
}))

jest.mock('@/api/services', () => ({
  aiService: {
    uploadFile: jest.fn(),
    createWithApi: jest.fn(),
  },
}))

jest.mock('@/utils/download', () => ({
  triggerDownload: jest.fn(),
}))

import { aiService } from '@/api/services'
import { triggerDownload } from '@/utils/download'

import { useGenerationActions } from './generation-actions'

function createParams() {
  return {
    apiDetail: null as import('@/types/api').ApiDetail | null,
    inputSections: {},
    generated: '',
    selectedProjectId: 1,
    activePages: [] as Array<{ key: string; label: string }>,
    dynamicTabs: [] as Array<{ k: string; t: string; tools: string[] }>,
    tab: 'tab-a',
    tool: { name: 'tool-a', ver: 'v1' },
    toolMetadataByName: {},
    notify: jest.fn(),
    setGenerated: jest.fn(),
    addVersion: jest.fn(),
    saveInputHistory: jest.fn(),
    resetInputSections: jest.fn(),
    undoInputSections: jest.fn(),
    setInputSection: jest.fn(),
    setInputPage: jest.fn(),
    setTab: jest.fn(),
    setTool: jest.fn(),
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
  }
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('useGenerationActions contract behavior', () => {
  test('keeps preview text equal to answer_text when files also exist', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: ['/files/tools/generated.docx?sign=1'],
      generatedContent: '这是 answer_text',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(params.setGenerated).toHaveBeenCalledWith('这是 answer_text')
    })
  })

  test('removes Dify output field label from generated preview using output schema', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '权利要求书和生成报告: 1. 一种自适应办公椅系统，包括座椅主体。',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          output_schema: [
            {
              cn_name: '权利要求书和生成报告',
              en_name: 'claims_report',
              type: 'string',
              content: '',
            },
          ],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(params.setGenerated).toHaveBeenCalledWith('1. 一种自适应办公椅系统，包括座椅主体。')
    })
  })

  test('removes Dify output field label from plain paragraph using schema aliases', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '权利要求书和生成报告: 本发明公开了一种自适应办公椅系统。',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          output_schema: [
            {
              label: '权利要求书和生成报告',
              name: 'claims_report',
              key: 'claims_report',
              api_name: 'claims_report',
              type: 'string',
              content: '',
            },
          ],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(params.setGenerated).toHaveBeenCalledWith('本发明公开了一种自适应办公椅系统。')
    })
  })

  test('removes standard main text output name without schema or outputs', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '生成内容: 正文段落',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          output_schema: [],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(params.setGenerated).toHaveBeenCalledWith('正文段落')
    })
  })

  test('passes submitted output schema to polling with the task key', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '权利要求书: 权利要求书\n\n1. 一种自适应办公椅系统。',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          output_schema: [
            {
              cn_name: '权利要求书',
              en_name: 'claims',
              type: 'string',
              content: '',
            },
          ],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(params.startPolling).toHaveBeenCalledWith(
        expect.stringMatching(/^task_/),
        expect.objectContaining({
          outputFields: expect.arrayContaining([
            expect.objectContaining({
              name: '权利要求书',
              allowStructuralPrefix: true,
            }),
          ]),
        }),
      )
    })
  })

  test('keeps relative comma-separated file_url for direct download and ignores response.files', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url:
        '/files/tools/generated-a.docx?sign=1, /files/tools/generated-b.docx?sign=2,/files/tools/generated-c.docx?sign=3',
      files: [
        {
          fileId: 'wrong-file',
          fileName: '内部文件.docx',
          url: 'https://internal.example.com/generated.docx',
        },
      ],
      generatedContent: '',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.generatedFiles).toHaveLength(3)
    })

    await act(async () => {
      await result.current.handleDownload()
    })

    expect(triggerDownload).toHaveBeenNthCalledWith(
      1,
      '/files/tools/generated-a.docx?sign=1',
      expect.stringContaining('.docx'),
    )
    expect(triggerDownload).toHaveBeenNthCalledWith(
      2,
      '/files/tools/generated-b.docx?sign=2',
      expect.stringContaining('.docx'),
    )
    expect(triggerDownload).toHaveBeenNthCalledWith(
      3,
      '/files/tools/generated-c.docx?sign=3',
      expect.stringContaining('.docx'),
    )
  })

  test('uses the same top-level file_output and file_url rules as async workflow', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
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
      generatedContent: '',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.generatedFiles).toHaveLength(3)
    })

    // file_output[0] 合并到 file_url[0]; file_output[1] 独立添加; file_url[1] (final-b) 保留
    expect(result.current.generatedFiles).toEqual([
      expect.objectContaining({
        url: '/files/tools/final-a.docx?sign=1',
        fileName: '技术交底书.docx',
      }),
      expect.objectContaining({
        url: '/files/tools/real-b.docx?sign=2',
        fileName: '技术要素表.docx',
        size: 2048,
      }),
      expect.objectContaining({
        url: '/files/tools/final-b.docx?sign=2',
      }),
    ])
    expect(params.setGenerated).toHaveBeenCalledWith(
      '生成完成，文件已准备好，请点击“下载”按钮获取。',
    )
  })

  test('ignores embedded response notices when backend already provided answer_text', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '这是后台给前端的正文',
      status: 'completed',
      outputs: {
        async_notice_markdown: '这段内部提示不应进入前端展示',
      },
      rawResponse: {
        async_notice_markdown: '这段内部提示不应进入前端展示',
      },
    } as any)

    const params = createParams()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(params.setGenerated).toHaveBeenCalledWith('这是后台给前端的正文')
    })
  })

  test('does not rewrite completed answer_text into async guidance just because正文包含异步字样', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '本方案包含异步处理流程说明，这是正式正文。',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(params.setGenerated).toHaveBeenCalledWith('本方案包含异步处理流程说明，这是正式正文。')
    })
  })
})
