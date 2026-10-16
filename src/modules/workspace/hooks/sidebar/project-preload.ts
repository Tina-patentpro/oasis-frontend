import type { WorkspaceLanePhase } from './lane-performance'
import type { ProjectSessionPageState } from './session-loading'

export interface BuildProjectPreloadPlanParams {
  activeProjectIds: number[]
  projectSessionPageState: Record<number, ProjectSessionPageState>
  attemptedProjectIds: Set<number>
}

export interface ProjectPreloadPlan {
  pendingProjectIds: number[]
  lanePhase: WorkspaceLanePhase
}

export function buildProjectPreloadPlan({
  activeProjectIds,
  projectSessionPageState,
  attemptedProjectIds,
}: BuildProjectPreloadPlanParams): ProjectPreloadPlan {
  const hasActiveLoading = activeProjectIds.some(
    (projectId) => projectSessionPageState[projectId]?.isLoading,
  )
  const pendingProjectIds = activeProjectIds.filter((projectId) => {
    const state = projectSessionPageState[projectId]
    return !state?.initialized && !state?.isLoading && !attemptedProjectIds.has(projectId)
  })

  if (pendingProjectIds.length > 0) {
    return {
      pendingProjectIds,
      lanePhase: 'start',
    }
  }

  return {
    pendingProjectIds,
    lanePhase: hasActiveLoading ? 'start' : 'ready',
  }
}
