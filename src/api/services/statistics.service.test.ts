import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

jest.mock('./project.service', () => ({
  projectService: {
    getProject: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { projectService } from './project.service'
import { statisticsService } from './statistics.service'

const mockGetProject = projectService.getProject as jest.MockedFunction<
  typeof projectService.getProject
>

describe('StatisticsService.getProjectDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('uses the verified folder project service instead of the legacy session detail endpoint', async () => {
    mockGetProject.mockResolvedValueOnce({
      id: 33,
      userId: 1,
      ownerId: 1,
      name: '项目详情',
      description: '项目说明',
      customerName: '客户名称',
      status: 'active',
      sessionCount: 2,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T09:00:00.000Z',
    })

    const detail = await statisticsService.getProjectDetail(33)

    expect(mockGetProject).toHaveBeenCalledWith(33)
    expect(apiClient.get).not.toHaveBeenCalled()
    expect(detail).toMatchObject({
      id: 33,
      name: '项目详情',
      sessionCount: 2,
      sessions: [],
      files: [],
      statistics: {
        totalSessions: 2,
        totalFiles: 0,
        totalCost: 0,
        lastActivityAt: '2026-09-01T09:00:00.000Z',
      },
    })
  })

  test('prefers the project activity timestamp while keeping unsupported aggregates neutral', async () => {
    mockGetProject.mockResolvedValueOnce({
      id: 34,
      userId: 1,
      ownerId: 1,
      name: '活动项目',
      description: '',
      customerName: '',
      status: 'active',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T09:00:00.000Z',
      lastActivityAt: '2026-09-01T10:00:00.000Z',
    })

    const detail = await statisticsService.getProjectDetail(34)

    expect(detail.sessions).toEqual([])
    expect(detail.files).toEqual([])
    expect(detail.statistics).toEqual({
      totalSessions: 0,
      totalFiles: 0,
      totalCost: 0,
      lastActivityAt: '2026-09-01T10:00:00.000Z',
    })
  })
})
