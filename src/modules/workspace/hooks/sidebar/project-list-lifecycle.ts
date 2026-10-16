import { useEffect, useReducer } from 'react'

import type { Project } from '@/types/api'

import { mergeProjectsById } from './project-loading'

type ProjectStatusFilter = 'active' | 'archived'

interface RootProjectLifecycleParams {
  projectItems: Project[]
  projectPage: number
  projectSearchKeyword: string
  projectTotal: number
}

interface RootProjectLifecycleState {
  projectsBaselineCount: number
  rootProjects: Project[]
}

type RootProjectLifecycleAction =
  | { type: 'sync-project-page'; page: number; projectItems: Project[] }
  | { type: 'sync-baseline-count'; projectSearchKeyword: string; projectTotal: number }

interface ActiveProjectCacheParams {
  projectList: Project[]
  projectSearchKeyword: string
  projectStatusFilter: ProjectStatusFilter
}

const INITIAL_ROOT_PROJECT_LIFECYCLE_STATE: RootProjectLifecycleState = {
  projectsBaselineCount: 0,
  rootProjects: [],
}

function rootProjectLifecycleReducer(
  state: RootProjectLifecycleState,
  action: RootProjectLifecycleAction,
): RootProjectLifecycleState {
  if (action.type === 'sync-project-page') {
    return {
      ...state,
      rootProjects:
        action.page <= 1
          ? action.projectItems
          : mergeProjectsById(state.rootProjects, action.projectItems),
    }
  }

  if (action.projectSearchKeyword.length > 0) {
    return state
  }

  if (state.projectsBaselineCount === action.projectTotal) {
    return state
  }

  return {
    ...state,
    projectsBaselineCount: action.projectTotal,
  }
}

function activeProjectCacheReducer(state: Project[], action: ActiveProjectCacheParams): Project[] {
  if (action.projectStatusFilter !== 'active' || action.projectSearchKeyword.length > 0) {
    return state
  }

  return action.projectList
}

export function useRootProjectLifecycle({
  projectItems,
  projectPage,
  projectSearchKeyword,
  projectTotal,
}: RootProjectLifecycleParams): RootProjectLifecycleState {
  const [state, dispatch] = useReducer(
    rootProjectLifecycleReducer,
    INITIAL_ROOT_PROJECT_LIFECYCLE_STATE,
  )

  useEffect(() => {
    dispatch({
      type: 'sync-project-page',
      page: projectPage,
      projectItems,
    })
  }, [projectItems, projectPage])

  useEffect(() => {
    dispatch({
      type: 'sync-baseline-count',
      projectSearchKeyword,
      projectTotal,
    })
  }, [projectSearchKeyword, projectTotal])

  return state
}

export function useActiveProjectCache({
  projectList,
  projectSearchKeyword,
  projectStatusFilter,
}: ActiveProjectCacheParams): Project[] {
  const [activeProjectCache, dispatch] = useReducer(activeProjectCacheReducer, [])

  useEffect(() => {
    dispatch({
      projectList,
      projectSearchKeyword,
      projectStatusFilter,
    })
  }, [projectList, projectSearchKeyword, projectStatusFilter])

  return activeProjectCache
}
