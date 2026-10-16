import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'

import type { Project, Session } from '@/types/api'

import {
  OPTIMISTIC_SESSION_TTL_MS,
  pruneExpiredOptimisticSessionsByFolder,
  pruneOptimisticSessionsByFolder,
  type OptimisticSessionsByFolder,
} from './optimistic-session'
import {
  buildProjectListPagination,
  type ProjectListPaginationView,
} from './project-loading'
import { filterProjectSessionsByProjectList } from './project-state-cleanup'
import {
  buildFilteredProjectSessions,
  buildIndependentSessionPagination,
  buildMergedSessionList,
  buildNonOverlappingProjectSessions,
  buildProjectSessionPaginationByProject,
  buildProjectsVisibleInSessions,
  buildStandaloneSessions,
  type ProjectSessionPaginationView,
} from './session-list-view'
import { useOptimisticSessionExpiry } from './use-optimistic-session-expiry'
import { buildVisibleSessionList } from './visible-session-list'

export function useWorkspaceSidebarSessionViews(params: {
  activeProjectCache: Project[]
  independentSessionPageState: Parameters<typeof buildIndependentSessionPagination>[0]['pageState']
  independentSessions: Session[]
  isProjectsLoading: boolean
  legacyProjectLinkedSessions: Session[]
  optimisticSessionsByFolder: OptimisticSessionsByFolder
  projectList: Project[]
  projectPagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  projectSessionPageState: Parameters<typeof buildProjectSessionPaginationByProject>[0]['projectSessionPageState']
  projectSessionsByProject: Record<number, Session[]>
  rootProjects: Project[]
  setOptimisticSessionsByFolder: Dispatch<SetStateAction<OptimisticSessionsByFolder>>
}) {
  const {
    activeProjectCache,
    independentSessionPageState,
    independentSessions,
    isProjectsLoading,
    legacyProjectLinkedSessions,
    optimisticSessionsByFolder,
    projectList,
    projectPagination,
    projectSessionPageState,
    projectSessionsByProject,
    rootProjects,
    setOptimisticSessionsByFolder,
  } = params

  const normalizedIndependentSessions = useMemo(
    () => buildStandaloneSessions(independentSessions),
    [independentSessions],
  )
  const projectSessions = useMemo(() => {
    return filterProjectSessionsByProjectList({
      projectList,
      projectSessionsByProject,
    })
  }, [projectList, projectSessionsByProject])

  useOptimisticSessionExpiry({
    optimisticSessionsByFolder,
    setOptimisticSessionsByFolder,
    ttlMs: OPTIMISTIC_SESSION_TTL_MS,
  })
  useEffect(() => {
    setOptimisticSessionsByFolder((prev) =>
      pruneOptimisticSessionsByFolder({
        optimisticSessionsByFolder: pruneExpiredOptimisticSessionsByFolder({
          optimisticSessionsByFolder: prev,
          nowMs: Date.now(),
          ttlMs: OPTIMISTIC_SESSION_TTL_MS,
        }),
        independentSessions: normalizedIndependentSessions,
        projectSessionsByProject: projectSessions,
      }),
    )
  }, [normalizedIndependentSessions, projectSessions, setOptimisticSessionsByFolder])

  const visibleSessionList = useMemo(
    () =>
      buildVisibleSessionList({
        projects: projectList,
        independentSessions: normalizedIndependentSessions,
        projectSessionsByProject: projectSessions,
        optimisticSessionsByFolder,
      }),
    [normalizedIndependentSessions, optimisticSessionsByFolder, projectList, projectSessions],
  )
  const visibleIndependentSessions = visibleSessionList.independentSessions
  const visibleProjectSessions = visibleSessionList.projectSessionsByProject
  const visibleProjectIdSet = useMemo(
    () => new Set(visibleSessionList.visibleProjectIds),
    [visibleSessionList.visibleProjectIds],
  )
  const nonOverlappingProjectSessions = useMemo(
    () =>
      buildNonOverlappingProjectSessions({
        independentSessions: normalizedIndependentSessions,
        projectSessionsByProject: projectSessions,
      }),
    [normalizedIndependentSessions, projectSessions],
  )
  const sessionList = useMemo(
    () =>
      buildMergedSessionList({
        independentSessions: normalizedIndependentSessions,
        projectSessionsByProject: nonOverlappingProjectSessions,
        legacyProjectLinkedSessions,
      }),
    [legacyProjectLinkedSessions, nonOverlappingProjectSessions, normalizedIndependentSessions],
  )

  const projectSessionPaginationByProject = useMemo<Record<number, ProjectSessionPaginationView>>(
    () =>
      buildProjectSessionPaginationByProject({
        projectList,
        projectSessionPageState,
        projectSessionsByProject: projectSessions,
      }),
    [projectList, projectSessionPageState, projectSessions],
  )

  const independentSessionPagination = useMemo<ProjectSessionPaginationView>(
    () =>
      buildIndependentSessionPagination({
        pageState: independentSessionPageState,
        visibleIndependentSessionCount: visibleIndependentSessions.length,
      }),
    [independentSessionPageState, visibleIndependentSessions.length],
  )

  const filteredProjects = useMemo(
    () =>
      buildProjectsVisibleInSessions({
        projectList,
        rootProjects,
        activeProjectCache,
        visibleProjectIdSet,
      }),
    [activeProjectCache, projectList, rootProjects, visibleProjectIdSet],
  )
  const filteredProjectSessions = useMemo(
    () =>
      buildFilteredProjectSessions({
        filteredProjects,
        visibleProjectSessions,
      }),
    [filteredProjects, visibleProjectSessions],
  )

  const projectListPagination = useMemo<ProjectListPaginationView>(
    () =>
      buildProjectListPagination({
        filteredProjects,
        isProjectsLoading,
        pagination: projectPagination,
      }),
    [filteredProjects, isProjectsLoading, projectPagination],
  )

  return {
    filteredProjects,
    filteredProjectSessions,
    independentSessionPagination,
    projectListPagination,
    projectSessionPaginationByProject,
    sessionList,
    visibleIndependentSessions,
  }
}
