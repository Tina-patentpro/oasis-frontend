/* eslint-disable max-lines -- 该测试文件集中覆盖 useGenerationActions 的回归场景，暂保留为单文件以复用共享夹具 */
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

import { useGenerationActions } from './generation-actions'
import { aiService } from '@/api/services'
import { ApiError } from '@/api/errors'
import { triggerDownload } from '@/utils/download'
import { ASYNC_TASK_CENTER_REMINDER_EVENT } from '@/modules/workspace/events/async-task-center-event'
import { useWorkspaceStore } from '../../stores'
import { useAsyncTaskStore } from '../../stores/async-task.store'
import type { SessionTrackingHint } from '../sidebar/optimistic-session'

function createParams(toolName: string) {
  return {
    apiDetail: null as import('@/types/api').ApiDetail | null,
    inputSections: {},
    generated: '',
    selectedProjectId: 1,
    activePages: [] as Array<{ key: string; label: string }>,
    dynamicTabs: [] as Array<{ k: string; t: string; tools: string[] }>,
    tab: 'tab-a',
    tool: { name: toolName, ver: 'v1' },
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
    onSessionTrackingHint: jest.fn<(hint: SessionTrackingHint) => void>(),
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function createFileList(files: File[]): FileList {
  return {
    ...files,
    length: files.length,
    item: (index: number) => files[index] ?? null,
  } as unknown as FileList
}

afterEach(() => {
  jest.clearAllMocks()
  useWorkspaceStore.setState({ selectedSessionId: null })
  useAsyncTaskStore.setState({ tasks: {} })
  sessionStorage.clear()
})

describe('useGenerationActions', () => {
  test('resets generation status to idle when switching tool', async () => {
    const { result, rerender } = renderHook(
      ({ toolName }) => useGenerationActions(createParams(toolName)),
      { initialProps: { toolName: 'tool-a' } },
    )

    expect(result.current.generationStatus).toBe('idle')

    act(() => {
      result.current.applyAsyncCompletionResult({ text: 'done', files: [] })
    })
    expect(result.current.generationStatus).toBe('success')

    rerender({ toolName: 'tool-b' })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('idle')
    })
  })

  test('startNewSession clears input and output without switching tool', async () => {
    const params = createParams('tool-a')
    useWorkspaceStore.setState({ selectedSessionId: 321 })
    const { result } = renderHook(() => useGenerationActions(params))

    act(() => {
      result.current.applyAsyncCompletionResult({ text: 'done', files: [] })
    })
    expect(result.current.generationStatus).toBe('success')

    act(() => {
      result.current.startNewSession()
    })

    expect(params.saveInputHistory).toHaveBeenCalledTimes(1)
    expect(params.resetInputSections).toHaveBeenCalledTimes(1)
    expect(params.setGenerated).toHaveBeenCalledWith('')
    expect(params.notify).toHaveBeenCalledWith('已开启新会话，输入与输出已清空')
    expect(useWorkspaceStore.getState().selectedSessionId).toBeNull()

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('idle')
    })
    expect(params.setTool).not.toHaveBeenCalled()
    expect(params.setTab).not.toHaveBeenCalled()
  })

  test('handleInputFiles accepts md files', async () => {
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    uploadFileMock.mockResolvedValue('https://example.com/uploads/readme.md')

    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        setInputSection: jest.fn(),
      }),
    )

    const mdFile = new File(['# title'], 'readme.md', { type: 'text/markdown' })
    const fileList = {
      0: mdFile,
      length: 1,
      item: (index: number) => (index === 0 ? mdFile : null),
    } as unknown as FileList

    await act(async () => {
      await result.current.handleInputFiles(fileList, 'input', 'file')
    })

    expect(uploadFileMock).toHaveBeenCalledTimes(1)
    expect(params.notify).not.toHaveBeenCalledWith(expect.stringContaining('格式暂不受支持'))
  })

  test('handleInputFiles replaces existing single file values', async () => {
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    uploadFileMock.mockResolvedValue('https://example.com/uploads/replaced.docx')

    const params = createParams('tool-a')
    params.setInputSection = jest.fn()

    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'attachment', type: 'file' }],
        } as any,
        inputSections: {
          attachment: JSON.stringify({
            url: 'https://example.com/uploads/old.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        },
      }),
    )

    await act(async () => {
      await result.current.handleInputFiles(
        createFileList([
          new File(['replacement'], 'replacement.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ]),
        'attachment',
        'file',
      )
    })

    expect(params.setInputSection).toHaveBeenCalledWith(
      'attachment',
      JSON.stringify({
        url: 'https://example.com/uploads/replaced.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    )
  })

  test('handleInputFiles appends file_list uploads while under limit', async () => {
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    uploadFileMock
      .mockResolvedValueOnce('https://example.com/uploads/d.docx')
      .mockResolvedValueOnce('https://example.com/uploads/e.docx')

    const params = createParams('tool-a')
    params.setInputSection = jest.fn()

    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'attachments', type: 'file_list' }],
        } as any,
        inputSections: {
          attachments: JSON.stringify([
            { url: 'https://example.com/uploads/a.docx', mimeType: 'application/msword' },
            { url: 'https://example.com/uploads/b.docx', mimeType: 'application/msword' },
            { url: 'https://example.com/uploads/c.docx', mimeType: 'application/msword' },
          ]),
        },
      }),
    )

    await act(async () => {
      await result.current.handleInputFiles(
        createFileList([
          new File(['d'], 'd.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
          new File(['e'], 'e.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ]),
        'attachments',
        'file',
        { mode: 'append' },
      )
    })

    const latestCalls = (params.setInputSection as jest.Mock).mock.calls
    const latestValue = latestCalls[latestCalls.length - 1]?.[1] as string
    expect(JSON.parse(latestValue)).toEqual([
      expect.objectContaining({ url: 'https://example.com/uploads/a.docx' }),
      expect.objectContaining({ url: 'https://example.com/uploads/b.docx' }),
      expect.objectContaining({ url: 'https://example.com/uploads/c.docx' }),
      expect.objectContaining({ url: 'https://example.com/uploads/d.docx' }),
      expect.objectContaining({ url: 'https://example.com/uploads/e.docx' }),
    ])
  })

  test('handleInputFiles replaces image uploads when image limit is reached', async () => {
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    uploadFileMock
      .mockResolvedValueOnce('https://example.com/uploads/new-a.png')
      .mockResolvedValueOnce('https://example.com/uploads/new-b.png')

    const params = createParams('tool-a')
    params.setInputSection = jest.fn()

    const existingImages = Array.from({ length: 5 }, (_item, index) => ({
      url: `https://example.com/uploads/old-${index + 1}.png`,
      mimeType: 'image/png',
    }))

    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'images', type: 'image' }],
        } as any,
        inputSections: {
          images: JSON.stringify(existingImages),
        },
      }),
    )

    await act(async () => {
      await result.current.handleInputFiles(
        createFileList([
          new File(['new-a'], 'new-a.png', { type: 'image/png' }),
          new File(['new-b'], 'new-b.png', { type: 'image/png' }),
        ]),
        'images',
        'image',
      )
    })

    expect(params.setInputSection).toHaveBeenCalledWith(
      'images',
      JSON.stringify([
        { url: 'https://example.com/uploads/new-a.png', mimeType: 'image/png' },
        { url: 'https://example.com/uploads/new-b.png', mimeType: 'image/png' },
      ]),
    )
  })

  test('handleDownload opens selector when generated files exist', async () => {
    const params = createParams('tool-a')
    const openSelector = jest.fn()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        onOpenDownloadSelector: openSelector,
      }),
    )

    act(() => {
      result.current.applyAsyncCompletionResult({
        text: 'done',
        files: [
          {
            fileId: 'file-1',
            fileName: 'a.docx',
            url: 'https://example.com/a.docx',
          },
          {
            fileId: 'file-2',
            fileName: 'b.docx',
            url: 'https://example.com/b.docx',
          },
        ],
      })
    })

    await act(async () => {
      await result.current.handleDownload()
    })

    expect(openSelector).toHaveBeenCalledTimes(1)
    expect(triggerDownload).not.toHaveBeenCalled()
  })

  test('marks success when file-only result contains downloadable files', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: ['https://example.com/generated.docx'],
      generatedContent: '',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
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
      expect(result.current.generationStatus).toBe('success')
    })
    expect(result.current.generatedFiles).toHaveLength(1)
  })

  test('submits formula, table and mermaid text without modifying the source', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      generatedContent: '同步完成',
      status: 'completed',
      outputs: {},
    } as any)
    const specialMarkdownInput = [
      '行内公式：\\(E=mc^2\\)',
      '',
      '\\[',
      '\\int_0^1 x^2\\, dx = \\frac{1}{3}',
      '\\]',
      '',
      '| 测试项 | 预期 |',
      '| --- | --- |',
      '| 表格 | 原样提交 |',
      '',
      'flowchart TD',
      '  A[开始] --> B{是否正常}',
    ].join('\n')

    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: specialMarkdownInput },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(createWithApiMock).toHaveBeenCalledWith(
        1,
        { userInstruction: specialMarkdownInput },
        expect.objectContaining({
          fileFields: [],
          multiFileFields: [],
        }),
      )
    })
  })

  test('keeps all backend file_url entries even when response.files is present', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: '/files/tools/a.docx?sign=1, /files/tools/b.docx?sign=2,/files/tools/c.docx?sign=3',
      files: [
        {
          fileId: 'internal-file-1',
          fileName: '内部文件.docx',
          size: 18856,
          url: 'https://internal.example.com/a.docx',
        },
      ],
      generatedContent: '',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
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
      expect(result.current.generationStatus).toBe('success')
    })
    expect(result.current.generatedFiles).toEqual([
      expect.objectContaining({
        url: '/files/tools/a.docx?sign=1',
      }),
      expect.objectContaining({
        url: '/files/tools/b.docx?sign=2',
      }),
      expect.objectContaining({
        url: '/files/tools/c.docx?sign=3',
      }),
    ])
  })

  test('disables generate during sync request and ignores repeated submits until completion', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    const deferred = createDeferred<any>()
    createWithApiMock.mockReturnValue(deferred.promise)

    const params = createParams('tool-a')
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

    expect(result.current.generateDisabled).toBe(false)

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(true)
      expect(result.current.generateDisabled).toBe(true)
    })

    act(() => {
      result.current.generate()
    })

    expect(createWithApiMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      deferred.resolve({
        file_url: [],
        generatedContent: '同步完成',
        status: 'completed',
        outputs: {},
      } as any)
      await deferred.promise
    })

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false)
      expect(result.current.generationStatus).toBe('success')
      expect(result.current.generateDisabled).toBe(false)
    })
  })

  test('keeps generate disabled while async work is running and unlocks after new session', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '异步处理中',
      status: 'running',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
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
      expect(result.current.generationStatus).toBe('running')
      expect(result.current.generateDisabled).toBe(true)
    })

    act(() => {
      result.current.generate()
    })

    expect(createWithApiMock).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.startNewSession()
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('idle')
      expect(result.current.generateDisabled).toBe(false)
    })
  })

  test('keeps generate disabled when required file input is still missing', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >

    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 18,
          is_async: 0,
          input_schema: [
            {
              en_name: 'drawings_explain',
              cn_name: '附图说明',
              type: 'paragraph',
              content: '简单说明',
            },
            { en_name: 'drawings', cn_name: '专利附图', type: 'file', content: '专利附图，必填' },
          ],
        } as any,
        activePages: [
          { key: 'drawings_explain', label: '附图说明' },
          { key: 'drawings', label: '专利附图' },
        ],
        inputSections: { drawings_explain: '图1为整体结构示意图。', drawings: '' },
      }),
    )

    expect(result.current.generateDisabled).toBe(true)

    act(() => {
      result.current.generate()
    })

    expect(params.notify).toHaveBeenCalledWith('请先补充必填项：专利附图')
    expect(createWithApiMock).not.toHaveBeenCalled()
  })

  test('re-checks required inputs after lazy-loading apiDetail before submit', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '不该触发到这里',
      status: 'completed',
      outputs: {},
    } as any)

    const ensureApiDetailLoaded = jest.fn(
      async () =>
        ({
          id: 18,
          is_async: 0,
          input_schema: [
            {
              en_name: 'drawings_explain',
              cn_name: '附图说明',
              type: 'paragraph',
              content: '简单说明',
            },
            { en_name: 'drawings', cn_name: '专利附图', type: 'file', content: '专利附图，必填' },
          ],
        }) as any,
    ) as unknown as () => Promise<import('@/types/api').ApiDetail | null>

    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: null,
        ensureApiDetailLoaded,
        activePages: [{ key: 'drawings_explain', label: '附图说明' }],
        inputSections: { drawings_explain: '图1为整体结构示意图。', drawings: '' },
      }),
    )

    expect(result.current.generateDisabled).toBe(false)

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(ensureApiDetailLoaded).toHaveBeenCalledTimes(1)
      expect(params.notify).toHaveBeenCalledWith('请先补充必填项：专利附图')
    })

    expect(createWithApiMock).not.toHaveBeenCalled()
    expect(result.current.generationStatus).toBe('idle')
  })

  test('treats sync running results as completed when backend already returned text and files', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: ['/files/tools/generated.docx?sign=1'],
      file_output: [
        {
          filename: '权利要求书.docx',
          download_url: '/files/tools/generated.docx?sign=1',
        },
      ],
      generatedContent: '这是同步工作流已经返回的正文',
      status: 'running',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
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
      expect(result.current.generationStatus).toBe('success')
    })

    expect(result.current.generateDisabled).toBe(false)
    expect(result.current.generatedFiles).toHaveLength(1)
    expect(params.setGenerated).toHaveBeenCalledWith('这是同步工作流已经返回的正文')
    expect(params.stopPolling).toHaveBeenCalled()
  })

  test('treats async running results as completed when backend already returned text and files', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: ['/files/tools/generated.docx?sign=1'],
      file_output: [
        {
          filename: '技术交底书.docx',
          download_url: '/files/tools/generated.docx?sign=1',
        },
      ],
      generatedContent: '这是后端提前回来的正文',
      status: 'running',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
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
      expect(result.current.generationStatus).toBe('success')
    })

    expect(result.current.generatedFiles).toHaveLength(1)
    expect(params.setGenerated).toHaveBeenCalledWith('这是后端提前回来的正文')
  })

  test('dispatches async task center reminder event when async task is submitted', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '异步处理中',
      status: 'running',
      outputs: {},
    } as any)

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(
        dispatchSpy.mock.calls.some(([event]) => event.type === ASYNC_TASK_CENTER_REMINDER_EVENT),
      ).toBe(true)
    })

    const reminderEvent = dispatchSpy.mock.calls.find(
      ([event]) => event.type === ASYNC_TASK_CENTER_REMINDER_EVENT,
    )?.[0] as CustomEvent | undefined

    expect(reminderEvent?.detail).toMatchObject({
      toolName: 'tool-a',
      folderId: 1,
    })
    expect(typeof reminderEvent?.detail.taskKey).toBe('string')
    expect(typeof reminderEvent?.detail.submittedAtMs).toBe('number')
  })

  test('registers async task only in async task store to avoid duplicate polling sources', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '异步处理中',
      status: 'running',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(Object.keys(useAsyncTaskStore.getState().tasks)).toHaveLength(1)
    })

  })

  test('stores submitted output schema on async tasks for later cleanup', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '异步处理中',
      status: 'running',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          output_schema: [
            {
              label: '权利要求书和生成报告',
              type: 'string',
              content: '',
            },
          ],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(Object.values(useAsyncTaskStore.getState().tasks)[0]?.outputFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: '权利要求书和生成报告',
          }),
        ]),
      )
    })
  })

  test('does not emit tracking hints for async workflows', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '异步处理中',
      status: 'running',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
    const onSessionTrackingHint = jest.fn<(hint: SessionTrackingHint) => void>()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        onSessionTrackingHint,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('running')
    })
    expect(onSessionTrackingHint).not.toHaveBeenCalled()
  })

  test('emits completed tracking hint for sync tools without leaving only submitted state', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '同步完成',
      status: 'completed',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
    const onSessionTrackingHint = jest.fn<(hint: SessionTrackingHint) => void>()
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        onSessionTrackingHint,
        apiDetail: {
          id: 1,
          is_async: 0,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '同步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(onSessionTrackingHint).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'completed',
          folderId: 1,
          title: '测试输入',
          toolType: 'tool-a',
        }),
      )
    })

    const submittedHint = onSessionTrackingHint.mock.calls.find(
      ([hint]) => hint.phase === 'submitted',
    )?.[0]
    const completedHint = onSessionTrackingHint.mock.calls.find(
      ([hint]) => hint.phase === 'completed',
    )?.[0]

    expect(submittedHint?.taskKey).toBe(completedHint?.taskKey)
    expect(completedHint?.phase).toBe('completed')
  })

  test('does not dispatch reminder or keep queued task when async submit fails before acceptance', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockRejectedValue(new ApiError('提交失败', 'UNKNOWN_ERROR', 500))

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(params.notify).toHaveBeenCalledWith('⚠️ 生成失败: 提交失败')
    })

    expect(
      dispatchSpy.mock.calls.some(([event]) => event.type === ASYNC_TASK_CENTER_REMINDER_EVENT),
    ).toBe(false)
    expect(useAsyncTaskStore.getState().tasks).toEqual({})
  })

  test('keeps queued task and still dispatches reminder when async submit times out but continues tracking', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockRejectedValue(new ApiError('请求超时', 'GATEWAY_TIMEOUT', 504))

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(params.notify).toHaveBeenCalledWith('任务已提交，后台处理中，正在继续查询进度。')
    })

    expect(
      dispatchSpy.mock.calls.some(([event]) => event.type === ASYNC_TASK_CENTER_REMINDER_EVENT),
    ).toBe(true)
    expect(Object.keys(useAsyncTaskStore.getState().tasks)).toHaveLength(1)
  })

  test('treats async response with result text and failed status as success instead of guidance', async () => {
    const createWithApiMock = aiService.createWithApi as jest.MockedFunction<
      typeof aiService.createWithApi
    >
    createWithApiMock.mockResolvedValue({
      file_url: [],
      generatedContent: '后端已经返回最终正文',
      status: 'failed',
      outputs: {},
    } as any)

    const params = createParams('tool-a')
    const { result } = renderHook(() =>
      useGenerationActions({
        ...params,
        apiDetail: {
          id: 1,
          is_async: 1,
          input_schema: [{ en_name: 'userInstruction', type: 'text' }],
          name: '异步工具A',
        } as any,
        activePages: [{ key: 'userInstruction', label: '用户指令' }],
        inputSections: { userInstruction: '测试输入' },
      }),
    )

    act(() => {
      result.current.generate()
    })

    await waitFor(() => {
      expect(result.current.generationStatus).toBe('success')
    })

    expect(params.setGenerated).toHaveBeenCalledWith('后端已经返回最终正文')
  })
})
