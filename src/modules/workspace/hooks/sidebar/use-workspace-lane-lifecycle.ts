import { useCallback, useEffect, useRef } from 'react'

import type { Project } from '@/types/api'

import { createLaneMarks, markLanePhase, type WorkspaceLane } from './lane-performance'
import { buildProjectPreloadPlan } from './project-preload'
import { pruneAttemptedProjectIds } from './project-state-cleanup'
import type { ProjectSessionPaginationView } from './session-list-view'
import type { ProjectSessionPageState, SessionLoadOptions } from './session-loading'
import { buildWorkspaceReadyMark, createWorkspaceReadyMarks } from './workspace-ready-performance'

type WorkspaceManagementTab = 'history' | 'project'

interface WorkspaceLaneTab {
  tools: unknown[]
}

interface UseWorkspaceLaneLifecycleParams {
  availableTabs: WorkspaceLaneTab[]
  independentSessionPagination: ProjectSessionPaginationView
  isProjectsLoading: boolean
  loadIndependentSessionsPage: (
    page: number,
    append: boolean,
    options?: SessionLoadOptions,
  ) => Promise<unknown>
  loadProjectSessionsPage: (
    projectId: number,
    page: number,
    append: boolean,
    options?: SessionLoadOptions,
  ) => Promise<unknown>
  managementTab: WorkspaceManagementTab
  markWorkspacePerf?: (name: string) => void
  projectList: Project[]
  projectSessionPageState: Record<number, ProjectSessionPageState>
  secondaryLaneDelayMs: number
}

function defaultMarkWorkspacePerf(name: string): void {
  if (typeof window === 'undefined') {
    return
  }
  window.performance?.mark?.(name)
}

export function useWorkspaceLaneLifecycle({
  availableTabs,
  independentSessionPagination,
  isProjectsLoading,
  loadIndependentSessionsPage,
  loadProjectSessionsPage,
  managementTab,
  markWorkspacePerf = defaultMarkWorkspacePerf,
  projectList,
  projectSessionPageState,
  secondaryLaneDelayMs,
}: UseWorkspaceLaneLifecycleParams): void {
  const autoPreloadAttemptedProjectIdsRef = useRef<Set<number>>(new Set())
  const laneGenerationRef = useRef(0)
  const laneMarksRef = useRef(createLaneMarks(0))
  const perfMarksRef = useRef(createWorkspaceReadyMarks())

  useEffect(() => {
    return () => {
      laneGenerationRef.current += 1
    }
  }, [])

  const markLanePerf = useCallback(
    (lane: WorkspaceLane, phase: 'start' | 'ready') => {
      const result = markLanePhase({
        marks: laneMarksRef.current,
        currentGeneration: laneGenerationRef.current,
        lane,
        phase,
      })
      laneMarksRef.current = result.marks
      if (result.shouldMark) {
        markWorkspacePerf(result.markName)
      }
    },
    [markWorkspacePerf],
  )

  const markReadyPerf = useCallback(
    (kind: 'tabs' | 'history' | 'project', ready: boolean) => {
      const result = buildWorkspaceReadyMark({
        marks: perfMarksRef.current,
        kind,
        ready,
      })
      perfMarksRef.current = result.marks
      if (result.shouldMark) {
        markWorkspacePerf(result.markName)
      }
    },
    [markWorkspacePerf],
  )

  const getActiveProjectIds = useCallback(
    () => projectList.filter((project) => project.status === 'active').map((project) => project.id),
    [projectList],
  )

  const preloadActiveProjectSessions = useCallback(
    async (lane: WorkspaceLane, generation: number) => {
      const activeProjectIds = getActiveProjectIds()
      const preloadPlan = buildProjectPreloadPlan({
        activeProjectIds,
        projectSessionPageState,
        attemptedProjectIds: autoPreloadAttemptedProjectIdsRef.current,
      })

      if (preloadPlan.pendingProjectIds.length === 0) {
        markLanePerf(lane, preloadPlan.lanePhase)
        return
      }

      markLanePerf(lane, preloadPlan.lanePhase)
      preloadPlan.pendingProjectIds.forEach((projectId) => {
        autoPreloadAttemptedProjectIdsRef.current.add(projectId)
      })

      for (const projectId of preloadPlan.pendingProjectIds) {
        if (generation !== laneGenerationRef.current) {
          return
        }
        await loadProjectSessionsPage(projectId, 1, false)
      }

      if (generation !== laneGenerationRef.current) {
        return
      }
      markLanePerf(lane, 'ready')
    },
    [getActiveProjectIds, loadProjectSessionsPage, markLanePerf, projectSessionPageState],
  )

  useEffect(() => {
    const firstTab = availableTabs[0]
    markReadyPerf('tabs', Boolean(firstTab && firstTab.tools.length > 0))
  }, [availableTabs, markReadyPerf])

  useEffect(() => {
    markReadyPerf(
      'history',
      independentSessionPagination.initialized && !independentSessionPagination.isLoading,
    )
  }, [
    independentSessionPagination.initialized,
    independentSessionPagination.isLoading,
    markReadyPerf,
  ])

  useEffect(() => {
    markReadyPerf('project', !isProjectsLoading)
  }, [isProjectsLoading, markReadyPerf])

  useEffect(() => {
    laneGenerationRef.current += 1
    laneMarksRef.current = createLaneMarks(laneGenerationRef.current)
  }, [managementTab])

  useEffect(() => {
    autoPreloadAttemptedProjectIdsRef.current = pruneAttemptedProjectIds(
      autoPreloadAttemptedProjectIdsRef.current,
      projectList,
    )
  }, [projectList])

  useEffect(() => {
    if (managementTab !== 'history') {
      return
    }

    const generation = laneGenerationRef.current
    const primaryReady =
      independentSessionPagination.initialized && !independentSessionPagination.isLoading
    if (!primaryReady) {
      markLanePerf('primary', 'start')
      return
    }

    markLanePerf('primary', 'ready')
    const timerId = window.setTimeout(() => {
      if (generation !== laneGenerationRef.current) {
        return
      }
      void preloadActiveProjectSessions('secondary', generation)
    }, secondaryLaneDelayMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [
    independentSessionPagination.initialized,
    independentSessionPagination.isLoading,
    managementTab,
    markLanePerf,
    preloadActiveProjectSessions,
    secondaryLaneDelayMs,
  ])

  useEffect(() => {
    if (managementTab !== 'project') {
      return
    }
    if (isProjectsLoading) {
      return
    }

    const generation = laneGenerationRef.current
    void preloadActiveProjectSessions('primary', generation)
  }, [isProjectsLoading, managementTab, preloadActiveProjectSessions])

  useEffect(() => {
    if (managementTab !== 'project') {
      return
    }
    if (isProjectsLoading) {
      return
    }

    const generation = laneGenerationRef.current
    const timerId = window.setTimeout(() => {
      if (generation !== laneGenerationRef.current) {
        return
      }
      const secondaryReady =
        independentSessionPagination.initialized && !independentSessionPagination.isLoading
      if (secondaryReady) {
        markLanePerf('secondary', 'ready')
        return
      }

      markLanePerf('secondary', 'start')
      if (!independentSessionPagination.isLoading) {
        void loadIndependentSessionsPage(1, false)
      }
    }, secondaryLaneDelayMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [
    independentSessionPagination.initialized,
    independentSessionPagination.isLoading,
    isProjectsLoading,
    loadIndependentSessionsPage,
    managementTab,
    markLanePerf,
    secondaryLaneDelayMs,
  ])
}
