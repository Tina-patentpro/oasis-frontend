import { beforeEach, describe, expect, it, jest } from '@jest/globals'

import { ApiError } from '../errors'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { projectService } from './project.service'

const mockApiGet = apiClient.get as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
  mockResolvedValueOnce: (value: unknown) => void
  mockRejectedValueOnce: (value: unknown) => void
  mock: { calls: unknown[][] }
}

describe('projectService.getProjects', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  it('normalizes list params and maps paginated folder fields', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        total: '5',
        items: [
          {
            id: '11',
            name: '根项目A',
            parent_id: '0',
            coustomer_name: '客户A',
            archive: 0,
            child_count: '3',
            has_children: '0',
            project_count: '9',
            created_at: '2026-02-12T00:00:00.000Z',
            updated_at: '2026-02-13T00:00:00.000Z',
          },
        ],
      },
    })

    const response = await projectService.getProjects({
      page: 0,
      pageSize: 999,
      parentId: -7,
      search: '  客户A  ',
      status: 'active',
    })

    expect(mockApiGet).toHaveBeenCalledTimes(1)
    expect(mockApiGet).toHaveBeenCalledWith('/user/user/folderlist', {
      page: 1,
      limit: 100,
      parent_id: 0,
      keyword: '客户A',
      archive: 0,
    })

    expect(response.pagination).toEqual({
      page: 1,
      pageSize: 100,
      total: 5,
      totalPages: 1,
    })
    expect(response.items).toHaveLength(1)
    expect(response.items[0]).toMatchObject({
      id: 11,
      name: '根项目A',
      parentId: 0,
      customerName: '客户A',
      status: 'active',
      childCount: 3,
      hasChildren: false,
      sessionCount: 9,
    })
  })

  it('keeps backward compatibility for legacy array payloads', async () => {
    mockApiGet.mockResolvedValue([
      { id: 5, name: '项目-5', parent_id: 0, archive: 0, coustomer_name: 'A' },
      { id: 4, name: '项目-4', parent_id: 0, archive: 0, coustomer_name: 'B' },
      { id: 3, name: '项目-3', parent_id: 9, archive: 0, coustomer_name: 'C' },
      { id: 2, name: '项目-2', parent_id: 0, archive: 1, coustomer_name: 'D' },
    ])

    const response = await projectService.getProjects({
      status: 'active',
      parentId: 0,
      page: 2,
      pageSize: 1,
      sortBy: 'id',
      sortOrder: 'desc',
    })

    expect(mockApiGet).toHaveBeenCalledWith('/user/user/folderlist', {
      page: 2,
      limit: 1,
      parent_id: 0,
      archive: 0,
    })
    expect(response.pagination).toEqual({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    })
    expect(response.items).toHaveLength(1)
    expect(response.items[0].id).toBe(4)
  })

  it('trims empty keyword and keeps explicit parent id', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        total: 2,
        items: [],
      },
    })

    await projectService.getProjects({
      parentId: 123,
      search: '   ',
    })

    expect(mockApiGet).toHaveBeenCalledWith('/user/user/folderlist', {
      page: 1,
      limit: 15,
      parent_id: 123,
    })
  })

  it('falls back to secondary list endpoint when primary returns 404', async () => {
    mockApiGet.mockRejectedValueOnce(new ApiError('not found', 'NOT_FOUND', 404))
    mockApiGet.mockResolvedValueOnce({
      data: { total: 0, items: [] },
    })

    const response = await projectService.getProjects()

    expect(mockApiGet).toHaveBeenCalledTimes(2)
    expect(mockApiGet.mock.calls[0]?.[0]).toBe('/user/user/folderlist')
    expect(mockApiGet.mock.calls[1]?.[0]).toBe('/user/folderlist')
    expect(response.items).toEqual([])
  })
})
