import { act, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import type { Project } from '@/types/api'

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

import { aiService } from '@/api/services'

import {
  EMPTY_CHATFLOW_PROMPTS,
  createDeferred,
  createFileList,
  createHook,
} from './__tests__/useChatManagement.test-utils'

afterEach(() => {
  jest.clearAllMocks()
})

describe('useChatManagement sendChat attachments', () => {
  test('stops sending and keeps the draft when an attachment upload fails', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    uploadFileMock.mockRejectedValue(new Error('上传失败'))

    const { result, notify } = createHook()
    const file = new File(['bad attachment'], '失败附件.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.addChatAttachments(createFileList([file]), 'file')
      result.current.changeChatInput('请分析这个附件')
    })

    await waitFor(() => {
      expect(result.current.chatAttachments).toHaveLength(1)
      expect(result.current.chatInput).toBe('请分析这个附件')
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledTimes(1)
      expect(result.current.chatLoading).toBe(false)
    })

    expect(sendChatflowMock).not.toHaveBeenCalled()
    expect(result.current.chatInput).toBe('请分析这个附件')
    expect(result.current.chatAttachments).toHaveLength(1)
    expect(result.current.chatSession.messages).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ content: expect.stringContaining('请分析这个附件') }),
      ]),
    )
    expect(result.current.chatError).toBe('文件上传失败: 失败附件.pdf')
    expect(notify).toHaveBeenCalledWith('文件上传失败: 失败附件.pdf')
  })

  test('keeps attachments unchanged when removal is requested during send', async () => {
    const uploadDeferred = createDeferred<string>()
    const sendDeferred = createDeferred<{ answer: string; conversation_id: string }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    uploadFileMock.mockImplementation(() => uploadDeferred.promise)
    sendChatflowMock.mockImplementation(() => sendDeferred.promise as any)

    const { result } = createHook()
    const file = new File(['attachment content'], '发送中附件.pdf', {
      type: 'application/pdf',
    })

    act(() => {
      result.current.addChatAttachments(createFileList([file]), 'file')
      result.current.changeChatInput('请分析这个附件')
    })

    await waitFor(() => {
      expect(result.current.chatAttachments).toHaveLength(1)
    })

    const attachmentId = result.current.chatAttachments[0]?.id
    if (!attachmentId) {
      throw new Error('attachment id not found')
    }

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
      expect(uploadFileMock).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.removeChatAttachment(attachmentId)
    })

    expect(result.current.chatAttachments).toHaveLength(1)

    await act(async () => {
      uploadDeferred.resolve('https://example.com/attachment.pdf')
      await uploadDeferred.promise
    })

    await waitFor(() => {
      expect(sendChatflowMock).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      sendDeferred.resolve({
        answer: '分析完成',
        conversation_id: 'conv_attachment_lock',
      })
      await sendDeferred.promise
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })
  })

  test('uses the project selected at send time after attachment upload finishes', async () => {
    const uploadDeferred = createDeferred<string>()
    const sendDeferred = createDeferred<{ answer: string; conversation_id: string }>()
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    const sendChatflowMock = aiService.sendChatflow as jest.MockedFunction<
      typeof aiService.sendChatflow
    >

    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)
    uploadFileMock.mockImplementation(() => uploadDeferred.promise)
    sendChatflowMock.mockImplementation(() => sendDeferred.promise as any)

    const { result } = createHook()
    const file = new File(['project scoped attachment'], '项目资料.pdf', {
      type: 'application/pdf',
    })

    act(() => {
      result.current.setChatAssociatedProject({ id: 101, name: '发送时项目' } as Project)
      result.current.addChatAttachments(createFileList([file]), 'file')
      result.current.changeChatInput('请按当前项目分析附件')
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(101)
      expect(result.current.chatAttachments).toHaveLength(1)
    })

    act(() => {
      result.current.sendChat()
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(true)
      expect(uploadFileMock).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.setChatAssociatedProject({ id: 202, name: '上传中切换的项目' } as Project)
    })

    await waitFor(() => {
      expect(result.current.chatSession.associatedProjectId).toBe(202)
    })

    await act(async () => {
      uploadDeferred.resolve('https://example.com/project-file.pdf')
      await uploadDeferred.promise
    })

    await waitFor(() => {
      expect(sendChatflowMock).toHaveBeenCalledTimes(1)
    })

    expect(sendChatflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '请按当前项目分析附件',
        folder_id: 101,
        files: [
          {
            type: 'document',
            transfer_method: 'remote_url',
            url: 'https://example.com/project-file.pdf',
          },
        ],
      }),
    )

    await act(async () => {
      sendDeferred.resolve({
        answer: '分析完成',
        conversation_id: 'conv_project_snapshot',
      })
      await sendDeferred.promise
    })

    await waitFor(() => {
      expect(result.current.chatLoading).toBe(false)
    })
  })
})
