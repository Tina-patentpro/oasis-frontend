import { describe, expect, it } from '@jest/globals'

import type { Project } from '@/types/api'

import {
  applyProjectFilters,
  applyProjectSort,
  pickCreatedProjectCandidate,
} from './project-service-selectors'

function project(overrides: Partial<Project>): Project {
  const id = overrides.id ?? 1
  return {
    id,
    userId: 0,
    ownerId: 0,
    name: `项目-${id}`,
    parentId: 0,
    childCount: 0,
    hasChildren: false,
    customerName: '',
    description: '',
    status: 'active',
    sessionCount: 0,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('pickCreatedProjectCandidate', () => {
  it('prefers an explicit created project id', () => {
    const olderById = project({
      id: 12,
      name: '旧项目',
      customerName: '旧客户',
      updatedAt: '2026-02-01T00:00:00.000Z',
    })
    const newerExact = project({
      id: 13,
      name: '新项目',
      customerName: '新客户',
      updatedAt: '2026-02-03T00:00:00.000Z',
    })

    expect(pickCreatedProjectCandidate([newerExact, olderById], '新项目', '新客户', 12)).toBe(
      olderById,
    )
  })

  it('chooses the newest exact name and customer match', () => {
    const oldMatch = project({
      id: 1,
      name: '新项目',
      customerName: '客户A',
      updatedAt: '2026-02-01T00:00:00.000Z',
    })
    const newMatch = project({
      id: 2,
      name: '新项目',
      customerName: '客户A',
      updatedAt: '2026-02-03T00:00:00.000Z',
    })

    expect(pickCreatedProjectCandidate([oldMatch, newMatch], '新项目', '客户A')).toBe(newMatch)
  })

  it('falls back from exact match to name match before fuzzy match', () => {
    const nameMatch = project({
      id: 3,
      name: '新项目',
      customerName: '其他客户',
      updatedAt: '2026-02-01T00:00:00.000Z',
    })
    const fuzzyMatch = project({
      id: 4,
      name: '包含新项目的长标题',
      customerName: '客户A',
      updatedAt: '2026-02-03T00:00:00.000Z',
    })

    expect(pickCreatedProjectCandidate([fuzzyMatch, nameMatch], '新项目', '客户A')).toBe(nameMatch)
  })

  it('returns null when no id, exact, name or fuzzy match exists', () => {
    expect(
      pickCreatedProjectCandidate([project({ id: 5, name: '无关项目' })], '新项目', '客户A'),
    ).toBeNull()
  })

  it('does not fuzzy match every project when expected customer is empty', () => {
    expect(
      pickCreatedProjectCandidate(
        [project({ id: 6, name: '无关项目', customerName: '' })],
        '新项目',
        '',
      ),
    ).toBeNull()
  })

  it('does not fuzzy match every project when expected name is empty', () => {
    expect(
      pickCreatedProjectCandidate(
        [project({ id: 7, name: '无关项目', customerName: '客户A' })],
        '',
        '',
      ),
    ).toBeNull()
  })
})

describe('applyProjectFilters', () => {
  it('filters by status, normalized parent id and search keyword', () => {
    const projects = [
      project({ id: 1, name: 'Alpha', customerName: '客户A', parentId: 0, status: 'active' }),
      project({ id: 2, name: 'Beta', customerName: '客户A', parentId: 9, status: 'active' }),
      project({ id: 3, name: 'Alpha', customerName: '客户B', parentId: 0, status: 'archived' }),
    ]

    expect(
      applyProjectFilters(projects, {
        status: 'active',
        parentId: -7,
        search: ' alpha ',
      }).map((item) => item.id),
    ).toEqual([1])
  })

  it('matches search against customer name', () => {
    const projects = [
      project({ id: 1, name: 'Alpha', customerName: '客户A' }),
      project({ id: 2, name: 'Beta', customerName: '客户B' }),
    ]

    expect(applyProjectFilters(projects, { search: '客户b' }).map((item) => item.id)).toEqual([2])
  })
})

describe('applyProjectSort', () => {
  it('keeps the original array reference when no sort field is requested', () => {
    const projects = [project({ id: 2 }), project({ id: 1 })]

    expect(applyProjectSort(projects, undefined, 'asc')).toBe(projects)
  })

  it('sorts string fields in the requested direction without mutating input', () => {
    const projects = [project({ id: 1, name: 'B' }), project({ id: 2, name: 'A' })]

    expect(applyProjectSort(projects, 'name', 'asc').map((item) => item.id)).toEqual([2, 1])
    expect(projects.map((item) => item.id)).toEqual([1, 2])
  })

  it('sorts numeric fields in descending order', () => {
    const projects = [project({ id: 1, sessionCount: 1 }), project({ id: 2, sessionCount: 5 })]

    expect(applyProjectSort(projects, 'sessionCount', 'desc').map((item) => item.id)).toEqual([
      2, 1,
    ])
  })
})
