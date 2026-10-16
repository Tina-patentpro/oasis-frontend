import { describe, expect, it } from '@jest/globals'

import {
  extractFolderListPayload,
  mapFolderToProject,
  resolveProjectIdFromCreateResponse,
  toProjectSortTime,
} from './project-service-normalizers'

describe('extractFolderListPayload', () => {
  it('keeps legacy array payloads as non-paginated lists', () => {
    const payload = [{ id: 1 }, { id: 2 }]

    expect(extractFolderListPayload(payload)).toEqual({
      items: payload,
      total: 2,
      serverPaginated: false,
    })
  })

  it('reads direct items with numeric total as a server-paginated list', () => {
    const items = [{ id: 1 }]

    expect(extractFolderListPayload({ items, total: '6' })).toEqual({
      items,
      total: 6,
      serverPaginated: true,
    })
  })

  it('treats an explicit empty direct items list as server-paginated', () => {
    expect(extractFolderListPayload({ items: [], total: 0 })).toEqual({
      items: [],
      total: 0,
      serverPaginated: true,
    })
  })

  it('reads nested data.items and falls back to item length when total is invalid', () => {
    const items = [{ id: 3 }, { id: 4 }]

    expect(extractFolderListPayload({ data: { items, total: -1 } })).toEqual({
      items,
      total: 2,
      serverPaginated: true,
    })
  })

  it('reads nested data arrays as non-paginated legacy payloads', () => {
    const data = [{ id: 9 }]

    expect(extractFolderListPayload({ data })).toEqual({
      items: data,
      total: 1,
      serverPaginated: false,
    })
  })

  it('returns an empty non-paginated payload for malformed responses', () => {
    expect(extractFolderListPayload(null)).toEqual({
      items: [],
      total: 0,
      serverPaginated: false,
    })
  })
})

describe('resolveProjectIdFromCreateResponse', () => {
  it('reads direct folder id aliases before nested data', () => {
    expect(resolveProjectIdFromCreateResponse({ folder_id: '12', data: { id: 99 } })).toBe(12)
    expect(resolveProjectIdFromCreateResponse({ project_id: 13 })).toBe(13)
  })

  it('reads nested data id aliases when direct id is invalid', () => {
    expect(resolveProjectIdFromCreateResponse({ id: 0, data: { project_id: '23' } })).toBe(23)
  })

  it('rejects malformed create responses', () => {
    expect(resolveProjectIdFromCreateResponse(null)).toBeUndefined()
    expect(
      resolveProjectIdFromCreateResponse({ id: -1, data: { folder_id: '  ' } }),
    ).toBeUndefined()
  })
})

describe('mapFolderToProject', () => {
  it('maps backend folder fields into the frontend project shape', () => {
    expect(
      mapFolderToProject({
        id: '11',
        name: '  根项目A  ',
        parent_id: '0',
        coustomer_name: ' 客户A ',
        archive: 1,
        child_count: '3',
        has_children: '0',
        project_count: '9',
        session_count: '4',
        created_at: '2026-02-12T00:00:00.000Z',
        updated_at: '2026-02-13T00:00:00.000Z',
        owner_id: '6',
      }),
    ).toMatchObject({
      id: 11,
      ownerId: 6,
      name: '根项目A',
      parentId: 0,
      childCount: 3,
      hasChildren: false,
      customerName: '客户A',
      status: 'archived',
      sessionCount: 9,
      createdAt: '2026-02-12T00:00:00.000Z',
      updatedAt: '2026-02-13T00:00:00.000Z',
    })
  })

  it('uses fallback id and safe defaults for sparse folder records', () => {
    expect(mapFolderToProject({ name: '' }, 21)).toMatchObject({
      id: 21,
      ownerId: 0,
      name: '项目-21',
      parentId: 0,
      hasChildren: false,
      customerName: '',
      status: 'active',
    })
  })

  it('rejects invalid folder records', () => {
    expect(mapFolderToProject(null)).toBeNull()
    expect(mapFolderToProject({ id: 0 })).toBeNull()
  })
})

describe('toProjectSortTime', () => {
  it('prefers updatedAt and falls back to createdAt', () => {
    expect(
      toProjectSortTime({
        updatedAt: '2026-02-13T00:00:00.000Z',
        createdAt: '2026-02-12T00:00:00.000Z',
      }),
    ).toBe(Date.parse('2026-02-13T00:00:00.000Z'))

    expect(
      toProjectSortTime({
        updatedAt: 'invalid',
        createdAt: '2026-02-12T00:00:00.000Z',
      }),
    ).toBe(Date.parse('2026-02-12T00:00:00.000Z'))
  })

  it('returns zero when both timestamps are invalid', () => {
    expect(toProjectSortTime({ updatedAt: '', createdAt: '' })).toBe(0)
  })
})
