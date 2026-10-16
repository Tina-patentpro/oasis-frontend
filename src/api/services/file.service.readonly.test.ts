import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    uploadFile: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { fileService } from './file.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('fileService read-only files contract endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('getFiles calls current files list endpoint with filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          hasMore: false,
        },
      },
    })

    await fileService.getFiles({
      page: 1,
      pageSize: 20,
      type: 'document',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/files',
      {
        page: 1,
        pageSize: 20,
        type: 'document',
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getFile calls current file detail endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'file-1' } })

    await fileService.getFile('file-1')

    expect(mockGet).toHaveBeenCalledWith('/api/files/file-1', undefined, undefined, {
      signal: undefined,
    })
  })

  test('getFileMetadata calls current metadata endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'file-1', metadata: {} } })

    await fileService.getFileMetadata('file-1')

    expect(mockGet).toHaveBeenCalledWith('/api/files/file-1/metadata', undefined, undefined, {
      signal: undefined,
    })
  })

  test('getFilePreview calls current preview endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { previewUrl: 'https://example.com/p' } })

    await fileService.getFilePreview('file-1')

    expect(mockGet).toHaveBeenCalledWith('/api/files/file-1/preview', undefined, undefined, {
      signal: undefined,
    })
  })

  test('listShareLinks calls current share links endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await fileService.listShareLinks('file-1')

    expect(mockGet).toHaveBeenCalledWith('/api/files/file-1/share', undefined, undefined, {
      signal: undefined,
    })
  })
})
