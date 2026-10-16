import { useCallback, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'

import type { Session } from '@/types/api'

import { useContentStore, useWorkspaceStore } from '../../stores'
import type { SessionRestoreOwner } from '../../stores/useWorkspaceStore'
import {
  handleWorkspaceSessionClick,
  type ProvisionalSessionRestore,
} from './session-click'
import type { SessionSurface } from './session-surface'

type SessionClickParams = Parameters<typeof handleWorkspaceSessionClick>[0]
type ActiveSessionRestore = {
  clickSeq: number
  owner: SessionRestoreOwner
  transaction: ProvisionalSessionRestore | null
  cancelled: boolean
}

function createProvisionalSessionRestore(params: {
  setTab: SessionClickParams['setTab']
  setTool: SessionClickParams['setTool']
}): ProvisionalSessionRestore {
  const workspaceState = useWorkspaceStore.getState()
  const contentState = useContentStore.getState()
  const snapshot = {
    tab: workspaceState.tab,
    tool: { ...workspaceState.tool },
    pages: contentState.pages.map((page) => ({ ...page })),
    inputPage: contentState.inputPage,
    inputSections: { ...contentState.inputSections },
    generated: contentState.generated,
    versions: contentState.versions.map((version) => ({ ...version })),
  }
  let active = true

  return {
    rollback: () => {
      if (!active) return
      active = false
      params.setTab(snapshot.tab)
      params.setTool(snapshot.tool)
      useContentStore.setState({
        pages: snapshot.pages.map((page) => ({ ...page })),
        inputPage: snapshot.inputPage,
        inputSections: { ...snapshot.inputSections },
        generated: snapshot.generated,
        versions: snapshot.versions.map((version) => ({ ...version })),
      })
    },
    release: () => {
      active = false
    },
  }
}

type UseWorkspaceSessionClickHandlerParams = Omit<
  SessionClickParams,
  'session' | 'isSessionClickCurrent' | 'beginProvisionalRestore' | 'setTab' | 'setTool'
> & {
  sessionClickSeqRef: MutableRefObject<number>
  setPendingSessionId: (id: number | null) => void
  setSelectedProjectId: (id: number | null) => void
  setSelectedSessionId: (id: number | null) => void
  onSessionActivated?: (surface: SessionSurface) => void
}

export function useWorkspaceSessionClickHandler({
  availableTabs,
  filteredToolMetadataByName,
  loadSessionFiles,
  notify,
  onChatSessionSelect,
  projectList,
  requestApiDetailLoad,
  resolveToolName,
  sessionClickSeqRef,
  setPendingSessionId,
  setSelectedProjectId,
  setSelectedSessionId,
  onSessionActivated,
  tab,
  tool,
  toolMetadataByName,
}: UseWorkspaceSessionClickHandlerParams) {
  const mountedRef = useRef(true)
  const activeRestoreRef = useRef<ActiveSessionRestore | null>(null)

  const cancelRestore = useCallback(
    (activeRestore: ActiveSessionRestore): void => {
      if (activeRestore.cancelled) {
        return
      }
      activeRestore.cancelled = true
      const nextSeq = sessionClickSeqRef.current + 1
      sessionClickSeqRef.current = nextSeq
      if (activeRestoreRef.current === activeRestore) {
        activeRestoreRef.current = null
      }
      activeRestore?.transaction?.rollback()
      useWorkspaceStore.getState().finishSessionRestore(activeRestore.owner, false)
      if (mountedRef.current) {
        setPendingSessionId(null)
      }
    },
    [sessionClickSeqRef, setPendingSessionId],
  )

  const cancelPendingSessionRestore = useCallback(() => {
    useWorkspaceStore.getState().cancelActiveSessionRestore()
  }, [])

  useLayoutEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const activeRestore = activeRestoreRef.current
      if (activeRestore) {
        cancelRestore(activeRestore)
      }
    }
  }, [cancelRestore])

  const handleSessionClick = useCallback(
    async (session: Session) => {
      let activeRestore!: ActiveSessionRestore
      useWorkspaceStore.getState().beginSessionRestore((owner) => {
        const clickSeq = sessionClickSeqRef.current + 1
        sessionClickSeqRef.current = clickSeq
        activeRestore = {
          clickSeq,
          owner,
          transaction: null,
          cancelled: false,
        }
        activeRestoreRef.current = activeRestore
        return () => cancelRestore(activeRestore)
      })
      const { clickSeq, owner } = activeRestore
      setPendingSessionId(session.id)
      const result = await handleWorkspaceSessionClick({
        session,
        projectList,
        availableTabs,
        toolMetadataByName,
        filteredToolMetadataByName,
        tab,
        tool,
        setTab: (nextTab) => {
          useWorkspaceStore.getState().setTabForSessionRestore(owner, nextTab)
        },
        setTool: (nextTool) => {
          useWorkspaceStore.getState().setToolForSessionRestore(owner, nextTool)
        },
        notify,
        resolveToolName,
        onChatSessionSelect,
        loadSessionFiles,
        requestApiDetailLoad,
        isSessionClickCurrent: () =>
          mountedRef.current &&
          sessionClickSeqRef.current === clickSeq &&
          activeRestoreRef.current === activeRestore &&
          useWorkspaceStore.getState().activeSessionRestoreOwner === owner,
        beginProvisionalRestore: () => {
          const transaction = createProvisionalSessionRestore({
            setTab: (nextTab) => {
              useWorkspaceStore.getState().setTabForSessionRestore(owner, nextTab)
            },
            setTool: (nextTool) => {
              useWorkspaceStore.getState().setToolForSessionRestore(owner, nextTool)
            },
          })
          let settled = false
          const registeredTransaction: ProvisionalSessionRestore = {
            rollback: () => {
              if (settled) return
              settled = true
              if (useWorkspaceStore.getState().activeSessionRestoreOwner !== owner) {
                transaction.release()
                return
              }
              transaction.rollback()
            },
            release: () => {
              if (settled) return
              settled = true
              transaction.release()
            },
          }

          if (
            !mountedRef.current ||
            sessionClickSeqRef.current !== clickSeq ||
            activeRestoreRef.current !== activeRestore ||
            useWorkspaceStore.getState().activeSessionRestoreOwner !== owner
          ) {
            registeredTransaction.rollback()
            return registeredTransaction
          }
          activeRestore.transaction = registeredTransaction
          return registeredTransaction
        },
      })
      if (
        !mountedRef.current ||
        sessionClickSeqRef.current !== clickSeq ||
        activeRestoreRef.current !== activeRestore ||
        useWorkspaceStore.getState().activeSessionRestoreOwner !== owner
      ) {
        return
      }
      if (result.status === 'loaded') {
        activeRestore.transaction?.release()
        activeRestoreRef.current = null
        useWorkspaceStore.getState().finishSessionRestore(owner, true)
        setSelectedSessionId(session.id)
        if (result.surface === 'workflow') {
          setSelectedProjectId(result.restoredProjectId)
        }
        onSessionActivated?.(result.surface)
      } else {
        activeRestore.transaction?.rollback()
        activeRestoreRef.current = null
        useWorkspaceStore.getState().finishSessionRestore(owner, false)
      }
      setPendingSessionId(null)
    },
    [
      availableTabs,
      cancelRestore,
      filteredToolMetadataByName,
      loadSessionFiles,
      notify,
      onChatSessionSelect,
      projectList,
      requestApiDetailLoad,
      resolveToolName,
      sessionClickSeqRef,
      setPendingSessionId,
      setSelectedProjectId,
      setSelectedSessionId,
      onSessionActivated,
      tab,
      tool,
      toolMetadataByName,
    ],
  )

  return useMemo(
    () => ({ handleSessionClick, cancelPendingSessionRestore }),
    [cancelPendingSessionRestore, handleSessionClick],
  )
}
