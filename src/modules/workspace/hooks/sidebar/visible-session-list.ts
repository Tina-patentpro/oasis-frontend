import type { Project, Session } from '@/types/api'

import type { OptimisticSessionsByFolder } from './optimistic-session'
import { mergeOptimisticSessionsWithServerSessions } from './optimistic-session'

interface VisibleSessionListResult {
  independentSessions: Session[]
  projectSessionsByProject: Record<number, Session[]>
  visibleProjectIds: number[]
}

export function buildVisibleSessionList(params: {
  projects: Project[]
  independentSessions: Session[]
  projectSessionsByProject: Record<number, Session[]>
  optimisticSessionsByFolder: OptimisticSessionsByFolder
}): VisibleSessionListResult {
  const { projects, independentSessions, projectSessionsByProject, optimisticSessionsByFolder } =
    params

  const nextIndependentSessions = mergeOptimisticSessionsWithServerSessions(
    independentSessions,
    optimisticSessionsByFolder[0] ?? [],
  )

  const projectIds = new Set<number>([
    ...projects.map((project) => project.id),
    ...Object.keys(projectSessionsByProject).map((key) => Number(key)),
    ...Object.keys(optimisticSessionsByFolder)
      .map((key) => Number(key))
      .filter((folderId) => folderId > 0),
  ])

  const nextProjectSessionsByProject: Record<number, Session[]> = {}
  projectIds.forEach((projectId) => {
    nextProjectSessionsByProject[projectId] = mergeOptimisticSessionsWithServerSessions(
      projectSessionsByProject[projectId] ?? [],
      optimisticSessionsByFolder[projectId] ?? [],
    )
  })

  const visibleProjectIds = new Set<number>(projects.map((project) => project.id))
  Object.entries(optimisticSessionsByFolder).forEach(([folderKey, sessions]) => {
    const folderId = Number(folderKey)
    if (folderId > 0 && sessions.length > 0) {
      visibleProjectIds.add(folderId)
    }
  })

  return {
    independentSessions: nextIndependentSessions,
    projectSessionsByProject: nextProjectSessionsByProject,
    visibleProjectIds: Array.from(visibleProjectIds),
  }
}
