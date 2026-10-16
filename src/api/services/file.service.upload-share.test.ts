import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    delete: jest.fn(),
    post: jest.fn(),
    uploadFile: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { fileService } from './file.service'

const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>
const mockUploadFile = apiClient.uploadFile as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
  mock: { calls: unknown[][] }
}

describe('fileService current upload and share endpoints', () => {
  beforeEach(() => {
    mockDelete.mockReset()
    mockPost.mockReset()
    mockUploadFile.mockReset()
  })

  test('uploadCurrentFile calls current single file upload endpoint', async () => {
    mockUploadFile.mockResolvedValue({ success: true, data: { fileId: 'file-1' } })

    const file = new File(['hello'], 'disclosure.pdf', { type: 'application/pdf' })

    await fileService.uploadCurrentFile(file, {
      filename: '交底书.pdf',
      projectId: 'project-1',
      description: '专利交底书',
      isPublic: false,
    })

    expect(mockUploadFile).toHaveBeenCalledTimes(1)

    const [endpoint, formData] = mockUploadFile.mock.calls[0] as [string, FormData]
    expect(endpoint).toBe('/api/files')
    expect(formData.get('file')).toBe(file)
    expect(formData.get('filename')).toBe('交底书.pdf')
    expect(formData.get('projectId')).toBe('project-1')
    expect(formData.get('description')).toBe('专利交底书')
    expect(formData.get('isPublic')).toBe('false')
  })

  test('uploadFilesBatch calls current batch upload endpoint', async () => {
    mockUploadFile.mockResolvedValue({ success: true, data: { results: [] } })

    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ]

    await fileService.uploadFilesBatch(files, {
      projectId: 'project-1',
      description: '批量附件',
    })

    expect(mockUploadFile).toHaveBeenCalledTimes(1)

    const [endpoint, formData] = mockUploadFile.mock.calls[0] as [string, FormData]
    expect(endpoint).toBe('/api/files/batch')
    expect(formData.getAll('files')).toEqual(files)
    expect(formData.get('projectId')).toBe('project-1')
    expect(formData.get('description')).toBe('批量附件')
  })

  test('createShareLink calls current share link creation endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'share-1' } })

    const payload = {
      expiresIn: 3600,
      password: 'secret',
      downloadLimit: 3,
      allowPreview: true,
    }

    await fileService.createShareLink('file-1', payload)

    expect(mockPost).toHaveBeenCalledWith('/api/files/file-1/share', payload, undefined, {
      signal: undefined,
    })
  })

  test('revokeShareLink calls current share link revoke endpoint', async () => {
    mockDelete.mockResolvedValue(undefined)

    await fileService.revokeShareLink('file-1', 'share-1')

    expect(mockDelete).toHaveBeenCalledWith('/api/files/file-1/share/share-1', undefined, {
      signal: undefined,
    })
  })
})
