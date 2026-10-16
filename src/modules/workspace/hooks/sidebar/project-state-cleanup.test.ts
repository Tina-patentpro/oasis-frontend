import { describe, expect, test } from '@jest/globals'

import type { Project, Session } from '@/types/api'

import type { ChildProjectPageState } from './project-loading'
import {
  filterProjectSessionsByProjectList,
  pruneAttemptedProjectIds,
  pruneChildProjectPageState,
  pruneChildProjectsByParent,
  pruneProjectSessionCountOverrides,
} from './project-state-cleanup'

function createProject(id: number): Project {
  return {
    id,
    userId: 1,
    name: `项目 ${id}`,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function createSession(id: number, projectId?: number): Session {
  return {
    id,
    userId: 1,
    title: `会话 ${id}`,
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    projectId,
  }
}

const loadedChildState: ChildProjectPageState = {
  page: 1,
  total: 2,
  totalPages: 1,
  isLoading: false,
  initialized: true,
}

describe('workspace sidebar project state cleanup helpers', () => {
  test('filters project sessions by visible project list and matching project id', () => {
    expect(
      filterProjectSessionsByProjectList({
        projectList: [createProject(10)],
        projectSessionsByProject: {
          10: [createSession(1, 10), createSession(2, 11), createSession(3)],
          20: [createSession(4, 20)],
        },
      }),
    ).toEqual({
      10: [createSession(1, 10)],
    })
  })

  test('prunes project session count overrides for removed projects and keeps reference when unchanged', () => {
    const previous = {
      10: 3,
      20: 4,
    }

    expect(pruneProjectSessionCountOverrides(previous, [createProject(10)])).toEqual({ 10: 3 })
    expect(
      pruneProjectSessionCountOverrides(previous, [createProject(10), createProject(20)]),
    ).toBe(previous)
  })

  test('prunes auto preload attempted ids for removed projects', () => {
    expect(
      pruneAttemptedProjectIds(new Set([10, 20, 30]), [createProject(10), createProject(30)]),
    ).toEqual(new Set([10, 30]))
  })

  test('prunes child projects and child page state for removed parent projects', () => {
    const childProjects = {
      10: [createProject(11)],
      20: [createProject(21)],
    }
    const pageState = {
      10: loadedChildState,
      20: { ...loadedChildState, page: 2 },
    }

    expect(pruneChildProjectsByParent(childProjects, [createProject(10)])).toEqual({
      10: [createProject(11)],
    })
    expect(pruneChildProjectPageState(pageState, [createProject(10)])).toEqual({
      10: loadedChildState,
    })
    expect(pruneChildProjectsByParent(childProjects, [createProject(10), createProject(20)])).toBe(
      childProjects,
    )
    expect(pruneChildProjectPageState(pageState, [createProject(10), createProject(20)])).toBe(
      pageState,
    )
  })
})
