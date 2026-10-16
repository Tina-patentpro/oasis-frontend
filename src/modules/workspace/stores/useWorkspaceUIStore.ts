import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { SettingsPage } from '@/components/settings/constants'

export type ChatMode = 'off' | 'quarter' | 'full'
export type CompactWorkspaceSurface = 'sidebar' | 'workflow' | 'chat'

const DEFAULT_CHAT_PANEL_WIDTH = 453
const MAX_PREFERRED_CHAT_PANEL_WIDTH = 4096

interface UIStore {
  hydrated: boolean
  // 侧边栏状态
  showSidebar: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // 对话面板状态
  chatOpen: boolean
  chatMode: ChatMode
  toggleChat: () => void
  setChatOpen: (open: boolean) => void
  setChatMode: (mode: ChatMode) => void
  setCompactSurface: (surface: CompactWorkspaceSurface) => void
  normalizeCompactSurface: () => void
  activateSessionSurface: (
    surface: 'chat' | 'workflow',
    options: { compact: boolean },
  ) => void

  // 对话框状态
  userMenuOpen: boolean
  setUserMenuOpen: (open: boolean) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  settingsPage: SettingsPage
  setSettingsPage: (page: SettingsPage) => void
  releaseNotesOpen: boolean
  setReleaseNotesOpen: (open: boolean) => void
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
  customerServiceOpen: boolean
  setCustomerServiceOpen: (open: boolean) => void
  quickCreateProjectOpen: boolean
  setQuickCreateProjectOpen: (open: boolean) => void
  rewardSuggestionOpen: boolean
  setRewardSuggestionOpen: (open: boolean) => void
  historyDialogOpen: boolean
  setHistoryDialogOpen: (open: boolean) => void
  historyDialogOptions: { projectId?: number; type?: string; title?: string } | null
  setHistoryDialogOptions: (
    options: { projectId?: number; type?: string; title?: string } | null,
  ) => void
  localHistoryFilesDialogOpen: boolean
  setLocalHistoryFilesDialogOpen: (open: boolean) => void
  localHistoryFilesDialogOptions: {
    projectId?: number
    title?: string
    sessions?: import('@/types/api').Session[]
  } | null
  setLocalHistoryFilesDialogOptions: (
    options: {
      projectId?: number
      title?: string
      sessions?: import('@/types/api').Session[]
    } | null,
  ) => void

  // 面板宽度
  leftWidth: number
  setLeftWidth: (width: number) => void
  chatWidth: number
  preferredChatWidth: number
  setChatWidth: (width: number) => void
  setAutoAdjustedChatWidth: (width: number) => void

  // 布局模式
  layoutMode: 'auto' | 'vertical' | 'contrast'
  setLayoutMode: (mode: 'auto' | 'vertical' | 'contrast') => void

  // Toast通知
  toast: string | null
  showToast: (message: string) => void
  hideToast: () => void

  // Tooltip 开关
  tooltipsEnabled: boolean
  setTooltipsEnabled: (enabled: boolean) => void

  // Internal: used to save/restore chat state during contrast mode transitions
  _previousChatMode?: ChatMode
  _previousChatOpen?: boolean
}

let toastTimeoutId: ReturnType<typeof setTimeout> | null = null

function scheduleUIStorePatch(patches: Partial<UIStore>): void {
  queueMicrotask(() => {
    useWorkspaceUIStore.setState(patches)
  })
}

function normalizePreferredChatWidth(value: unknown): number {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 360 &&
    value <= MAX_PREFERRED_CHAT_PANEL_WIDTH
    ? Math.round(value)
    : DEFAULT_CHAT_PANEL_WIDTH
}

function getCompactSurfaceState(
  state: Pick<UIStore, 'layoutMode'>,
  surface: CompactWorkspaceSurface,
): Pick<UIStore, 'showSidebar' | 'chatMode' | 'chatOpen'> {
  if (state.layoutMode === 'contrast') {
    return { showSidebar: false, chatMode: 'off', chatOpen: false }
  }

  if (surface === 'sidebar') {
    return { showSidebar: true, chatMode: 'off', chatOpen: false }
  }
  if (surface === 'chat') {
    return { showSidebar: false, chatMode: 'full', chatOpen: true }
  }
  return { showSidebar: false, chatMode: 'off', chatOpen: false }
}

export const useWorkspaceUIStore = create<UIStore>()(
  persist(
    (set) => ({
      hydrated: typeof window === 'undefined',
      // 侧边栏
      showSidebar: true,
      toggleSidebar: () =>
        set((state) =>
          state.layoutMode === 'contrast'
            ? { showSidebar: false }
            : { showSidebar: !state.showSidebar },
        ),
      setSidebarOpen: (open) =>
        set((state) =>
          state.layoutMode === 'contrast' ? { showSidebar: false } : { showSidebar: open },
        ),

      // 对话面板
      chatOpen: true,
      chatMode: 'quarter',
      toggleChat: () =>
        set((state) => {
          if (state.layoutMode === 'contrast') {
            return { chatMode: 'off', chatOpen: false }
          }
          const sequence: ChatMode[] = ['off', 'quarter', 'full']
          const currentIndex = sequence.indexOf(state.chatMode)
          const nextMode = sequence[(currentIndex + 1) % sequence.length]
          const restoringSidebarFromFull = state.chatMode === 'full' && nextMode !== 'full'
          return {
            chatMode: nextMode,
            chatOpen: nextMode !== 'off',
            ...(nextMode === 'full' ? { showSidebar: false } : {}),
            ...(restoringSidebarFromFull ? { showSidebar: true } : {}),
          }
        }),
      setChatOpen: (open) =>
        set((state) =>
          state.layoutMode === 'contrast'
            ? { chatOpen: false, chatMode: 'off' }
            : {
                chatOpen: open,
                chatMode: open ? (state.chatMode === 'off' ? 'quarter' : state.chatMode) : 'off',
              },
        ),
      setChatMode: (mode) =>
        set((state) => {
          if (state.layoutMode === 'contrast') {
            return { chatMode: 'off', chatOpen: false }
          }
          const restoringSidebarFromFull = state.chatMode === 'full' && mode !== 'full'
          return {
            chatMode: mode,
            chatOpen: mode !== 'off',
            ...(mode === 'full' ? { showSidebar: false } : {}),
            ...(restoringSidebarFromFull ? { showSidebar: true } : {}),
          }
        }),
      setCompactSurface: (surface) =>
        set((state) => getCompactSurfaceState(state, surface)),
      normalizeCompactSurface: () =>
        set((state) => {
          const surface: CompactWorkspaceSurface = state.showSidebar
            ? 'sidebar'
            : state.chatMode === 'off'
              ? 'workflow'
              : 'chat'
          return getCompactSurfaceState(state, surface)
        }),
      activateSessionSurface: (surface, { compact }) =>
        set((state) => {
          if (compact) {
            return getCompactSurfaceState(state, surface)
          }
          if (state.layoutMode === 'contrast') {
            return { chatMode: 'off', chatOpen: false, showSidebar: false }
          }
          if (surface === 'workflow') {
            if (state.chatMode !== 'full') {
              return {}
            }
            return {
              chatMode: 'off',
              chatOpen: false,
              showSidebar: true,
            }
          }
          if (state.chatMode !== 'off') {
            return {}
          }
          return {
            chatMode: 'quarter',
            chatOpen: true,
            showSidebar: state.showSidebar,
          }
        }),

      // 对话框
      userMenuOpen: false,
      setUserMenuOpen: (open) => set({ userMenuOpen: open }),
      settingsOpen: false,
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      settingsPage: 'profile',
      setSettingsPage: (page) => set({ settingsPage: page }),
      releaseNotesOpen: false,
      setReleaseNotesOpen: (open) => set({ releaseNotesOpen: open }),
      helpOpen: false,
      setHelpOpen: (open) => set({ helpOpen: open }),
      customerServiceOpen: false,
      setCustomerServiceOpen: (open) => set({ customerServiceOpen: open }),
      quickCreateProjectOpen: false,
      setQuickCreateProjectOpen: (open) => set({ quickCreateProjectOpen: open }),
      rewardSuggestionOpen: false,
      setRewardSuggestionOpen: (open) => set({ rewardSuggestionOpen: open }),
      historyDialogOpen: false,
      setHistoryDialogOpen: (open) => set({ historyDialogOpen: open }),
      historyDialogOptions: null as { projectId?: number; type?: string; title?: string } | null,
      setHistoryDialogOptions: (options) => set({ historyDialogOptions: options }),
      localHistoryFilesDialogOpen: false,
      setLocalHistoryFilesDialogOpen: (open) => set({ localHistoryFilesDialogOpen: open }),
      localHistoryFilesDialogOptions: null as {
        projectId?: number
        title?: string
        sessions?: import('@/types/api').Session[]
      } | null,
      setLocalHistoryFilesDialogOptions: (options) =>
        set({ localHistoryFilesDialogOptions: options }),

      // 面板宽度
      leftWidth: 380,
      setLeftWidth: (width) => set({ leftWidth: width }),
      chatWidth: DEFAULT_CHAT_PANEL_WIDTH,
      preferredChatWidth: DEFAULT_CHAT_PANEL_WIDTH,
      setChatWidth: (width) => set({ chatWidth: width, preferredChatWidth: width }),
      setAutoAdjustedChatWidth: (width) => set({ chatWidth: width }),

      // 布局
      layoutMode: 'auto',
      setLayoutMode: (mode) => {
        set((state) => {
          // If entering contrast mode, save current chat state if it's not off
          if (mode === 'contrast' && state.layoutMode !== 'contrast') {
            useWorkspaceUIStore.setState({
              _previousChatMode: state.chatMode,
              _previousChatOpen: state.chatOpen,
            })
            return {
              layoutMode: mode,
              showSidebar: false,
              chatOpen: false,
              chatMode: 'off',
            }
          }
          // If exiting contrast mode, restore previous chat state
          if (state.layoutMode === 'contrast' && mode !== 'contrast') {
            const prevState = useWorkspaceUIStore.getState()
            const restoredChatMode =
              prevState._previousChatMode && prevState._previousChatMode !== 'off'
                ? prevState._previousChatMode
                : 'quarter'
            return {
              layoutMode: mode,
              chatOpen: true,
              chatMode: restoredChatMode,
            }
          }
          return { layoutMode: mode }
        })
      },

      // Toast
      toast: null as string | null,
      showToast: (message) => {
        if (toastTimeoutId) {
          clearTimeout(toastTimeoutId)
        }

        set({ toast: message })
        toastTimeoutId = setTimeout(() => {
          set({ toast: null })
          toastTimeoutId = null
        }, 1600)
      },
      hideToast: () => {
        if (toastTimeoutId) {
          clearTimeout(toastTimeoutId)
          toastTimeoutId = null
        }
        set({ toast: null })
      },

      // Tooltip 开关
      tooltipsEnabled: true,
      setTooltipsEnabled: (enabled) => set({ tooltipsEnabled: enabled }),
    }),
    {
      name: 'workspace-ui-storage',
      version: 1,
      migrate: (persistedState, version) => {
        const stored =
          persistedState && typeof persistedState === 'object'
            ? (persistedState as Record<string, unknown>)
            : {}
        if (version < 1) {
          const { chatWidth: legacyChatWidth, ...rest } = stored
          return {
            ...rest,
            preferredChatWidth: normalizePreferredChatWidth(legacyChatWidth),
          }
        }
        return stored
      },
      partialize: (state) => ({
        showSidebar: state.showSidebar,
        chatOpen: state.chatOpen,
        chatMode: state.chatMode,
        leftWidth: state.leftWidth,
        preferredChatWidth: state.preferredChatWidth,
        layoutMode: state.layoutMode,
        tooltipsEnabled: state.tooltipsEnabled,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate workspace ui store', error)
        }
        const patches: Partial<UIStore> = { hydrated: true }

        // Validate persisted layout values as hydration completes.
        // The patch is applied in a microtask so the exported store binding is initialized first.
        if (state && typeof window !== 'undefined') {
          const viewportWidth = window.innerWidth

          const preferredChatWidth = normalizePreferredChatWidth(state.preferredChatWidth)
          patches.preferredChatWidth = preferredChatWidth
          patches.chatWidth = preferredChatWidth

          // leftWidth: must be at least 280 and not exceed half the viewport
          if (state.leftWidth < 280 || state.leftWidth > viewportWidth / 2) {
            patches.leftWidth = Math.min(380, Math.round(viewportWidth / 3))
          }

          // chatMode: must be a valid value
          if (!['off', 'quarter', 'full'].includes(state.chatMode)) {
            patches.chatMode = 'quarter'
            patches.chatOpen = true
          }

          // layoutMode: must be a valid value
          if (!['auto', 'vertical', 'contrast'].includes(state.layoutMode)) {
            patches.layoutMode = 'auto'
          }
        }

        scheduleUIStorePatch(patches)
      },
    },
  ),
)
