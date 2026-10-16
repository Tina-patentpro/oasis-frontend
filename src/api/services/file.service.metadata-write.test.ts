import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    patch: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { fileService } from './file.service'

const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>

describe('fileService current metadata write endpoint', () => {
  beforeEach(() => {
    mockPatch.mockReset()
  })

  test('updateFileMetadata calls current file metadata update endpoint', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { id: 'file-1' } })

    const payload = {
      description: '交底书附件',
      tags: ['disclosure'],
      permissions: {
        canRead: ['role:member'],
        canWrite: ['user:owner-1'],
        isPublic: false,
      },
    }

    await fileService.updateFileMetadata('file-1', payload)

    expect(mockPatch).toHaveBeenCalledWith('/api/files/file-1/metadata', payload, undefined, {
      signal: undefined,
    })
  })
})
