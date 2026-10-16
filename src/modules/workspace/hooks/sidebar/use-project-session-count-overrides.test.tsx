import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { useState } from 'react'

import type { Project } from '@/types/api'

import { useProjectSessionCountOverrides } from './use-project-session-count-overrides'

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

function renderCountOverridesHook({
  dialogOpen,
  projectList,
  initialOverrides = {},
  getProjectSessionCount = jest.fn(async () => 0),
  warn = jest.fn(),
}: {
  dialogOpen: boolean
  projectList: Project[]
  initialOverrides?: Record<number, number>
  getProjectSessionCount?: (projectId: number) => Promise<unknown>
  warn?: (message: string, error: unknown) => void
}) {
  return renderHook(
    ({ open, projects }) => {
      const [overrides, setOverrides] = useState<Record<number, number>>(initialOverrides)
      useProjectSessionCountOverrides({
        associateProjectDialogOpen: open,
        getProjectSessionCount,
        projectList: projects,
        projectSessionCountOverrides: overrides,
        setProjectSessionCountOverrides: setOverrides,
        warn,
      })
      return overrides
    },
    {
      initialProps: {
        open: dialogOpen,
        projects: projectList,
      },
    },
  )
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('useProjectSessionCountOverrides', () => {
  test('does not load counts while the associate project dialog is closed', () => {
    const getProjectSessionCount = jest.fn(async () => 5)

    renderCountOverridesHook({
      dialogOpen: false,
      projectList: [createProject(1)],
      getProjectSessionCount,
    })

    expect(getProjectSessionCount).not.toHaveBeenCalled()
  })

  test('loads only projects missing both embedded and overridden session counts', async () => {
    const getProjectSessionCount = jest.fn(async (projectId: number) => projectId * 10)
    const { result } = renderCountOverridesHook({
      dialogOpen: true,
      initialOverrides: { 3: 30 },
      projectList: [createProject(1), createProject(2, { sessionCount: 8 }), createProject(3)],
      getProjectSessionCount,
    })

    await waitFor(() => {
      expect(result.current).toEqual({ 1: 10, 3: 30 })
    })

    expect(getProjectSessionCount).toHaveBeenCalledTimes(1)
    expect(getProjectSessionCount).toHaveBeenCalledWith(1)
  })

  test('ignores non-number count results and keeps existing overrides unchanged', async () => {
    const getProjectSessionCount = jest.fn(async (_projectId: number) => Number.NaN)
    const { result } = renderCountOverridesHook({
      dialogOpen: true,
      initialOverrides: { 2: 20 },
      projectList: [createProject(1)],
      getProjectSessionCount,
    })

    await waitFor(() => {
      expect(getProjectSessionCount).toHaveBeenCalledWith(1)
    })

    expect(result.current).toEqual({ 2: 20 })
  })

  test('keeps successful project counts when one count request fails', async () => {
    const warn = jest.fn()
    const getProjectSessionCount = jest.fn(async (projectId: number) => {
      if (projectId === 2) {
        throw new Error('count failed')
      }
      return projectId * 10
    })
    const { result } = renderCountOverridesHook({
      dialogOpen: true,
      projectList: [createProject(1), createProject(2), createProject(3)],
      getProjectSessionCount,
      warn,
    })

    await waitFor(() => {
      expect(result.current).toEqual({ 1: 10, 3: 30 })
    })

    expect(warn).toHaveBeenCalled()
  })

  test('does not update overrides after the hook is unmounted', async () => {
    let resolveCount: (value: number) => void = () => undefined
    const getProjectSessionCount = jest.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveCount = resolve
        }),
    )

    const { result, unmount } = renderCountOverridesHook({
      dialogOpen: true,
      projectList: [createProject(1)],
      getProjectSessionCount,
    })

    unmount()
    resolveCount(9)
    await Promise.resolve()

    expect(result.current).toEqual({})
  })
})
