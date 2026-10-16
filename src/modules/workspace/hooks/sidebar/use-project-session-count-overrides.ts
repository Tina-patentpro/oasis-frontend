import { type Dispatch, type SetStateAction, useEffect } from 'react'

import type { Project } from '@/types/api'

type ProjectSessionCountOverrides = Record<number, number>

interface ProjectSessionCountResult {
  count: unknown
  projectId: number
}

interface ProjectSessionCountOverridesParams {
  associateProjectDialogOpen: boolean
  getProjectSessionCount: (projectId: number) => Promise<unknown>
  projectList: Project[]
  projectSessionCountOverrides: ProjectSessionCountOverrides
  setProjectSessionCountOverrides: Dispatch<SetStateAction<ProjectSessionCountOverrides>>
  warn?: (message: string, error: unknown) => void
}

export function findProjectsMissingSessionCounts(
  projectList: Project[],
  projectSessionCountOverrides: ProjectSessionCountOverrides,
): Project[] {
  return projectList.filter(
    (project) =>
      typeof project.sessionCount !== 'number' && projectSessionCountOverrides[project.id] == null,
  )
}

export function mergeProjectSessionCountOverrides(
  previous: ProjectSessionCountOverrides,
  results: ProjectSessionCountResult[],
): ProjectSessionCountOverrides {
  const next = { ...previous }
  let changed = false

  results.forEach(({ projectId, count }) => {
    if (typeof count !== 'number' || !Number.isFinite(count) || next[projectId] === count) {
      return
    }
    next[projectId] = count
    changed = true
  })

  return changed ? next : previous
}

export function useProjectSessionCountOverrides({
  associateProjectDialogOpen,
  getProjectSessionCount,
  projectList,
  projectSessionCountOverrides,
  setProjectSessionCountOverrides,
  warn = console.warn,
}: ProjectSessionCountOverridesParams): void {
  useEffect(() => {
    if (!associateProjectDialogOpen) {
      return
    }

    const pendingProjects = findProjectsMissingSessionCounts(
      projectList,
      projectSessionCountOverrides,
    )
    if (pendingProjects.length === 0) {
      return
    }

    let cancelled = false
    Promise.allSettled(
      pendingProjects.map(async (project) => ({
        projectId: project.id,
        count: await getProjectSessionCount(project.id),
      })),
    )
      .then((settledResults) => {
        if (cancelled) {
          return
        }
        const results = settledResults
          .filter(
            (result): result is PromiseFulfilledResult<ProjectSessionCountResult> =>
              result.status === 'fulfilled',
          )
          .map((result) => result.value)
        setProjectSessionCountOverrides((prev) => mergeProjectSessionCountOverrides(prev, results))
        const rejectedResults = settledResults.filter(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        )
        if (rejectedResults.length > 0) {
          warn(
            '[useWorkspaceSidebar] 按需加载部分项目会话数失败:',
            rejectedResults.map((result) => result.reason),
          )
        }
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        warn('[useWorkspaceSidebar] 按需加载项目会话数失败:', error)
      })

    return () => {
      cancelled = true
    }
  }, [
    associateProjectDialogOpen,
    getProjectSessionCount,
    projectList,
    projectSessionCountOverrides,
    setProjectSessionCountOverrides,
    warn,
  ])
}
