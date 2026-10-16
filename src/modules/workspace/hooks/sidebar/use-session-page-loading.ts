import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { PaginatedResponse, Session } from '@/types/api'

import {
  buildIndependentSessionErrorState,
  buildIndependentSessionLoadedState,
  buildIndependentSessionLoadingState,
  buildProjectSessionErrorState,
  buildProjectSessionLoadedState,
  buildProjectSessionLoadingState,
  filterIndependentSessions,
  filterProjectSessions,
  mergeSessionsById,
  shouldBypassSessionCache,
  type IndependentSessionPageState,
  type ProjectSessionPageState,
  type SessionLoadOptions,
} from './session-loading'

interface SessionPageRequest {
  page: number
  append: boolean
  options?: SessionLoadOptions
}

interface SessionApi {
  getSessions: (params: {
    type?: 'independent' | 'projectLinked' | 'all'
    projectId?: number
    page?: number
    pageSize?: number
    search?: string
    cacheMode?: 'default' | 'bypass'
  }) => Promise<PaginatedResponse<Session>>
}

interface UseSessionPageLoadingParams {
  historyPageSize: number
  historySearchKeyword: string
  projectSessionPageSize: number
  sessionApi: SessionApi
  setProjectSessionCountOverrides: Dispatch<SetStateAction<Record<number, number>>>
}

interface UseSessionPageLoadingResult {
  ensureProjectSessionsLoaded: (projectId: number) => Promise<void>
  independentSessionPageState: IndependentSessionPageState
  independentSessions: Session[]
  independentSessionsSnapshotRef: MutableRefObject<Session[]>
  loadIndependentSessionsPage: (
    page: number,
    append: boolean,
    options?: SessionLoadOptions,
  ) => Promise<void>
  loadMoreIndependentSessions: () => Promise<void>
  loadMoreProjectSessions: (projectId: number) => Promise<void>
  loadProjectSessionsPage: (
    projectId: number,
    page: number,
    append: boolean,
    options?: SessionLoadOptions,
  ) => Promise<void>
  projectSessionPageState: Record<number, ProjectSessionPageState>
  projectSessionsByProject: Record<number, Session[]>
  projectSessionsSnapshotRef: MutableRefObject<Record<number, Session[]>>
  setIndependentSessionPageState: Dispatch<SetStateAction<IndependentSessionPageState>>
  setIndependentSessions: Dispatch<SetStateAction<Session[]>>
  setProjectSessionPageState: Dispatch<SetStateAction<Record<number, ProjectSessionPageState>>>
  setProjectSessionsByProject: Dispatch<SetStateAction<Record<number, Session[]>>>
}

const INITIAL_INDEPENDENT_SESSION_PAGE_STATE: IndependentSessionPageState = {
  page: 0,
  total: 0,
  totalPages: 0,
  isLoading: false,
  initialized: false,
}

export function useSessionPageLoading({
  historyPageSize,
  historySearchKeyword,
  projectSessionPageSize,
  sessionApi,
  setProjectSessionCountOverrides,
}: UseSessionPageLoadingParams): UseSessionPageLoadingResult {
  const [independentSessions, setIndependentSessions] = useState<Session[]>([])
  const [projectSessionsByProject, setProjectSessionsByProject] = useState<
    Record<number, Session[]>
  >({})
  const [independentSessionPageState, setIndependentSessionPageState] =
    useState<IndependentSessionPageState>(INITIAL_INDEPENDENT_SESSION_PAGE_STATE)
  const [projectSessionPageState, setProjectSessionPageState] = useState<
    Record<number, ProjectSessionPageState>
  >({})
  const independentSessionLoadingRef = useRef(false)
  const independentSessionPendingRequestRef = useRef<SessionPageRequest | null>(null)
  const independentSessionDesiredSeqRef = useRef(0)
  const historySearchKeywordRef = useRef(historySearchKeyword)
  const projectSessionLoadingRef = useRef<Record<number, boolean>>({})
  const projectSessionPendingRequestRef = useRef<Record<number, SessionPageRequest | null>>({})
  const projectSessionDesiredSeqRef = useRef<Record<number, number>>({})
  const independentSessionsSnapshotRef = useRef<Session[]>([])
  const projectSessionsSnapshotRef = useRef<Record<number, Session[]>>({})
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      independentSessionPendingRequestRef.current = null
      projectSessionPendingRequestRef.current = {}
    }
  }, [])

  useEffect(() => {
    historySearchKeywordRef.current = historySearchKeyword
  }, [historySearchKeyword])

  const loadIndependentSessionsPage = useCallback(
    async (page: number, append: boolean, options?: SessionLoadOptions) => {
      if (!mountedRef.current) {
        return
      }
      const requestSeq = independentSessionDesiredSeqRef.current + 1
      independentSessionDesiredSeqRef.current = requestSeq
      const shouldBypassCache = shouldBypassSessionCache(page, append, options)

      if (independentSessionLoadingRef.current) {
        independentSessionPendingRequestRef.current = { page, append, options }
        return
      }
      independentSessionLoadingRef.current = true

      setIndependentSessionPageState(buildIndependentSessionLoadingState)

      try {
        const response = await sessionApi.getSessions({
          type: 'independent',
          page,
          pageSize: historyPageSize,
          search: historySearchKeywordRef.current || undefined,
          cacheMode: shouldBypassCache ? 'bypass' : undefined,
        })

        if (!mountedRef.current || requestSeq !== independentSessionDesiredSeqRef.current) {
          return
        }

        const normalizedItems = filterIndependentSessions(response.items)

        setIndependentSessions((prev) =>
          append ? mergeSessionsById(prev, normalizedItems) : normalizedItems,
        )
        independentSessionsSnapshotRef.current = append
          ? mergeSessionsById(independentSessionsSnapshotRef.current, normalizedItems)
          : normalizedItems

        setIndependentSessionPageState(buildIndependentSessionLoadedState(response.pagination))
      } catch (error) {
        if (!mountedRef.current || requestSeq !== independentSessionDesiredSeqRef.current) {
          return
        }
        console.error('[useWorkspaceSidebar] 加载独立会话失败:', error)
        setIndependentSessionPageState(buildIndependentSessionErrorState)
      } finally {
        independentSessionLoadingRef.current = false
        if (mountedRef.current) {
          const pending = independentSessionPendingRequestRef.current
          independentSessionPendingRequestRef.current = null
          if (pending) {
            void loadIndependentSessionsPage(pending.page, pending.append, pending.options)
          }
        }
      }
    },
    [historyPageSize, sessionApi],
  )

  const loadProjectSessionsPage = useCallback(
    async (projectId: number, page: number, append: boolean, options?: SessionLoadOptions) => {
      if (!mountedRef.current) {
        return
      }
      const requestSeq = (projectSessionDesiredSeqRef.current[projectId] ?? 0) + 1
      projectSessionDesiredSeqRef.current[projectId] = requestSeq
      if (projectSessionLoadingRef.current[projectId]) {
        projectSessionPendingRequestRef.current[projectId] = { page, append, options }
        return
      }
      const shouldBypassCache = shouldBypassSessionCache(page, append, options)
      projectSessionLoadingRef.current[projectId] = true

      setProjectSessionPageState((prev) => ({
        ...prev,
        [projectId]: buildProjectSessionLoadingState(prev[projectId], append),
      }))

      try {
        const response = await sessionApi.getSessions({
          projectId,
          page,
          pageSize: projectSessionPageSize,
          cacheMode: shouldBypassCache ? 'bypass' : undefined,
        })

        if (
          !mountedRef.current ||
          requestSeq !== (projectSessionDesiredSeqRef.current[projectId] ?? 0)
        ) {
          return
        }

        const normalizedItems = filterProjectSessions(response.items, projectId)

        setProjectSessionsByProject((prev) => {
          const current = prev[projectId] ?? []
          const nextItems = append ? mergeSessionsById(current, normalizedItems) : normalizedItems
          projectSessionsSnapshotRef.current[projectId] = nextItems
          return {
            ...prev,
            [projectId]: nextItems,
          }
        })
        setProjectSessionCountOverrides((prev) => {
          if (prev[projectId] === response.pagination.total) {
            return prev
          }
          return {
            ...prev,
            [projectId]: response.pagination.total,
          }
        })

        setProjectSessionPageState((prev) => ({
          ...prev,
          [projectId]: buildProjectSessionLoadedState(response.pagination),
        }))
      } catch (error) {
        if (
          !mountedRef.current ||
          requestSeq !== (projectSessionDesiredSeqRef.current[projectId] ?? 0)
        ) {
          return
        }
        console.error('[useWorkspaceSidebar] 加载项目会话失败:', error)
        setProjectSessionPageState((prev) => ({
          ...prev,
          [projectId]: buildProjectSessionErrorState(prev[projectId]),
        }))
      } finally {
        projectSessionLoadingRef.current[projectId] = false
        if (mountedRef.current) {
          const pending = projectSessionPendingRequestRef.current[projectId]
          projectSessionPendingRequestRef.current[projectId] = null
          if (pending) {
            void loadProjectSessionsPage(projectId, pending.page, pending.append, pending.options)
          }
        }
      }
    },
    [projectSessionPageSize, sessionApi, setProjectSessionCountOverrides],
  )

  const ensureProjectSessionsLoaded = useCallback(
    async (projectId: number) => {
      const state = projectSessionPageState[projectId]
      if (state?.initialized || state?.isLoading) {
        return
      }
      await loadProjectSessionsPage(projectId, 1, false)
    },
    [loadProjectSessionsPage, projectSessionPageState],
  )

  const loadMoreProjectSessions = useCallback(
    async (projectId: number) => {
      const state = projectSessionPageState[projectId]
      if (!state || state.isLoading) {
        if (!state?.initialized) {
          await loadProjectSessionsPage(projectId, 1, false)
        }
        return
      }

      if (state.page >= state.totalPages) {
        return
      }

      await loadProjectSessionsPage(projectId, state.page + 1, true)
    },
    [loadProjectSessionsPage, projectSessionPageState],
  )

  const loadMoreIndependentSessions = useCallback(async () => {
    if (independentSessionPageState.isLoading) {
      return
    }

    if (!independentSessionPageState.initialized) {
      await loadIndependentSessionsPage(1, false)
      return
    }

    if (independentSessionPageState.page >= independentSessionPageState.totalPages) {
      return
    }

    await loadIndependentSessionsPage(independentSessionPageState.page + 1, true)
  }, [independentSessionPageState, loadIndependentSessionsPage])

  return {
    ensureProjectSessionsLoaded,
    independentSessionPageState,
    independentSessions,
    independentSessionsSnapshotRef,
    loadIndependentSessionsPage,
    loadMoreIndependentSessions,
    loadMoreProjectSessions,
    loadProjectSessionsPage,
    projectSessionPageState,
    projectSessionsByProject,
    projectSessionsSnapshotRef,
    setIndependentSessionPageState,
    setIndependentSessions,
    setProjectSessionPageState,
    setProjectSessionsByProject,
  }
}
