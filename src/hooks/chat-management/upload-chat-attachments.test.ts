import { describe, expect, it, jest, afterEach } from '@jest/globals'

jest.mock('@/api/services', () => ({
  aiService: {
    uploadFile: jest.fn(),
  },
}))

import { aiService } from '@/api/services'

import type { Attachment } from '../../types'

import { uploadChatAttachments } from './upload-chat-attachments'

afterEach(() => {
  jest.clearAllMocks()
})

function createAttachment(file: File): Attachment {
  return {
    id: 'attachment-1',
    type: 'file',
    name: file.name,
    size: file.size,
    file,
  }
}

describe('uploadChatAttachments', () => {
  it('maps text document attachments to the documented document file type', async () => {
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    uploadFileMock.mockResolvedValue('https://lzhxpy.oasisintwrite.com/uploads/probe.txt')

    const result = await uploadChatAttachments(
      [createAttachment(new File(['probe'], 'probe.txt', { type: 'text/plain' }))],
      new AbortController().signal,
    )

    expect(result).toEqual({
      status: 'success',
      files: [
        {
          type: 'document',
          transfer_method: 'remote_url',
          url: 'https://lzhxpy.oasisintwrite.com/uploads/probe.txt',
        },
      ],
    })
  })

  it.each([
    ['image', new File(['probe'], 'probe.png', { type: 'image/png' }), 'image'],
    ['audio', new File(['probe'], 'probe.mp3', { type: 'audio/mpeg' }), 'audio'],
    ['video', new File(['probe'], 'probe.mp4', { type: 'video/mp4' }), 'video'],
  ] as const)('maps %s attachments to the matching chatflow file type', async (_, file, type) => {
    const uploadFileMock = aiService.uploadFile as jest.MockedFunction<typeof aiService.uploadFile>
    uploadFileMock.mockResolvedValue(`https://lzhxpy.oasisintwrite.com/uploads/${file.name}`)

    const result = await uploadChatAttachments(
      [createAttachment(file)],
      new AbortController().signal,
    )

    expect(result).toEqual({
      status: 'success',
      files: [
        {
          type,
          transfer_method: 'remote_url',
          url: `https://lzhxpy.oasisintwrite.com/uploads/${file.name}`,
        },
      ],
    })
  })
})
