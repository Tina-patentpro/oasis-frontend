import type { Project, Session } from '@/types/api'

import type { ChildProjectPageState } from './project-loading'

function buildProjectIdSet(projectList: Project[]): Set<number> {
  return new Set(projectList.map((project) => project.id))
}

export function filterProjectSessionsByProjectList(params: {
  projectList: Project[]
  projectSessionsByProject: Record<number, Session[]>
}): Record<number, Session[]> {
  const validProjectIds = buildProjectIdSet(params.projectList)
  const next: Record<number, Session[]> = {}
  Object.entries(params.projectSessionsByProject).forEach(([projectId, sessions]) => {
    const id = Number(projectId)
    if (validProjectIds.has(id)) {
      next[id] = sessions.filter((session) => session.projectId === id)
    }
  })
  return next
}

export function pruneProjectSessionCountOverrides(
  overrides: Record<number, number>,
  projectList: Project[],
): Record<number, number> {
  const validProjectIds = buildProjectIdSet(projectList)
  let changed = false
  const next: Record<number, number> = {}
  Object.entries(overrides).forEach(([projectId, count]) => {
    const id = Number(projectId)
    if (!validProjectIds.has(id)) {
      changed = true
      return
    }
    next[id] = count
  })
  return changed ? next : overrides
}

export function pruneAttemptedProjectIds(
  attemptedIds: Set<number>,
  projectList: Project[],
): Set<number> {
  const validProjectIds = buildProjectIdSet(projectList)
  const next = new Set<number>()
  attemptedIds.forEach((projectId) => {
    if (validProjectIds.has(projectId)) {
      next.add(projectId)
    }
  })
  return next
}

export function pruneChildProjectsByParent(
  childProjectsByParent: Record<number, Project[]>,
  projectList: Project[],
): Record<number, Project[]> {
  const validProjectIds = buildProjectIdSet(projectList)
  let changed = false
  const next: Record<number, Project[]> = {}
  Object.entries(childProjectsByParent).forEach(([parentId, items]) => {
    const id = Number(parentId)
    if (!validProjectIds.has(id)) {
      changed = true
      return
    }
    next[id] = items
  })
  return changed ? next : childProjectsByParent
}

export function pruneChildProjectPageState(
  childProjectPageState: Record<number, ChildProjectPageState>,
  projectList: Project[],
): Record<number, ChildProjectPageState> {
  const validProjectIds = buildProjectIdSet(projectList)
  let changed = false
  const next: Record<number, ChildProjectPageState> = {}
  Object.entries(childProjectPageState).forEach(([parentId, state]) => {
    const id = Number(parentId)
    if (!validProjectIds.has(id)) {
      changed = true
      return
    }
    next[id] = state
  })
  return changed ? next : childProjectPageState
}
