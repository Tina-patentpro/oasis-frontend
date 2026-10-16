import { useCallback, useMemo, type MutableRefObject } from 'react'

import type { Project } from '@/types/api'

import { applyProjectOrder, reconcileProjectOrder } from './filtering'
import {
  buildProjectReorderUpdate,
  isProjectReorderEnabled,
  type ProjectOrderState,
  type ProjectOrderStatus,
} from './project-reorder-control'
import { useProjectOrderLifecycle } from './use-project-order-lifecycle'

interface UseWorkspaceProjectOrderingParams {
  anonymousOrderChangedInSessionRef: MutableRefObject<boolean>
  anonymousProjectOrderKey: string
  clearProjectOrderForUser: (userKey: string) => void
  currentUserProjectOrderKey: string
  isProjectsLoading: boolean
  previousProjectOrderKeyRef: MutableRefObject<string>
  projectOrderByUser: Record<string, ProjectOrderState>
  projectPaginationTotal: number
  projectPaginationTotalPages: number
  projectSearchKeyword: string
  projectSessionCountOverrides: Record<number, number>
  projectStatusFilter: ProjectOrderStatus
  rootProjects: Project[]
  setProjectOrderForUser: (userKey: string, order: ProjectOrderState) => void
}

export function useWorkspaceProjectOrdering({
  anonymousOrderChangedInSessionRef,
  anonymousProjectOrderKey,
  clearProjectOrderForUser,
  currentUserProjectOrderKey,
  isProjectsLoading,
  previousProjectOrderKeyRef,
  projectOrderByUser,
  projectPaginationTotal,
  projectPaginationTotalPages,
  projectSearchKeyword,
  projectSessionCountOverrides,
  projectStatusFilter,
  rootProjects,
  setProjectOrderForUser,
}: UseWorkspaceProjectOrderingParams) {
  const rawProjectList = useMemo(
    () =>
      rootProjects.map((project) => {
        const overrideCount = projectSessionCountOverrides[project.id]
        if (typeof overrideCount !== 'number') {
          return project
        }
        return {
          ...project,
          sessionCount: overrideCount,
        }
      }),
    [projectSessionCountOverrides, rootProjects],
  )
  const storedProjectOrder = useMemo(() => {
    return projectOrderByUser[currentUserProjectOrderKey] ?? null
  }, [currentUserProjectOrderKey, projectOrderByUser])
  const reconciledProjectOrder = useMemo(
    () => reconcileProjectOrder(rawProjectList, storedProjectOrder),
    [rawProjectList, storedProjectOrder],
  )
  const projectList = useMemo(
    () => applyProjectOrder(rawProjectList, reconciledProjectOrder),
    [rawProjectList, reconciledProjectOrder],
  )

  useProjectOrderLifecycle({
    anonymousOrderChangedInSessionRef,
    anonymousProjectOrderKey,
    clearProjectOrderForUser,
    currentUserProjectOrderKey,
    previousProjectOrderKeyRef,
    projectOrderByUser,
    projectTotal: projectPaginationTotal,
    projectTotalPages: projectPaginationTotalPages,
    rawProjectCount: rawProjectList.length,
    reconciledProjectOrder,
    setProjectOrderForUser,
    storedProjectOrder,
  })

  const projectReorderEnabled = isProjectReorderEnabled({
    isProjectsLoading,
    projectListLength: projectList.length,
    projectPaginationTotal,
    projectSearchKeyword,
    projectStatusFilter,
  })
  const handleProjectReorder = useCallback(
    (sourceProjectId: number, targetProjectId: number, position: 'before' | 'after' = 'before') => {
      const update = buildProjectReorderUpdate({
        anonymousProjectOrderKey,
        currentUserProjectOrderKey,
        placement: position,
        projectReorderEnabled,
        projectStatusFilter,
        reconciledProjectOrder,
        sourceProjectId,
        targetProjectId,
      })
      if (!update) {
        return
      }

      setProjectOrderForUser(currentUserProjectOrderKey, update.nextOrder)
      if (update.shouldMarkAnonymousOrderChanged) {
        anonymousOrderChangedInSessionRef.current = true
      }
    },
    [
      anonymousOrderChangedInSessionRef,
      anonymousProjectOrderKey,
      currentUserProjectOrderKey,
      projectReorderEnabled,
      projectStatusFilter,
      reconciledProjectOrder,
      setProjectOrderForUser,
    ],
  )

  return {
    projectList,
    projectReorderEnabled,
    rawProjectList,
    handleProjectReorder,
  }
}
