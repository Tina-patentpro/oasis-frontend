import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'

jest.mock('@/api/services', () => ({
  historyService: {
    getHistoryDataItem: jest.fn(),
  },
}))

jest.mock('@/api/services/session.service', () => ({
  sessionService: {
    getSession: jest.fn(),
  },
}))

import { historyService } from '@/api/services'
import { sessionService } from '@/api/services/session.service'
import type { InputSection as InputSectionDefinition } from '@/types/api'

import { useHistoryActions } from './history-actions'

const historyServiceMock = historyService as jest.Mocked<typeof historyService>
const sessionServiceMock = sessionService as jest.Mocked<typeof sessionService>

function createWorkflowSession(overrides: Partial<import('@/types/api').Session> = {}) {
  return {
    id: 586,
    userId: 1,
    projectId: 9,
    title: '技术背景研究报告',
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed' as const,
    createdAt: '2026-03-22 10:05:00',
    updatedAt: '2026-03-22 10:05:00',
    type: 1,
    answer_text: '',
    file_url: '',
    file_output: [
      {
        filename: 'Flow-1-1-技术背景研究报告-1.0.1-2026-03-22 10:04.docx',
        url: '/files/tools/1d22767d-b169-4d77-a1c1-c7c3de004ff8.docx?sign=3',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    ],
    api_name: '技术背景研究报告-Basic-1.0.1',
    ...overrides,
  }
}

function createStoredFiles(count: number, prefix = 'existing') {
  return JSON.stringify(
    Array.from({ length: count }, (_item, index) => ({
      url: `https://example.com/${prefix}-${index + 1}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      name: `${prefix}-${index + 1}.docx`,
    })),
  )
}

function createSectionDefinition(
  overrides: Partial<InputSectionDefinition> = {},
): InputSectionDefinition {
  return {
    key: 'attachment',
    label: '附件',
    inputMode: 'file',
    isMultiFile: false,
    supportsFileUpload: true,
    supportsImageUpload: false,
    required: false,
    ...overrides,
  }
}

function createSelectedDialogFiles(
  count: number,
  prefix = 'history',
  extension = 'docx',
  mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
) {
  return Array.from({ length: count }, (_item, index) => ({
    selectionId: `${prefix}-${index + 1}`,
    sessionId: 586,
    sessionTitle: '技术背景研究报告',
    url: `/files/tools/${prefix}-${index + 1}.${extension}?sign=${index + 1}`,
    mimeType,
    name: `${prefix}-${index + 1}.${extension}`,
    createdAt: '2026-03-22 10:05:00',
    isImage: mimeType.startsWith('image/'),
  }))
}

describe('useHistoryActions', () => {
  beforeEach(() => {
    historyServiceMock.getHistoryDataItem.mockReset()
    sessionServiceMock.getSession.mockReset()
  })

  test('loadSessionFiles restores generated files from file_output when file_url is empty', () => {
    const setGeneratedFiles = jest.fn()

    const { result } = renderHook(() =>
      useHistoryActions({
        notify: jest.fn(),
        openHistoryDialog: jest.fn(),
        openLocalHistoryDialog: jest.fn(),
        setHistoryConfirmCallback: jest.fn(),
        sessions: [],
        selectedProjectId: null,
        activePages: [],
        inputPage: 'userInstruction',
        inputSections: {},
        sectionDefinitions: {},
        setInputSection: jest.fn(),
        setInputPage: jest.fn(),
        setGenerated: jest.fn(),
        saveInputHistory: jest.fn(),
        setGeneratedFiles,
      }),
    )

    result.current.loadSessionFiles({
      sessionId: 586,
      fileUrl: '',
      fileOutput: [
        {
          filename: 'Flow-1-1-技术背景研究报告-1.0.1-2026-03-22 10:04.docx',
          url: '/files/tools/1d22767d-b169-4d77-a1c1-c7c3de004ff8.docx?sign=3',
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    })

    expect(setGeneratedFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        fileName: 'Flow-1-1-技术背景研究报告-1.0.1-2026-03-22 10:04.docx',
        url: '/files/tools/1d22767d-b169-4d77-a1c1-c7c3de004ff8.docx?sign=3',
      }),
    ])
  })

  test('readHistoryToInput opens project download dialog even when only one file-output session is available', () => {
    const openLocalHistoryDialog = jest.fn()
    const setInputSection = jest.fn()

    const { result } = renderHook(() =>
      useHistoryActions({
        notify: jest.fn(),
        openHistoryDialog: jest.fn(),
        openLocalHistoryDialog,
        setHistoryConfirmCallback: jest.fn(),
        sessions: [createWorkflowSession({ file_url: '' })],
        selectedProjectId: 9,
        activePages: [{ key: 'attachment', label: '附件' }],
        inputPage: 'attachment',
        inputSections: {
          attachment: '',
        },
        sectionDefinitions: {
          attachment: createSectionDefinition({ isMultiFile: true }),
        },
        setInputSection,
        setInputPage: jest.fn(),
        setGenerated: jest.fn(),
        saveInputHistory: jest.fn(),
        setGeneratedFiles: jest.fn(),
      }),
    )

    result.current.readHistoryToInput()

    expect(openLocalHistoryDialog).toHaveBeenCalledWith({
      projectId: 9,
      title: '读取本项目下载文件',
      sessions: [expect.objectContaining({ id: 586 })],
    })
    expect(setInputSection).not.toHaveBeenCalled()
  })

  test('readHistoryToInput does not register a confirm callback before a project is selected', () => {
    const setHistoryConfirmCallback = jest.fn()

    const { result } = renderHook(() =>
      useHistoryActions({
        notify: jest.fn(),
        openHistoryDialog: jest.fn(),
        openLocalHistoryDialog: jest.fn(),
        setHistoryConfirmCallback,
        sessions: [createWorkflowSession({ file_url: '' })],
        selectedProjectId: null,
        activePages: [{ key: 'attachment', label: '闄勪欢' }],
        inputPage: 'attachment',
        inputSections: {
          attachment: '',
        },
        sectionDefinitions: {
          attachment: createSectionDefinition({ isMultiFile: true }),
        },
        setInputSection: jest.fn(),
        setInputPage: jest.fn(),
        setGenerated: jest.fn(),
        saveInputHistory: jest.fn(),
        setGeneratedFiles: jest.fn(),
      }),
    )

    result.current.readHistoryToInput('attachment')

    expect(setHistoryConfirmCallback).not.toHaveBeenCalled()
  })

  test('readHistoryToInput does not register a confirm callback when the project has no readable files', () => {
    const setHistoryConfirmCallback = jest.fn()

    const { result } = renderHook(() =>
      useHistoryActions({
        notify: jest.fn(),
        openHistoryDialog: jest.fn(),
        openLocalHistoryDialog: jest.fn(),
        setHistoryConfirmCallback,
        sessions: [],
        selectedProjectId: 9,
        activePages: [{ key: 'attachment', label: '闄勪欢' }],
        inputPage: 'attachment',
        inputSections: {
          attachment: '',
        },
        sectionDefinitions: {
          attachment: createSectionDefinition({ isMultiFile: true }),
        },
        setInputSection: jest.fn(),
        setInputPage: jest.fn(),
        setGenerated: jest.fn(),
        saveInputHistory: jest.fn(),
        setGeneratedFiles: jest.fn(),
      }),
    )

    result.current.readHistoryToInput('attachment')

    expect(setHistoryConfirmCallback).not.toHaveBeenCalled()
  })

  test('readHistoryToInput appends project download files within remaining limit for multi-file inputs', async () => {
    const notify = jest.fn()
    const openLocalHistoryDialog = jest.fn()
    const setInputSection = jest.fn()
    let confirmCallback:
      | ((selectedData: string[], rawItems?: Array<Record<string, unknown>>) => Promise<void>)
      | undefined

    const { result } = renderHook(() =>
      useHistoryActions({
        notify,
        openHistoryDialog: jest.fn(),
        openLocalHistoryDialog,
        setHistoryConfirmCallback: jest.fn((factory: () => typeof confirmCallback) => {
          confirmCallback = factory()
        }),
        sessions: [createWorkflowSession({ id: 586, file_url: '' })],
        selectedProjectId: 9,
        activePages: [{ key: 'attachment', label: '附件' }],
        inputPage: 'attachment',
        inputSections: {
          attachment: createStoredFiles(3, 'current'),
        },
        sectionDefinitions: {
          attachment: createSectionDefinition({ isMultiFile: true }),
        },
        setInputSection,
        setInputPage: jest.fn(),
        setGenerated: jest.fn(),
        saveInputHistory: jest.fn(),
        setGeneratedFiles: jest.fn(),
      }),
    )

    result.current.readHistoryToInput('attachment')

    await confirmCallback?.(
      ['append-target-1.docx', 'append-target-2.docx', 'append-target-3.docx'],
      createSelectedDialogFiles(3, 'append-target'),
    )

    await waitFor(() => {
      expect(setInputSection).toHaveBeenCalledTimes(1)
    })

    const nextValue = JSON.parse(setInputSection.mock.calls[0][1] as string) as Array<{
      url: string
      name?: string
    }>

    expect(openLocalHistoryDialog).toHaveBeenCalled()
    expect(nextValue).toHaveLength(5)
    expect(nextValue.slice(0, 3).map((item) => item.name)).toEqual([
      'current-1.docx',
      'current-2.docx',
      'current-3.docx',
    ])
    expect(nextValue.slice(3).map((item) => item.name)).toEqual([
      'append-target-1.docx',
      'append-target-2.docx',
    ])
    expect(notify).toHaveBeenCalledWith('已导入项目下载文件，超出上限的 1 个文件已忽略')
  })

  test('readHistoryToInput replaces current files when image input is already at limit', async () => {
    const notify = jest.fn()
    const setInputSection = jest.fn()
    let confirmCallback:
      | ((selectedData: string[], rawItems?: Array<Record<string, unknown>>) => Promise<void>)
      | undefined

    const { result } = renderHook(() =>
      useHistoryActions({
        notify,
        openHistoryDialog: jest.fn(),
        openLocalHistoryDialog: jest.fn(),
        setHistoryConfirmCallback: jest.fn((factory: () => typeof confirmCallback) => {
          confirmCallback = factory()
        }),
        sessions: [createWorkflowSession({ id: 586, file_url: '' })],
        selectedProjectId: 9,
        activePages: [{ key: 'attachment', label: '附件说明' }],
        inputPage: 'attachment',
        inputSections: {
          attachment: JSON.stringify(
            Array.from({ length: 5 }, (_item, index) => ({
              url: `https://example.com/current-image-${index + 1}.png`,
              mimeType: 'image/png',
              name: `current-image-${index + 1}.png`,
            })),
          ),
        },
        sectionDefinitions: {
          attachment: createSectionDefinition({
            inputMode: 'image',
            supportsImageUpload: true,
            supportsFileUpload: false,
          }),
        },
        setInputSection,
        setInputPage: jest.fn(),
        setGenerated: jest.fn(),
        saveInputHistory: jest.fn(),
        setGeneratedFiles: jest.fn(),
      }),
    )

    result.current.readHistoryToInput('attachment')

    await confirmCallback?.(
      ['replace-image-1.png', 'replace-image-2.png'],
      createSelectedDialogFiles(2, 'replace-image', 'png', 'image/png'),
    )

    await waitFor(() => {
      expect(setInputSection).toHaveBeenCalledTimes(1)
    })

    const nextValue = JSON.parse(setInputSection.mock.calls[0][1] as string) as Array<{
      name?: string
    }>

    expect(nextValue).toHaveLength(2)
    expect(nextValue.map((item) => item.name)).toEqual([
      'replace-image-1.png',
      'replace-image-2.png',
    ])
    expect(notify).toHaveBeenCalledWith('已替换当前参数中的项目下载文件')
  })

  test('readHistoryToInput only imports the checked files from one session', async () => {
    const notify = jest.fn()
    const setInputSection = jest.fn()
    let confirmCallback:
      | ((selectedData: string[], rawItems?: Array<Record<string, unknown>>) => Promise<void>)
      | undefined

    const { result } = renderHook(() =>
      useHistoryActions({
        notify,
        openHistoryDialog: jest.fn(),
        openLocalHistoryDialog: jest.fn(),
        setHistoryConfirmCallback: jest.fn((factory: () => typeof confirmCallback) => {
          confirmCallback = factory()
        }),
        sessions: [createWorkflowSession({ id: 586, file_url: '' })],
        selectedProjectId: 9,
        activePages: [{ key: 'attachment', label: '附件' }],
        inputPage: 'attachment',
        inputSections: {
          attachment: '',
        },
        sectionDefinitions: {
          attachment: createSectionDefinition({ isMultiFile: true }),
        },
        setInputSection,
        setInputPage: jest.fn(),
        setGenerated: jest.fn(),
        saveInputHistory: jest.fn(),
        setGeneratedFiles: jest.fn(),
      }),
    )

    result.current.readHistoryToInput('attachment')

    await confirmCallback?.(['history-2.docx'], [createSelectedDialogFiles(2, 'history')[1]])

    await waitFor(() => {
      expect(setInputSection).toHaveBeenCalledTimes(1)
    })

    expect(setInputSection).toHaveBeenCalledWith(
      'attachment',
      JSON.stringify([
        {
          url: '/files/tools/history-2.docx?sign=2',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          name: 'history-2.docx',
        },
      ]),
    )
    expect(notify).toHaveBeenCalledWith('已导入项目下载文件')
  })

  test('autoReadHistory fills file input when history detail contains file_output only', async () => {
    const notify = jest.fn()
    const saveInputHistory = jest.fn()
    const setInputSection = jest.fn()

    historyServiceMock.getHistoryDataItem.mockResolvedValue({
      id: '586',
      title: '技术背景研究报告',
      content: '',
      date: '2026/3/22',
      type: 'workflow',
      tags: [],
      read: false,
      createdAt: '2026-03-22 10:05:00',
      updatedAt: '2026-03-22 10:05:00',
      file_url: '',
      file_output: [
        {
          filename: '技术背景研究报告.docx',
          url: '/files/tools/tech-landscape.docx?sign=1',
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    })

    const { result } = renderHook(() =>
      useHistoryActions({
        notify,
        openHistoryDialog: jest.fn(),
        openLocalHistoryDialog: jest.fn(),
        setHistoryConfirmCallback: jest.fn(),
        sessions: [],
        selectedProjectId: 586,
        activePages: [{ key: 'attachment', label: '附件' }],
        inputPage: 'attachment',
        inputSections: {
          attachment: '',
        },
        sectionDefinitions: {
          attachment: createSectionDefinition(),
        },
        setInputSection,
        setInputPage: jest.fn(),
        setGenerated: jest.fn(),
        saveInputHistory,
        setGeneratedFiles: jest.fn(),
      }),
    )

    await result.current.autoReadHistory()

    expect(saveInputHistory).toHaveBeenCalledTimes(1)
    expect(setInputSection).toHaveBeenCalledWith(
      'attachment',
      JSON.stringify([
        {
          url: '/files/tools/tech-landscape.docx?sign=1',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          name: '技术背景研究报告.docx',
        },
      ]),
    )
    expect(notify).toHaveBeenCalledWith('已自动填充文件')
  })
})
