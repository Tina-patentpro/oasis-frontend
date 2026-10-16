import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test } from '@jest/globals'

import type { Project } from '@/types/api'

import { useActiveProjectCache, useRootProjectLifecycle } from './project-list-lifecycle'

type ActiveProjectCacheParams = Parameters<typeof useActiveProjectCache>[0]

function createProject(id: number, status: Project['status'] = 'active'): Project {
  return {
    id,
    userId: 1,
    name: `Project ${id}`,
    status,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('workspace sidebar project list lifecycle', () => {
  test('replaces root projects on first page and merges additional pages by id', async () => {
    const first = createProject(1)
    const second = createProject(2)
    const updatedFirst = { ...first, name: 'Updated 1' }

    const { result, rerender } = renderHook((props) => useRootProjectLifecycle(props), {
      initialProps: {
        projectItems: [first],
        projectPage: 1,
        projectSearchKeyword: '',
        projectTotal: 1,
      },
    })

    await waitFor(() => {
      expect(result.current.rootProjects).toEqual([first])
    })

    rerender({
      projectItems: [updatedFirst, second],
      projectPage: 2,
      projectSearchKeyword: '',
      projectTotal: 2,
    })

    await waitFor(() => {
      expect(result.current.rootProjects).toEqual([updatedFirst, second])
    })
  })

  test('updates baseline project count only when project search is empty', async () => {
    const { result, rerender } = renderHook((props) => useRootProjectLifecycle(props), {
      initialProps: {
        projectItems: [],
        projectPage: 1,
        projectSearchKeyword: '',
        projectTotal: 10,
      },
    })

    await waitFor(() => {
      expect(result.current.projectsBaselineCount).toBe(10)
    })

    rerender({
      projectItems: [],
      projectPage: 1,
      projectSearchKeyword: '客户',
      projectTotal: 2,
    })

    expect(result.current.projectsBaselineCount).toBe(10)
  })

  test('keeps active project cache only when browsing active projects without search', async () => {
    const active = createProject(1, 'active')
    const archived = createProject(2, 'archived')

    const initialProps: ActiveProjectCacheParams = {
      projectList: [active],
      projectSearchKeyword: '',
      projectStatusFilter: 'active',
    }

    const { result, rerender } = renderHook((props) => useActiveProjectCache(props), {
      initialProps,
    })

    await waitFor(() => {
      expect(result.current).toEqual([active])
    })

    rerender({
      projectList: [archived],
      projectSearchKeyword: '',
      projectStatusFilter: 'archived' as const,
    })

    expect(result.current).toEqual([active])

    rerender({
      projectList: [createProject(3, 'active')],
      projectSearchKeyword: '客户',
      projectStatusFilter: 'active' as const,
    })

    expect(result.current).toEqual([active])
  })
})
