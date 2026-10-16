import { act, renderHook } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import type { Project, Session } from '@/types/api'
import { sessionService } from '@/api/services'
import { exportSessions } from '@/utils/exportUtils'
import { downloadText } from '@/utils/download'

import { useSessionManagement } from './useSessionManagement'

jest.mock('@/api/services', () => ({
  historyService: {
    searchHistoryData: jest.fn(),
  },
  sessionService: {
    exportSession: jest.fn(),
    getSession: jest.fn(),
  },
}))

jest.mock('@/utils/exportUtils', () => ({
  exportSessions: jest.fn(),
}))

jest.mock('@/utils/download', () => ({
  createTimestampedFileName: jest.fn((title: string, extension: string) => `${title}.${extension}`),
  downloadFromUrl: jest.fn(),
  downloadText: jest.fn(),
}))

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    userId: 1,
    title: '会话A',
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 9,
    userId: 1,
    name: '项目A',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderSessionManagement(callbacks: Parameters<typeof useSessionManagement>[4] = {}) {
  const notify = jest.fn()
  const showConfirm = jest.fn()
  const hideConfirm = jest.fn()
  const setQuickCreateProjectOpen = jest.fn()

  const hook = renderHook(() =>
    useSessionManagement(notify, showConfirm, hideConfirm, setQuickCreateProjectOpen, callbacks),
  )

  return {
    ...hook,
    hideConfirm,
    notify,
    setQuickCreateProjectOpen,
    showConfirm,
  }
}

describe('useSessionManagement', () => {
  test('exports real backend session details instead of downloading placeholder content', async () => {
    const session = createSession()
    const detail = createSession({
      answer_text: '后端返回的真实会话内容',
      file_url: '/files/generated-result.docx',
    })
    const getSession = sessionService.getSession as jest.MockedFunction<
      typeof sessionService.getSession
    >
    const exportRealSessions = exportSessions as jest.MockedFunction<typeof exportSessions>
    getSession.mockResolvedValue(detail)
    exportRealSessions.mockResolvedValue({
      id: 'export-1',
      items: [],
      options: {},
      status: 'completed',
      progress: 100,
      result: { filename: 'sessions_export.zip', size: 100 },
    })
    const { notify, result } = renderSessionManagement()

    await act(async () => {
      await result.current.handleExportSession(session)
    })

    expect(getSession).toHaveBeenCalledWith(1)
    expect(exportRealSessions).toHaveBeenCalledWith([detail], {
      format: 'zip',
      compress: true,
      includeAttachments: true,
    })
    expect(downloadText).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('会话"会话A"导出成功')
  })

  test('keeps association dialog open and retryable when project association fails', async () => {
    const session = createSession()
    const project = createProject()
    const onAssociateProject = jest
      .fn<(session: Session, projectId: number) => Promise<void>>()
      .mockRejectedValueOnce(new Error('associate failed'))
    const { notify, result } = renderSessionManagement({ onAssociateProject })

    act(() => {
      result.current.handleAssociateProject(session)
    })

    expect(result.current.associateProjectDialogOpen).toBe(true)
    expect(result.current.currentSessionTitle).toBe('会话A')

    await act(async () => {
      const associated = await result.current.handleProjectSelect(project)
      expect(associated).toBe(false)
    })

    expect(onAssociateProject).toHaveBeenCalledWith(session, 9)
    expect(notify).toHaveBeenCalledWith('关联项目失败，请稍后重试')
    expect(result.current.associateProjectDialogOpen).toBe(true)
    expect(result.current.currentSessionTitle).toBe('会话A')
    expect(result.current.isAssociatingProject).toBe(false)
  })

  test('closes association dialog and clears context after successful project association', async () => {
    const session = createSession()
    const project = createProject()
    const onAssociateProject = jest
      .fn<(session: Session, projectId: number) => Promise<void>>()
      .mockResolvedValue(undefined)
    const { result } = renderSessionManagement({ onAssociateProject })

    act(() => {
      result.current.handleAssociateProject(session)
    })

    await act(async () => {
      const associated = await result.current.handleProjectSelect(project)
      expect(associated).toBe(true)
    })

    expect(result.current.associateProjectDialogOpen).toBe(false)
    expect(result.current.currentSessionTitle).toBe('')
    expect(result.current.isAssociatingProject).toBe(false)
  })
})
