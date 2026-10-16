import { act, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

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
  createFileList,
  createHook,
} from './__tests__/useChatManagement.test-utils'

afterEach(() => {
  jest.clearAllMocks()
})

function createTextFiles(start: number, count: number): File[] {
  return Array.from(
    { length: count },
    (_, index) =>
      new File(['attachment'], `attachment-${start + index}.txt`, { type: 'text/plain' }),
  )
}

describe('useChatManagement attachments', () => {
  test('keeps total attachments within the upload count limit when adding files repeatedly', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    getChatflowPromptsMock.mockResolvedValue(EMPTY_CHATFLOW_PROMPTS)

    const { result, notify } = createHook()

    act(() => {
      result.current.addChatAttachments(createFileList(createTextFiles(1, 4)), 'file')
    })

    await waitFor(() => {
      expect(result.current.chatAttachments).toHaveLength(4)
    })

    act(() => {
      result.current.addChatAttachments(createFileList(createTextFiles(5, 3)), 'file')
    })

    await waitFor(() => {
      expect(result.current.chatAttachments).toHaveLength(5)
    })
    expect(result.current.chatAttachments.map((attachment) => attachment.name)).toEqual([
      'attachment-1.txt',
      'attachment-2.txt',
      'attachment-3.txt',
      'attachment-4.txt',
      'attachment-5.txt',
    ])
    expect(notify).toHaveBeenCalledWith('最多上传5个文件，已保留前5个')
  })
})
