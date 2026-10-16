import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ToolName } from '@/types'

type ManagementTab = 'history' | 'project'

interface ToolState {
  name: ToolName
  ver: string
}

export type SessionRestoreOwner = symbol

type ProjectOrderStatus = 'active' | 'archived'

interface ProjectOrderState {
  active: number[]
  archived: number[]
}

interface WorkspaceStore {
  hydrated: boolean
  // 当前标签
  tab: string
  setTab: (tab: string) => void
  setTabForSessionRestore: (owner: SessionRestoreOwner, tab: string) => void

  // 工具状态
  tool: ToolState
  setTool: (tool: ToolState) => void

  // 管理标签
  managementTab: ManagementTab
  setManagementTab: (tab: ManagementTab) => void

  // 版本信息显示
  showVersionInfo: boolean
  setShowVersionInfo: (show: boolean) => void

  // 项目相关
  selectedProjectId: number | null
  setSelectedProjectId: (id: number | null) => void
  selectedSessionId: number | null
  setSelectedSessionId: (id: number | null) => void
  isSessionOutputRestoring: boolean
  activeSessionRestoreOwner: SessionRestoreOwner | null
  activeSessionRestoreCancel: (() => void) | null
  sessionRestoreCommitRevision: number
  pendingSessionRestoreToolKey: string | null
  pendingSessionRestoreToolOwner: SessionRestoreOwner | null
  beginSessionRestore: (
    createCancel: (owner: SessionRestoreOwner) => () => void,
  ) => SessionRestoreOwner
  cancelActiveSessionRestore: () => void
  setToolForSessionRestore: (owner: SessionRestoreOwner, tool: ToolState) => void
  finishSessionRestore: (owner: SessionRestoreOwner, committed: boolean) => void
  clearPendingSessionRestoreTool: (owner: SessionRestoreOwner) => void
  projectOrderByUser: Record<string, ProjectOrderState>
  setProjectOrderForUser: (userKey: string, order: ProjectOrderState) => void
  setProjectOrderStatusForUser: (userKey: string, status: ProjectOrderStatus, ids: number[]) => void
  clearProjectOrderForUser: (userKey: string) => void
}

const DEFAULT_TAB = 'draft'
const DEFAULT_TOOL = { name: '技术交底书完善' as ToolName, ver: '1.0 Basic' }
const EMPTY_PROJECT_ORDER: ProjectOrderState = {
  active: [],
  archived: [],
}

function normalizeToolState(tool: unknown): { name: ToolName; ver: string } {
  if (!tool || typeof tool !== 'object') {
    return DEFAULT_TOOL
  }

  const rawName = (tool as { name?: unknown }).name
  const rawVer = (tool as { ver?: unknown }).ver

  const name =
    typeof rawName === 'string' && rawName.trim().length > 0
      ? (rawName.trim() as ToolName)
      : DEFAULT_TOOL.name

  const ver =
    typeof rawVer === 'string' && rawVer.trim().length > 0 ? rawVer.trim() : DEFAULT_TOOL.ver

  return { name, ver }
}

function getToolKey(tool: ToolState): string {
  return `${tool.name}::${tool.ver}`
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      hydrated: typeof window === 'undefined',
      tab: DEFAULT_TAB,
      setTab: (tab) => {
        get().activeSessionRestoreCancel?.()
        set({ tab })
      },
      setTabForSessionRestore: (owner, tab) =>
        set((state) =>
          state.activeSessionRestoreOwner === owner
            ? { tab }
            : state,
        ),

      tool: DEFAULT_TOOL,
      setTool: (tool) => {
        get().activeSessionRestoreCancel?.()
        set({
          tool: normalizeToolState(tool),
          pendingSessionRestoreToolKey: null,
          pendingSessionRestoreToolOwner: null,
        })
      },

      managementTab: 'history',
      setManagementTab: (tab) => set({ managementTab: tab }),

      showVersionInfo: false,
      setShowVersionInfo: (show) => set({ showVersionInfo: show }),

      selectedProjectId: null as number | null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      selectedSessionId: null as number | null,
      setSelectedSessionId: (id) => set({ selectedSessionId: id }),
      isSessionOutputRestoring: false,
      activeSessionRestoreOwner: null,
      activeSessionRestoreCancel: null,
      sessionRestoreCommitRevision: 0,
      pendingSessionRestoreToolKey: null,
      pendingSessionRestoreToolOwner: null,
      beginSessionRestore: (createCancel) => {
        get().activeSessionRestoreCancel?.()
        const owner = Symbol('workspace-session-restore')
        const cancel = createCancel(owner)
        set({
          activeSessionRestoreOwner: owner,
          activeSessionRestoreCancel: cancel,
          isSessionOutputRestoring: true,
        })
        return owner
      },
      cancelActiveSessionRestore: () => {
        get().activeSessionRestoreCancel?.()
      },
      setToolForSessionRestore: (owner, tool) =>
        set((state) => {
          if (state.activeSessionRestoreOwner !== owner) {
            return state
          }
          const nextTool = normalizeToolState(tool)
          return {
            tool: nextTool,
            pendingSessionRestoreToolKey: getToolKey(nextTool),
            pendingSessionRestoreToolOwner: owner,
          }
        }),
      finishSessionRestore: (owner, committed) =>
        set((state) => {
          if (state.activeSessionRestoreOwner !== owner) {
            return state
          }
          return {
            activeSessionRestoreOwner: null,
            activeSessionRestoreCancel: null,
            isSessionOutputRestoring: false,
            sessionRestoreCommitRevision:
              state.sessionRestoreCommitRevision + (committed ? 1 : 0),
          }
        }),
      clearPendingSessionRestoreTool: (owner) =>
        set((state) => {
          if (state.pendingSessionRestoreToolOwner !== owner) {
            return state
          }
          return {
            pendingSessionRestoreToolKey: null,
            pendingSessionRestoreToolOwner: null,
          }
        }),
      projectOrderByUser: {},
      setProjectOrderForUser: (userKey, order) =>
        set((state) => {
          if (!userKey.trim()) {
            return state
          }
          return {
            projectOrderByUser: {
              ...state.projectOrderByUser,
              [userKey]: {
                active: [...new Set(order.active)],
                archived: [...new Set(order.archived)],
              },
            },
          }
        }),
      setProjectOrderStatusForUser: (userKey, status, ids) =>
        set((state) => {
          if (!userKey.trim()) {
            return state
          }

          const current = state.projectOrderByUser[userKey] ?? EMPTY_PROJECT_ORDER
          return {
            projectOrderByUser: {
              ...state.projectOrderByUser,
              [userKey]: {
                ...current,
                [status]: [...new Set(ids)],
              },
            },
          }
        }),
      clearProjectOrderForUser: (userKey) =>
        set((state) => {
          if (!userKey.trim() || !state.projectOrderByUser[userKey]) {
            return state
          }
          const next = { ...state.projectOrderByUser }
          delete next[userKey]
          return { projectOrderByUser: next }
        }),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        tab: state.tab,
        tool: state.tool,
        managementTab: state.managementTab,
        showVersionInfo: state.showVersionInfo,
        selectedProjectId: state.selectedProjectId,
        projectOrderByUser: state.projectOrderByUser,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Failed to rehydrate workspace store', error)
        }
        queueMicrotask(() => {
          const current = useWorkspaceStore.getState()
          const nextTab =
            typeof current.tab === 'string' && current.tab.trim().length > 0
              ? current.tab
              : DEFAULT_TAB
          const nextTool = normalizeToolState(current.tool)

          useWorkspaceStore.setState({
            hydrated: true,
            tab: nextTab,
            tool: nextTool,
          })
        })
      },
    },
  ),
)
