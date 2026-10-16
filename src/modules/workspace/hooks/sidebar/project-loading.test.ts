import { describe, expect, test } from '@jest/globals'

import type { Project } from '@/types/api'

import {
  buildChildProjectErrorState,
  buildChildProjectLoadedState,
  buildChildProjectLoadingState,
  buildChildProjectPaginationByParent,
  buildProjectListPagination,
  mergeProjectsById,
} from './project-loading'

function createProject(id: number, overrides: Partial<Project> = {}): Project {
  return {
    id,
    userId: 1,
    name: `项目 ${id}`,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('workspace sidebar project loading helpers', () => {
  test('merges projects by id and lets newer items refresh existing project data', () => {
    expect(
      mergeProjectsById(
        [createProject(1), createProject(2, { name: '旧项目名' })],
        [createProject(2, { name: '新项目名' }), createProject(3)],
      ),
    ).toEqual([createProject(1), createProject(2, { name: '新项目名' }), createProject(3)])
  })

  test('builds child project loading state without losing previous pagination', () => {
    const previous = {
      page: 2,
      total: 30,
      totalPages: 3,
      initialized: true,
      isLoading: false,
    }

    expect(buildChildProjectLoadingState(previous)).toEqual({
      ...previous,
      isLoading: true,
    })
    expect(buildChildProjectLoadingState(undefined)).toEqual({
      page: 0,
      total: 0,
      totalPages: 0,
      initialized: false,
      isLoading: true,
    })
  })

  test('builds child project loaded and error states', () => {
    const previous = {
      page: 2,
      total: 30,
      totalPages: 3,
      initialized: true,
      isLoading: true,
    }
    const pagination = {
      page: 3,
      pageSize: 15,
      total: 31,
      totalPages: 4,
    }

    expect(buildChildProjectLoadedState(pagination)).toEqual({
      page: 3,
      total: 31,
      totalPages: 4,
      initialized: true,
      isLoading: false,
    })
    expect(buildChildProjectErrorState(previous)).toEqual({
      page: 2,
      total: 30,
      totalPages: 3,
      initialized: true,
      isLoading: false,
    })
  })

  test('builds child project pagination view for every visible parent project', () => {
    expect(
      buildChildProjectPaginationByParent({
        projectList: [createProject(10), createProject(20)],
        childProjectsByParent: {
          10: [createProject(11), createProject(12)],
        },
        childProjectPageState: {
          10: {
            page: 1,
            total: 5,
            totalPages: 3,
            initialized: true,
            isLoading: false,
          },
          20: {
            page: 2,
            total: 2,
            totalPages: 2,
            initialized: true,
            isLoading: true,
          },
        },
      }),
    ).toEqual({
      10: {
        initialized: true,
        isLoading: false,
        hasMore: true,
        loadedCount: 2,
        total: 5,
      },
      20: {
        initialized: true,
        isLoading: true,
        hasMore: false,
        loadedCount: 0,
        total: 2,
      },
    })
  })

  test('builds root project list pagination view with loaded count as lower bound', () => {
    expect(
      buildProjectListPagination({
        filteredProjects: [createProject(1), createProject(2), createProject(3)],
        isProjectsLoading: false,
        pagination: {
          page: 1,
          pageSize: 15,
          total: 2,
          totalPages: 1,
        },
      }),
    ).toEqual({
      initialized: true,
      isLoading: false,
      hasMore: false,
      loadedCount: 3,
      total: 3,
    })
  })
})
