import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from 'react'

import type { Project, Session } from '@/types/api'

import { mergeProjectsById } from './project-loading'
import {
  buildAssociateProjectRefreshTargets,
  buildDissociateProjectRefreshTargets,
  runSessionAssociationRefreshTasks,
} from './session-association-refresh'
import { reconcileSessionAssociationState } from './session-association-state'
import type {
  IndependentSessionPageState,
  ProjectSessionPageState,
  SessionLoadOptions,
} from './session-loading'

interface SessionRemoteApi {
  associateProject: (sessionId: number, payload: { projectId: number }) => Promise<unknown>
  deleteSession: (sessionId: number) => Promise<unknown>
  dissociateProject: (sessionId: number) => Promise<unknown>
  renameSession: (sessionId: number, payload: { title: string }) => Promise<unknown>
}

interface UseSessionRemoteHandlersParams {
  activeProjectCache: Project[]
  independentSessionPageState: IndependentSessionPageState
  independentSessions: Session[]
  independentSessionsSnapshotRef: MutableRefObject<Session[]>
  legacyProjectLinkedSessions: Session[]
  loadIndependentSessionsPage: (
    page: number,
    append: boolean,
    options?: SessionLoadOptions,
  ) => Promise<void>
  loadProjectSessionsPage: (
    projectId: number,
    page: number,
    append: boolean,
    options?: SessionLoadOptions,
  ) => Promise<void>
  projectList: Project[]
  projectSessionCountOverrides: Record<number, number>
  projectSessionPageSize: number
  projectSessionPageState: Record<number, ProjectSessionPageState>
  projectSessionsByProject: Record<number, Session[]>
  projectSessionsSnapshotRef: MutableRefObject<Record<number, Session[]>>
  refreshSessions: () => Promise<void>
  remoteApi: SessionRemoteApi
  setIndependentSessionPageState: Dispatch<SetStateAction<IndependentSessionPageState>>
  setIndependentSessions: Dispatch<SetStateAction<Session[]>>
  setLegacyProjectLinkedSessions: Dispatch<SetStateAction<Session[]>>
  setProjectSessionCountOverrides: Dispatch<SetStateAction<Record<number, number>>>
  setProjectSessionPageState: Dispatch<SetStateAction<Record<number, ProjectSessionPageState>>>
  setProjectSessionsByProject: Dispatch<SetStateAction<Record<number, Session[]>>>
}

interface SessionRemoteHandlers {
  handleAssociateProjectRemote: (session: Session, projectId: number) => Promise<void>
  handleDeleteSessionRemote: (sessionId: number) => Promise<void>
  handleDissociateProjectRemote: (session: Session) => Promise<void>
  handleRenameSessionRemote: (sessionId: number, title: string) => Promise<void>
}

export function useSessionRemoteHandlers({
  activeProjectCache,
  independentSessionPageState,
  independentSessions,
  independentSessionsSnapshotRef,
  legacyProjectLinkedSessions,
  loadIndependentSessionsPage,
  loadProjectSessionsPage,
  projectList,
  projectSessionCountOverrides,
  projectSessionPageSize,
  projectSessionPageState,
  projectSessionsByProject,
  projectSessionsSnapshotRef,
  refreshSessions,
  remoteApi,
  setIndependentSessionPageState,
  setIndependentSessions,
  setLegacyProjectLinkedSessions,
  setProjectSessionCountOverrides,
  setProjectSessionPageState,
  setProjectSessionsByProject,
}: UseSessionRemoteHandlersParams): SessionRemoteHandlers {
  const handleRenameSessionRemote = useCallback(
    async (sessionId: number, title: string) => {
      await remoteApi.renameSession(sessionId, { title })
      await refreshSessions()
    },
    [refreshSessions, remoteApi],
  )

  const handleDeleteSessionRemote = useCallback(
    async (sessionId: number) => {
      await remoteApi.deleteSession(sessionId)
      await refreshSessions()
    },
    [refreshSessions, remoteApi],
  )

  const applyAssociationState = useCallback(
    (nextState: ReturnType<typeof reconcileSessionAssociationState>) => {
      setIndependentSessions(nextState.independentSessions)
      independentSessionsSnapshotRef.current = nextState.independentSessionsSnapshot
      setIndependentSessionPageState(nextState.independentSessionPageState)
      setProjectSessionsByProject(nextState.projectSessionsByProject)
      projectSessionsSnapshotRef.current = nextState.projectSessionsSnapshot
      setProjectSessionPageState(nextState.projectSessionPageState)
      setProjectSessionCountOverrides(nextState.projectSessionCountOverrides)
      setLegacyProjectLinkedSessions(nextState.legacyProjectLinkedSessions)
    },
    [
      independentSessionsSnapshotRef,
      projectSessionsSnapshotRef,
      setIndependentSessionPageState,
      setIndependentSessions,
      setLegacyProjectLinkedSessions,
      setProjectSessionCountOverrides,
      setProjectSessionPageState,
      setProjectSessionsByProject,
    ],
  )

  const buildCurrentAssociationState = useCallback(
    () => ({
      independentSessions,
      independentSessionsSnapshot: independentSessionsSnapshotRef.current,
      independentSessionPageState,
      projectSessionsByProject,
      projectSessionsSnapshot: projectSessionsSnapshotRef.current,
      projectSessionPageState,
      projectSessionCountOverrides,
      legacyProjectLinkedSessions,
    }),
    [
      independentSessionPageState,
      independentSessions,
      independentSessionsSnapshotRef,
      legacyProjectLinkedSessions,
      projectSessionCountOverrides,
      projectSessionPageState,
      projectSessionsByProject,
      projectSessionsSnapshotRef,
    ],
  )

  const handleAssociateProjectRemote = useCallback(
    async (session: Session, projectId: number) => {
      await remoteApi.associateProject(session.id, { projectId })

      const nextState = reconcileSessionAssociationState({
        session,
        targetProjectId: projectId,
        pageSize: projectSessionPageSize,
        projects: mergeProjectsById(projectList, activeProjectCache),
        state: buildCurrentAssociationState(),
      })

      applyAssociationState(nextState)

      runSessionAssociationRefreshTasks(
        buildAssociateProjectRefreshTargets(session, projectId),
        loadIndependentSessionsPage,
        loadProjectSessionsPage,
      )
    },
    [
      activeProjectCache,
      applyAssociationState,
      buildCurrentAssociationState,
      loadIndependentSessionsPage,
      loadProjectSessionsPage,
      projectList,
      projectSessionPageSize,
      remoteApi,
    ],
  )

  const handleDissociateProjectRemote = useCallback(
    async (session: Session) => {
      await remoteApi.dissociateProject(session.id)

      const nextState = reconcileSessionAssociationState({
        session,
        targetProjectId: null,
        pageSize: projectSessionPageSize,
        projects: mergeProjectsById(projectList, activeProjectCache),
        state: buildCurrentAssociationState(),
      })

      applyAssociationState(nextState)

      runSessionAssociationRefreshTasks(
        buildDissociateProjectRefreshTargets(session),
        loadIndependentSessionsPage,
        loadProjectSessionsPage,
      )
    },
    [
      activeProjectCache,
      applyAssociationState,
      buildCurrentAssociationState,
      loadIndependentSessionsPage,
      loadProjectSessionsPage,
      projectList,
      projectSessionPageSize,
      remoteApi,
    ],
  )

  return {
    handleAssociateProjectRemote,
    handleDeleteSessionRemote,
    handleDissociateProjectRemote,
    handleRenameSessionRemote,
  }
}
