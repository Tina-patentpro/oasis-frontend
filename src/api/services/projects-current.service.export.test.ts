import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { projectsCurrentService } from './projects-current.service'

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('projectsCurrentService current project export endpoint', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  test('exportProject calls current project export endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { taskId: 'project-export-1' } })

    const payload = {
      format: 'zip' as const,
      includePrivateNotes: false,
    }

    await projectsCurrentService.exportProject('project-1', payload)

    expect(mockPost).toHaveBeenCalledWith('/api/projects/project-1/export', payload, undefined, {
      signal: undefined,
    })
  })
})
