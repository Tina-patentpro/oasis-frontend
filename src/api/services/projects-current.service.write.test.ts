import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    delete: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { projectsCurrentService } from './projects-current.service'

const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('projectsCurrentService current create and update endpoints', () => {
  beforeEach(() => {
    mockDelete.mockReset()
    mockPatch.mockReset()
    mockPost.mockReset()
  })

  test('createProject calls current project creation endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'project-1' } })

    const payload = {
      name: '专利撰写项目',
      description: '用于专利撰写全流程',
      tags: ['patent'],
      visibility: 'team' as const,
      owner: 'owner-1',
      customFields: { domain: '机械' },
    }

    await projectsCurrentService.createProject(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/projects', payload, undefined, {
      signal: undefined,
    })
  })

  test('updateProject calls current project update endpoint', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { id: 'project-1' } })

    const payload = {
      name: '更新后的项目',
      tags: ['patent', 'draft'],
      visibility: 'private' as const,
      customFields: { stage: 'review' },
    }

    await projectsCurrentService.updateProject('project-1', payload)

    expect(mockPatch).toHaveBeenCalledWith('/api/projects/project-1', payload, undefined, {
      signal: undefined,
    })
  })

  test('deleteProject calls current default soft delete endpoint', async () => {
    mockDelete.mockResolvedValue(undefined)

    await projectsCurrentService.deleteProject('project-1')

    expect(mockDelete).toHaveBeenCalledWith('/api/projects/project-1', undefined, {
      signal: undefined,
    })
  })
})
