import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PaginatedResponse, Project } from '@/types/api'

import {
  buildChildProjectErrorState,
  buildChildProjectLoadedState,
  buildChildProjectLoadingState,
  buildChildProjectPaginationByParent,
  mergeProjectsById,
  type ChildProjectPageState,
  type ProjectListPaginationView,
} from './project-loading'
import { pruneChildProjectPageState, pruneChildProjectsByParent } from './project-state-cleanup'

type ProjectStatusFilter = 'active' | 'archived'

interface ChildProjectRequest {
  parentId: number
  page: number
  pageSize: number
  status: ProjectStatusFilter
}

interface ChildProjectApi {
  getProjects: (request: ChildProjectRequest) => Promise<PaginatedResponse<Project>>
}

interface PendingChildProjectRequest {
  page: number
  append: boolean
}

interface UseChildProjectLoadingParams {
  pageSize: number
  projectApi: ChildProjectApi
  projectList: Project[]
  projectSearchKeyword: string
  projectStatusFilter: ProjectStatusFilter
}

interface UseChildProjectLoadingResult {
  childProjectPaginationByParent: Record<number, ProjectListPaginationView>
  childProjectPageState: Record<number, ChildProjectPageState>
  childProjectsByParent: Record<number, Project[]>
  ensureChildProjectsLoaded: (parentId: number) => Promise<void>
  loadChildProjectsPage: (parentId: number, page: number, append: boolean) => Promise<void>
  loadMoreChildProjects: (parentId: number) => Promise<void>
}

export function useChildProjectLoading({
  pageSize,
  projectApi,
  projectList,
  projectSearchKeyword,
  projectStatusFilter,
}: UseChildProjectLoadingParams): UseChildProjectLoadingResult {
  const [childProjectsByParent, setChildProjectsByParent] = useState<Record<number, Project[]>>({})
  const [childProjectPageState, setChildProjectPageState] = useState<
    Record<number, ChildProjectPageState>
  >({})
  const childProjectLoadingRef = useRef<Record<number, boolean>>({})
  const childProjectPendingRequestRef = useRef<Record<number, PendingChildProjectRequest | null>>(
    {},
  )
  const childProjectDesiredSeqRef = useRef<Record<number, number>>({})
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      childProjectPendingRequestRef.current = {}
    }
  }, [])

  const loadChildProjectsPage = useCallback(
    async (parentId: number, page: number, append: boolean) => {
      if (!mountedRef.current) {
        return
      }
      const requestSeq = (childProjectDesiredSeqRef.current[parentId] ?? 0) + 1
      childProjectDesiredSeqRef.current[parentId] = requestSeq
      if (childProjectLoadingRef.current[parentId]) {
        childProjectPendingRequestRef.current[parentId] = { page, append }
        return
      }

      childProjectLoadingRef.current[parentId] = true
      setChildProjectPageState((prev) => ({
        ...prev,
        [parentId]: buildChildProjectLoadingState(prev[parentId]),
      }))

      try {
        const response = await projectApi.getProjects({
          parentId,
          page,
          pageSize,
          status: projectStatusFilter,
        })

        if (
          !mountedRef.current ||
          requestSeq !== (childProjectDesiredSeqRef.current[parentId] ?? 0)
        ) {
          return
        }

        setChildProjectsByParent((prev) => {
          const current = prev[parentId] ?? []
          const nextItems = append ? mergeProjectsById(current, response.items) : response.items
          return {
            ...prev,
            [parentId]: nextItems,
          }
        })
        setChildProjectPageState((prev) => ({
          ...prev,
          [parentId]: buildChildProjectLoadedState(response.pagination),
        }))
      } catch (error) {
        if (
          !mountedRef.current ||
          requestSeq !== (childProjectDesiredSeqRef.current[parentId] ?? 0)
        ) {
          return
        }

        console.error('[useWorkspaceSidebar] 加载子项目失败:', error)
        setChildProjectPageState((prev) => ({
          ...prev,
          [parentId]: buildChildProjectErrorState(prev[parentId]),
        }))
      } finally {
        childProjectLoadingRef.current[parentId] = false
        if (mountedRef.current) {
          const pending = childProjectPendingRequestRef.current[parentId]
          childProjectPendingRequestRef.current[parentId] = null
          if (pending) {
            void loadChildProjectsPage(parentId, pending.page, pending.append)
          }
        }
      }
    },
    [pageSize, projectApi, projectStatusFilter],
  )

  const ensureChildProjectsLoaded = useCallback(
    async (parentId: number) => {
      const state = childProjectPageState[parentId]
      if (state?.initialized || state?.isLoading) {
        return
      }
      await loadChildProjectsPage(parentId, 1, false)
    },
    [childProjectPageState, loadChildProjectsPage],
  )

  const loadMoreChildProjects = useCallback(
    async (parentId: number) => {
      const state = childProjectPageState[parentId]
      if (!state || state.isLoading) {
        if (!state?.initialized) {
          await loadChildProjectsPage(parentId, 1, false)
        }
        return
      }

      if (state.page >= state.totalPages) {
        return
      }

      await loadChildProjectsPage(parentId, state.page + 1, true)
    },
    [childProjectPageState, loadChildProjectsPage],
  )

  useEffect(() => {
    setChildProjectsByParent({})
    setChildProjectPageState({})
    childProjectLoadingRef.current = {}
    childProjectPendingRequestRef.current = {}
    childProjectDesiredSeqRef.current = {}
  }, [projectSearchKeyword, projectStatusFilter])

  useEffect(() => {
    setChildProjectsByParent((prev) => pruneChildProjectsByParent(prev, projectList))
    setChildProjectPageState((prev) => pruneChildProjectPageState(prev, projectList))
  }, [projectList])

  const childProjectPaginationByParent = useMemo<Record<number, ProjectListPaginationView>>(
    () =>
      buildChildProjectPaginationByParent({
        childProjectPageState,
        childProjectsByParent,
        projectList,
      }),
    [childProjectPageState, childProjectsByParent, projectList],
  )

  return {
    childProjectPaginationByParent,
    childProjectPageState,
    childProjectsByParent,
    ensureChildProjectsLoaded,
    loadChildProjectsPage,
    loadMoreChildProjects,
  }
}
