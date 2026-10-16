/* eslint-disable max-lines -- DownloadFilesDialog 的导出回归场景集中在这个测试文件里，先保留同文件覆盖 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

jest.mock('@/utils/download', () => ({
  triggerDownload: jest.fn(),
  formatFileSize: jest.fn((size?: number) => (typeof size === 'number' ? '1 KB' : '大小未知')),
  EXPORT_FORMATS: {
    json: { format: 'json', extension: '.json' },
    zip: { format: 'zip', extension: '.zip' },
  },
}))

jest.mock('@/api/services', () => ({
  sessionService: {
    getSession: jest.fn(),
    batchDownloadWorkflows: jest.fn(),
  },
}))

jest.mock('@/api/services/instruction.service', () => ({
  instructionService: {
    getAllInstructionsForDownload: jest.fn(async () => ({ 1: [], 2: [], 3: [] })),
  },
}))

jest.mock('@/utils/exportUtils', () => ({
  exportSessions: jest.fn(),
  exportProjects: jest.fn(),
  exportHistory: jest.fn(),
}))

import { DownloadFilesDialog } from '../DownloadFilesDialog'
import { sessionService } from '@/api/services'
import { instructionService } from '@/api/services/instruction.service'
import { useUIStore } from '@/stores/useUIStore'
import { triggerDownload } from '@/utils/download'
import { exportSessions } from '@/utils/exportUtils'

function DownloadFilesDialogHarness({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = React.useState(true)

  return React.createElement(DownloadFilesDialog, {
    isOpen,
    onClose: () => {
      onClose()
      setIsOpen(false)
    },
    themeColor: '#10b981',
    backgroundColor: '#ffffff',
    exportType: 'files',
    data: {
      generatedFiles: [
        {
          fileId: 'file-1',
          fileName: 'a.docx',
          url: 'https://example.com/a.docx',
        },
      ],
    },
  })
}

describe('DownloadFilesDialog', () => {
  const mockedTriggerDownload = triggerDownload as jest.MockedFunction<typeof triggerDownload>
  const mockedExportSessions = exportSessions as jest.MockedFunction<typeof exportSessions>
  const mockedGetSession = sessionService.getSession as jest.MockedFunction<
    typeof sessionService.getSession
  >
  const mockedBatchDownloadWorkflows = sessionService.batchDownloadWorkflows as jest.MockedFunction<
    typeof sessionService.batchDownloadWorkflows
  >
  const mockedGetAllInstructions =
    instructionService.getAllInstructionsForDownload as jest.MockedFunction<
      typeof instructionService.getAllInstructionsForDownload
    >

  beforeEach(() => {
    mockedTriggerDownload.mockReset()
    mockedExportSessions.mockReset()
    mockedGetSession.mockReset()
    mockedBatchDownloadWorkflows.mockReset()
    mockedGetAllInstructions.mockReset()
    mockedGetAllInstructions.mockResolvedValue({ 1: [], 2: [], 3: [] })
    useUIStore.setState({ toast: null })
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = jest.fn(() => 'blob:workflow-export')
    } else {
      ;(window.URL.createObjectURL as jest.Mock | undefined)?.mockReset?.()
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = jest.fn()
    } else {
      ;(window.URL.revokeObjectURL as jest.Mock | undefined)?.mockReset?.()
    }
  })

  test('defaults to selecting all files when opened in files mode', () => {
    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'files',
        data: {
          generatedFiles: [
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
        },
      }),
    )

    const summary = screen.queryByText('已选择 2 / 2 个文件')
    expect(summary).not.toBeNull()
    expect(screen.getAllByText('全选')).toHaveLength(1)
    expect(screen.getAllByText('清空')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '全选' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '清空' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '取消' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '下载 (2)' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('checkbox', { name: '选择文件 a.docx' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '选择文件 b.docx' })).toBeChecked()
  })

  test('labels export options for non-file exports', () => {
    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'history',
        data: {
          history: [
            {
              id: 'history-1',
              title: '历史记录 A',
              content: '测试内容',
              date: '2026-06-01',
              type: 'workflow',
              tags: [],
              read: false,
              createdAt: '2026-06-01T00:00:00.000Z',
              updatedAt: '2026-06-01T00:00:00.000Z',
            },
          ],
        },
      }),
    )

    expect(screen.getByRole('combobox', { name: '导出格式' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '压缩为ZIP' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '包含附件' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '选择文件 历史记录 A' })).toBeInTheDocument()
  })

  test('labels the icon-only close button', () => {
    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'files',
        data: {
          generatedFiles: [],
        },
      }),
    )

    expect(screen.getByRole('button', { name: '关闭下载文件弹窗' })).toBeTruthy()
  })

  test('closes with Escape and restores background scrolling', async () => {
    const onClose = jest.fn()
    const previousOverflow = document.body.style.overflow

    render(React.createElement(DownloadFilesDialogHarness, { onClose }))

    const dialog = screen.getByRole('dialog', { name: '选择下载文件' })
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '选择下载文件' })).toBeNull()
    })
    expect(document.body.style.overflow).toBe(previousOverflow)
  })

  test('auto selects only once per open, does not reselect after rerender', () => {
    const initialFiles = [
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
    ]

    const { rerender } = render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'files',
        data: {
          generatedFiles: initialFiles,
        },
      }),
    )

    expect(screen.getByText('已选择 2 / 2 个文件')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '清空' }))
    expect(screen.getByText('已选择 0 / 2 个文件')).toBeTruthy()

    rerender(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'files',
        data: {
          generatedFiles: initialFiles.map((item) => ({ ...item })),
        },
      }),
    )

    expect(screen.getByText('已选择 0 / 2 个文件')).toBeTruthy()
  })

  test('shows a controlled download error without reporting success or closing the dialog', async () => {
    const onClose = jest.fn()
    const onDownload = jest.fn()
    mockedTriggerDownload.mockRejectedValueOnce(
      new Error('下载地址不受支持，请检查后重试'),
    )

    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose,
        onDownload,
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'files',
        data: {
          generatedFiles: [
            {
              fileId: 'file-1',
              fileName: 'a.docx',
              url: 'https://example.com/a.docx',
            },
          ],
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '下载 (1)' }))

    await waitFor(() => {
      expect(screen.getByText('下载地址不受支持，请检查后重试')).toBeTruthy()
    })

    expect(onDownload).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('prefers download_url over url when both are present', async () => {
    mockedTriggerDownload.mockResolvedValueOnce()

    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'files',
        data: {
          generatedFiles: [
            {
              fileId: 'file-1',
              fileName: 'a.docx',
              url: 'https://example.com/op/view.aspx?src=https%3A%2F%2Fdownload.example.com%2Fa.docx',
              download_url: 'https://download.example.com/a.docx',
            } as any,
          ],
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '下载 (1)' }))

    await waitFor(() => {
      expect(mockedTriggerDownload).toHaveBeenCalledWith(
        'https://download.example.com/a.docx',
        'a.docx',
      )
    })
  })

  test('hides file size and mime type for generated files', () => {
    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'files',
        data: {
          generatedFiles: [
            {
              fileId: 'file-1',
              fileName: 'a.docx',
              url: 'https://example.com/a.docx',
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
          ],
        },
      }),
    )

    expect(screen.queryByText('大小未知')).toBeNull()
    expect(
      screen.queryByText('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ).toBeNull()
  })

  test('does not report overall success when any selected file lacks a download url', async () => {
    const onClose = jest.fn()
    const onDownload = jest.fn()

    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose,
        onDownload,
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'files',
        data: {
          generatedFiles: [
            {
              fileId: 'file-1',
              fileName: 'a.docx',
              download_url: 'https://download.example.com/a.docx',
            } as any,
            {
              fileId: 'file-2',
              fileName: 'b.docx',
            } as any,
          ],
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '下载 (2)' }))

    await waitFor(() => {
      expect(screen.getByText('以下文件缺少可下载地址：b.docx')).toBeTruthy()
    })

    expect(mockedTriggerDownload).not.toHaveBeenCalled()
    expect(onDownload).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('exports selected workflows via local export flow instead of missing batch download api', async () => {
    mockedGetSession
      .mockResolvedValueOnce({
        id: 101,
        userId: 1,
        title: '技术交底书完善-Basic',
        toolType: 'workflow',
        modelVersion: 'fast',
        status: 'completed',
        createdAt: '2026-03-21T15:18:58',
        updatedAt: '2026-03-21T15:18:58',
        api_name: '技术交底书完善-Basic',
      })
      .mockResolvedValueOnce({
        id: 102,
        userId: 1,
        title: '技术背景研究报告-Basic',
        toolType: 'workflow',
        modelVersion: 'fast',
        status: 'completed',
        createdAt: '2026-03-21T13:30:57',
        updatedAt: '2026-03-21T13:30:57',
        api_name: '技术背景研究报告-Basic',
      })
    mockedExportSessions.mockResolvedValue({
      id: 'export_sessions_test',
      items: [],
      options: {},
      status: 'completed',
      progress: 100,
      result: {
        filename: 'sessions_export.zip',
        size: 123,
      },
    })
    mockedBatchDownloadWorkflows.mockResolvedValue(new Blob(['legacy']))

    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        onDownload: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'workflow',
        data: {
          workflows: [
            {
              id: 101,
              api_name: '技术交底书完善-Basic',
              user_id: 1,
              folder_id: 10,
              created_at: '2026-03-21T15:18:58',
            },
            {
              id: 102,
              api_name: '技术背景研究报告-Basic',
              user_id: 1,
              folder_id: 10,
              created_at: '2026-03-21T13:30:57',
            },
          ] as any,
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '全选' }))
    fireEvent.click(screen.getByRole('button', { name: '导出 (2)' }))

    await waitFor(() => {
      expect(mockedExportSessions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 101, title: '技术交底书完善-Basic' }),
          expect.objectContaining({ id: 102, title: '技术背景研究报告-Basic' }),
        ]),
        expect.objectContaining({
          format: 'zip',
          compress: true,
          includeAttachments: true,
        }),
      )
    })

    expect(mockedGetSession).toHaveBeenCalledTimes(2)
    expect(mockedGetSession).toHaveBeenNthCalledWith(1, 101)
    expect(mockedGetSession).toHaveBeenNthCalledWith(2, 102)
    expect(mockedBatchDownloadWorkflows).not.toHaveBeenCalled()
  })

  test('keeps exporting the available workflows when some selected workflow details fail to load', async () => {
    const onDownload = jest.fn()
    mockedGetSession
      .mockResolvedValueOnce({
        id: 101,
        userId: 1,
        title: '技术交底书完善-Basic',
        toolType: 'workflow',
        modelVersion: 'fast',
        status: 'completed',
        createdAt: '2026-03-21T15:18:58',
        updatedAt: '2026-03-21T15:18:58',
        api_name: '技术交底书完善-Basic',
      })
      .mockRejectedValueOnce(new Error('500'))
    mockedExportSessions.mockResolvedValue({
      id: 'export_sessions_test',
      items: [],
      options: {},
      status: 'completed',
      progress: 100,
      result: {
        filename: 'sessions_export.zip',
        size: 123,
      },
    } as any)

    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        onDownload,
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'workflow',
        data: {
          workflows: [
            {
              id: 101,
              api_name: '技术交底书完善-Basic',
              user_id: 1,
              folder_id: 10,
              created_at: '2026-03-21T15:18:58',
            },
            {
              id: 102,
              api_name: '技术背景研究报告-Basic',
              user_id: 1,
              folder_id: 10,
              created_at: '2026-03-21T13:30:57',
            },
          ] as any,
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '全选' }))
    fireEvent.click(screen.getByRole('button', { name: '导出 (2)' }))

    await waitFor(() => {
      expect(mockedExportSessions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 101, title: '技术交底书完善-Basic' }),
        ]),
        expect.objectContaining({
          format: 'zip',
          compress: true,
          includeAttachments: true,
        }),
      )
    })

    expect(mockedExportSessions).toHaveBeenCalledTimes(1)
    expect(mockedBatchDownloadWorkflows).not.toHaveBeenCalled()
    expect(onDownload).toHaveBeenCalledWith(new Set(['101']))

    await waitFor(() => {
      expect(
        screen.getByText(
          '主压缩包已导出，另有 1 条Workflow详情获取失败，未纳入导出：技术背景研究报告-Basic（ID: 102）',
        ),
      ).toBeTruthy()
    })
  })

  test('shows an error when all selected workflow details fail to load', async () => {
    mockedGetSession.mockRejectedValue(new Error('500'))

    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        onDownload: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'workflow',
        data: {
          workflows: [
            {
              id: 101,
              api_name: '技术交底书完善-Basic',
              user_id: 1,
              folder_id: 10,
              created_at: '2026-03-21T15:18:58',
            },
            {
              id: 102,
              api_name: '技术背景研究报告-Basic',
              user_id: 1,
              folder_id: 10,
              created_at: '2026-03-21T13:30:57',
            },
          ] as any,
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '全选' }))
    fireEvent.click(screen.getByRole('button', { name: '导出 (2)' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          '以下Workflow详情获取失败：技术交底书完善-Basic（ID: 101）、技术背景研究报告-Basic（ID: 102）',
        ),
      ).toBeTruthy()
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      '以下Workflow详情获取失败：技术交底书完善-Basic（ID: 101）、技术背景研究报告-Basic（ID: 102）',
    )

    expect(mockedExportSessions).not.toHaveBeenCalled()
    expect(mockedBatchDownloadWorkflows).not.toHaveBeenCalled()
  })

  test('shows partial-success hint when workflow export keeps the main zip but some attachments fail', async () => {
    mockedGetSession.mockResolvedValueOnce({
      id: 101,
      userId: 1,
      title: '技术交底书完善-Basic',
      toolType: 'workflow',
      modelVersion: 'fast',
      status: 'completed',
      createdAt: '2026-03-21T15:18:58',
      updatedAt: '2026-03-21T15:18:58',
      api_name: '技术交底书完善-Basic',
    })
    mockedExportSessions.mockResolvedValue({
      id: 'export_sessions_test',
      items: [],
      options: {},
      status: 'completed',
      progress: 100,
      result: {
        filename: 'sessions_export.zip',
        size: 123,
        reportPath: '_metadata/generated-files-report.json',
        attachmentSummary: {
          addedCount: 1,
          failedCount: 1,
        },
      },
    } as any)

    render(
      React.createElement(DownloadFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        onDownload: jest.fn(),
        themeColor: '#10b981',
        backgroundColor: '#ffffff',
        exportType: 'workflow',
        data: {
          workflows: [
            {
              id: 101,
              api_name: '技术交底书完善-Basic',
              user_id: 1,
              folder_id: 10,
              created_at: '2026-03-21T15:18:58',
            },
          ] as any,
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '全选' }))
    fireEvent.click(screen.getByRole('button', { name: '导出 (1)' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          '主压缩包已导出，另有 1 个附件未能打包；详情见压缩包内的 _metadata/generated-files-report.json',
        ),
      ).toBeTruthy()
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      '主压缩包已导出，另有 1 个附件未能打包；详情见压缩包内的 _metadata/generated-files-report.json',
    )
  })

  test('does not let an old auto-close timer close a newly opened dialog', async () => {
    jest.useFakeTimers()
    mockedTriggerDownload.mockResolvedValueOnce()
    const onClose = jest.fn()

    try {
      const firstDialog = render(
        <DownloadFilesDialog
          isOpen
          onClose={onClose}
          themeColor="#10b981"
          backgroundColor="#ffffff"
          exportType="files"
          data={{
            generatedFiles: [
              {
                fileId: 'file-1',
                fileName: 'a.docx',
                url: 'https://example.com/a.docx',
              },
            ],
          }}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: '下载 (1)' }))
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(mockedTriggerDownload).toHaveBeenCalledTimes(1)

      firstDialog.unmount()
      render(
        <DownloadFilesDialog
          isOpen
          onClose={onClose}
          themeColor="#10b981"
          backgroundColor="#ffffff"
          exportType="files"
          data={{ generatedFiles: [] }}
        />,
      )

      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog', { name: '选择下载文件' })).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })

  test('does not let an older instruction request overwrite a reopened dialog', async () => {
    let resolveFirst:
      | ((
          value: Awaited<ReturnType<typeof instructionService.getAllInstructionsForDownload>>,
        ) => void)
      | undefined
    mockedGetAllInstructions
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce({
        1: [
          {
            id: 2,
            type: 1,
            title: '新指令',
            content: '新内容',
            is_new: 0,
            created_at: '2026-07-10T08:00:00.000Z',
          },
        ],
        2: [],
        3: [],
      })

    const props = {
      onClose: jest.fn(),
      themeColor: '#10b981',
      backgroundColor: '#ffffff',
      exportType: 'instructions' as const,
    }
    const view = render(<DownloadFilesDialog {...props} isOpen />)
    await waitFor(() => expect(mockedGetAllInstructions).toHaveBeenCalledTimes(1))

    view.rerender(<DownloadFilesDialog {...props} isOpen={false} />)
    view.rerender(<DownloadFilesDialog {...props} isOpen />)
    expect(await screen.findByText('新指令')).toBeInTheDocument()

    await act(async () => {
      resolveFirst?.({
        1: [
          {
            id: 1,
            type: 1,
            title: '旧指令',
            content: '旧内容',
            is_new: 0,
            created_at: '2026-07-09T08:00:00.000Z',
          },
        ],
        2: [],
        3: [],
      })
      await Promise.resolve()
    })

    expect(screen.getByText('新指令')).toBeInTheDocument()
    expect(screen.queryByText('旧指令')).not.toBeInTheDocument()
  })

  test('reports a clipboard failure when copying an instruction', async () => {
    const showToast = jest.fn()
    useUIStore.setState({ showToast } as any)
    mockedGetAllInstructions.mockResolvedValue({
      1: [
        {
          id: 3,
          type: 1,
          title: '待复制指令',
          content: '指令正文',
          is_new: 0,
          created_at: '2026-07-10T08:00:00.000Z',
        },
      ],
      2: [],
      3: [],
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn(() => {
          throw new Error('denied')
        }),
      },
    })

    render(
      <DownloadFilesDialog
        isOpen
        onClose={jest.fn()}
        themeColor="#10b981"
        backgroundColor="#ffffff"
        exportType="instructions"
      />,
    )
    await screen.findByText('待复制指令')

    expect(() => fireEvent.click(screen.getByRole('button', { name: '复制' }))).not.toThrow()
    expect(showToast).toHaveBeenCalledWith('复制失败，请手动复制指令内容')
  })

  test('distinguishes an instruction loading failure from an empty library and retries', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockedGetAllInstructions
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        1: [
          {
            id: 4,
            type: 1,
            title: '重试后指令',
            content: '正文',
            is_new: 0,
            created_at: '2026-07-10T08:00:00.000Z',
          },
        ],
        2: [],
        3: [],
      })

    try {
      render(
        <DownloadFilesDialog
          isOpen
          onClose={jest.fn()}
          themeColor="#10b981"
          backgroundColor="#ffffff"
          exportType="instructions"
        />,
      )

      expect(await screen.findByRole('alert')).toHaveTextContent('加载指令库失败，请重试')
      expect(screen.queryByText('暂无指令数据')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
      expect(await screen.findByText('重试后指令')).toBeInTheDocument()
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
