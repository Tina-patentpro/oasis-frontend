import { act, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import type { Project, Session, SessionDetail } from '@/types/api'

jest.mock('@/api/services', () => ({
  aiService: {
    getChatflowPrompts: jest.fn(),
    sendChatflow: jest.fn(),
    uploadFile: jest.fn(),
  },
  sessionService: {
    associateProject: jest.fn(),
    dissociateProject: jest.fn(),
  },
}))

import { aiService, sessionService } from '@/api/services'

import { EMPTY_CHATFLOW_PROMPTS, createDeferred, createHook } from './__tests__/useChatManagement.test-utils'

afterEach(() => {
  jest.clearAllMocks()
})

describe('useChatManagement project association', () => {
  test('uses restoredProjectId instead of a stale project object when hydrating history', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    const { result, onWorkspaceProjectSelect } = createHook()
    const staleProject = { id: 7, name: '列表项目' } as Project

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1106,
          userId: 1,
          projectId: 33,
          title: '详情项目会话',
          toolType: 'chat.focus',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T08:00:00',
          updatedAt: '2026-05-21T08:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        staleProject,
        33,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(33)
    })
    expect(result.current.chatSession.associatedProjectName).toBeUndefined()
    expect(onWorkspaceProjectSelect).toHaveBeenLastCalledWith(33)
  })

  test('keeps an explicit no-project restore from falling back to the project object', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    const { result, onWorkspaceProjectSelect } = createHook()

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1109,
          userId: 1,
          projectId: null,
          title: '无项目会话',
          toolType: 'chat.focus',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T08:00:00',
          updatedAt: '2026-05-21T08:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        { id: 7, name: '列表项目' } as Project,
        null,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1109)
    })
    expect(result.current.chatSession.associatedProjectId).toBeUndefined()
    expect(onWorkspaceProjectSelect).toHaveBeenLastCalledWith(null)
  })

  test('does not roll back the current session when a previous session project association fails', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const associateProjectMock = sessionService.associateProject as jest.MockedFunction<
      typeof sessionService.associateProject
    >
    const association = createDeferred<Session>()

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    associateProjectMock.mockImplementation(() => association.promise)

    const { result, notify, onWorkspaceProjectSelect } = createHook()

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1107,
          userId: 1,
          projectId: 11,
          title: '会话 A',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T09:00:00',
          updatedAt: '2026-05-21T09:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        { id: 11, name: '项目 A' } as Project,
        11,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(11)
    })

    act(() => {
      result.current.setChatAssociatedProject({ id: 22, name: '项目 A 新关联' } as Project)
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(22)
    })

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1108,
          userId: 1,
          projectId: 33,
          title: '会话 B',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T10:00:00',
          updatedAt: '2026-05-21T10:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        { id: 33, name: '项目 B' } as Project,
        33,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.sessionId).toBe(1108)
    })
    onWorkspaceProjectSelect.mockClear()

    await act(async () => {
      association.reject(new Error('会话 A 关联失败'))
      try {
        await association.promise
      } catch {
        // expected
      }
    })

    expect(result.current.chatSession.sessionId).toBe(1108)
    expect(result.current.chatSession.associatedProjectId).toBe(33)
    expect(result.current.chatSession.associatedProjectName).toBe('项目 B')
    expect(onWorkspaceProjectSelect).not.toHaveBeenCalledWith(11)
    expect(notify).not.toHaveBeenCalledWith('更新会话关联项目失败，请稍后重试')
  })


  test('rolls back the local project association when backend association fails', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const associateProjectMock = sessionService.associateProject as jest.MockedFunction<
      typeof sessionService.associateProject
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    associateProjectMock.mockRejectedValue(new Error('关联失败'))

    const { result, notify, onWorkspaceProjectSelect } = createHook()
    const previousProject = {
      id: 11,
      name: '原项目',
    } as Project
    const nextProject = {
      id: 22,
      name: '新项目',
    } as Project

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1004,
          userId: 1,
          projectId: 11,
          title: '有关联项目的会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T09:00:00',
          updatedAt: '2026-05-21T09:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        previousProject,
        11,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(11)
    })
    onWorkspaceProjectSelect.mockClear()

    act(() => {
      result.current.setChatAssociatedProject(nextProject)
    })

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('更新会话关联项目失败，请稍后重试')
    })

    expect(associateProjectMock).toHaveBeenCalledWith(1004, { projectId: 22 })
    expect(result.current.chatSession.associatedProjectId).toBe(11)
    expect(result.current.chatSession.associatedProjectName).toBe('原项目')
    expect(onWorkspaceProjectSelect).toHaveBeenCalledWith(11)
  })


  test('ignores stale successful project association responses after a newer selection', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const associateProjectMock = sessionService.associateProject as jest.MockedFunction<
      typeof sessionService.associateProject
    >
    const firstAssociation = createDeferred<Session>()
    const secondAssociation = createDeferred<Session>()

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    associateProjectMock
      .mockImplementationOnce(() => firstAssociation.promise)
      .mockImplementationOnce(() => secondAssociation.promise)

    const { result, onWorkspaceProjectSelect } = createHook()
    const originalProject = { id: 11, name: '原项目' } as Project
    const staleProject = { id: 22, name: '旧选择项目' } as Project
    const latestProject = { id: 33, name: '最新选择项目' } as Project

    act(() => {
      result.current.hydrateChatSessionFromDetail(
        {
          id: 1005,
          userId: 1,
          projectId: 11,
          title: '连续切换关联项目的会话',
          toolType: 'chatflow',
          modelVersion: 'fast',
          status: 'completed',
          createdAt: '2026-05-21T09:00:00',
          updatedAt: '2026-05-21T09:00:00',
          chatMessages: [],
        } as SessionDetail,
        'focus',
        originalProject,
        11,
      )
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(11)
    })
    onWorkspaceProjectSelect.mockClear()

    act(() => {
      result.current.setChatAssociatedProject(staleProject)
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(22)
    })

    act(() => {
      result.current.setChatAssociatedProject(latestProject)
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(33)
    })

    await act(async () => {
      secondAssociation.resolve({} as Session)
      await secondAssociation.promise
    })

    await waitFor(() => {
      expect(onWorkspaceProjectSelect).toHaveBeenLastCalledWith(33)
    })

    await act(async () => {
      firstAssociation.resolve({} as Session)
      await firstAssociation.promise
    })

    expect(onWorkspaceProjectSelect).toHaveBeenLastCalledWith(33)
    expect(result.current.chatSession.associatedProjectId).toBe(33)
    expect(result.current.chatSession.associatedProjectName).toBe('最新选择项目')
  })

})
