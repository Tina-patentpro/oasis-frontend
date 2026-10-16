import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { projectsCurrentService } from './projects-current.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('projectsCurrentService read-only projects contract endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('getProjects calls current projects list endpoint with filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await projectsCurrentService.getProjects({
      keyword: '机器人',
      status: 'active',
      owner: 'owner-1',
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/projects',
      {
        keyword: '机器人',
        status: 'active',
        owner: 'owner-1',
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getProjectDetail calls current project detail endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'project-1' } })

    await projectsCurrentService.getProjectDetail('project-1')

    expect(mockGet).toHaveBeenCalledWith('/api/projects/project-1', undefined, undefined, {
      signal: undefined,
    })
  })

  test('getProjectSummary calls current project summary endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { workflowExecutions: 3 } })

    await projectsCurrentService.getProjectSummary('project-1')

    expect(mockGet).toHaveBeenCalledWith('/api/projects/project-1/summary', undefined, undefined, {
      signal: undefined,
    })
  })

  test('listProjectWorkflows calls current project workflows endpoint with filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await projectsCurrentService.listProjectWorkflows('project-1', {
      status: 'completed',
      page: 1,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/projects/project-1/workflows',
      {
        status: 'completed',
        page: 1,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('listProjectConversations calls current project conversations endpoint with pagination', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await projectsCurrentService.listProjectConversations('project-1', {
      page: 1,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/projects/project-1/conversations',
      {
        page: 1,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('listProjectAttachments calls current project attachments endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await projectsCurrentService.listProjectAttachments('project-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/projects/project-1/attachments',
      undefined,
      undefined,
      { signal: undefined },
    )
  })
})
