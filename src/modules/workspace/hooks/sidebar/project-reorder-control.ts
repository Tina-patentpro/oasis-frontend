import { areProjectOrdersEqual, reorderProjectOrderByStatus } from './filtering'

export type ProjectOrderStatus = 'active' | 'archived'

export interface ProjectOrderState {
  active: number[]
  archived: number[]
}

interface ProjectReorderEnabledParams {
  isProjectsLoading: boolean
  projectListLength: number
  projectPaginationTotal: number
  projectSearchKeyword: string
  projectStatusFilter: ProjectOrderStatus
}

interface ProjectReorderUpdateParams {
  anonymousProjectOrderKey: string
  currentUserProjectOrderKey: string
  placement?: 'before' | 'after'
  projectReorderEnabled: boolean
  projectStatusFilter: ProjectOrderStatus
  reconciledProjectOrder: ProjectOrderState
  sourceProjectId: number
  targetProjectId: number
}

interface ProjectReorderUpdate {
  nextOrder: ProjectOrderState
  shouldMarkAnonymousOrderChanged: boolean
}

export function isProjectReorderEnabled({
  isProjectsLoading,
  projectListLength,
  projectPaginationTotal,
  projectSearchKeyword,
  projectStatusFilter,
}: ProjectReorderEnabledParams): boolean {
  return (
    !isProjectsLoading &&
    projectStatusFilter === 'active' &&
    projectSearchKeyword.length === 0 &&
    projectPaginationTotal <= projectListLength
  )
}

export function buildProjectReorderUpdate({
  anonymousProjectOrderKey,
  currentUserProjectOrderKey,
  placement = 'before',
  projectReorderEnabled,
  projectStatusFilter,
  reconciledProjectOrder,
  sourceProjectId,
  targetProjectId,
}: ProjectReorderUpdateParams): ProjectReorderUpdate | null {
  if (!projectReorderEnabled || sourceProjectId === targetProjectId) {
    return null
  }

  const nextOrder = reorderProjectOrderByStatus(
    reconciledProjectOrder,
    projectStatusFilter,
    sourceProjectId,
    targetProjectId,
    placement,
  )
  if (areProjectOrdersEqual(nextOrder, reconciledProjectOrder)) {
    return null
  }

  return {
    nextOrder,
    shouldMarkAnonymousOrderChanged: currentUserProjectOrderKey === anonymousProjectOrderKey,
  }
}
