import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ModelPreferenceState {
  groupVisibility: Record<string, boolean>
  toolVisibility: Record<string, boolean>
  modelVisibility: Record<string, Record<string, boolean>>
  chatTabVisibility: Record<string, boolean>
  setGroupVisibility: (groupKey: string, visible: boolean) => void
  setToolVisibility: (toolName: string, visible: boolean) => void
  setModelVisibility: (toolName: string, modelId: string, visible: boolean) => void
  setModelsForTool: (toolName: string, modelIds: string[], visible: boolean) => void
  setChatTabVisibility: (tabKey: string, visible: boolean) => void
  setChatTabsVisibility: (tabKeys: string[], visible: boolean) => void
  reset: () => void
}

const createInitialState = () => ({
  groupVisibility: {} as Record<string, boolean>,
  toolVisibility: {} as Record<string, boolean>,
  modelVisibility: {} as Record<string, Record<string, boolean>>,
  chatTabVisibility: {} as Record<string, boolean>,
})

export const useModelPreferenceStore = create<ModelPreferenceState>()(
  persist(
    (set) => ({
      ...createInitialState(),
      setGroupVisibility: (groupKey, visible) =>
        set((state) => {
          const next = { ...state.groupVisibility }
          if (visible) {
            delete next[groupKey]
          } else {
            next[groupKey] = false
          }
          return { groupVisibility: next }
        }),
      setToolVisibility: (toolName, visible) =>
        set((state) => {
          const next = { ...state.toolVisibility }
          if (visible) {
            delete next[toolName]
          } else {
            next[toolName] = false
          }
          return { toolVisibility: next }
        }),
      setModelVisibility: (toolName, modelId, visible) =>
        set((state) => {
          const currentForTool = state.modelVisibility[toolName] ?? {}
          const nextForTool = { ...currentForTool }

          if (visible) {
            delete nextForTool[modelId]
          } else {
            nextForTool[modelId] = false
          }

          const next = { ...state.modelVisibility }
          if (Object.keys(nextForTool).length === 0) {
            delete next[toolName]
          } else {
            next[toolName] = nextForTool
          }
          return { modelVisibility: next }
        }),
      setModelsForTool: (toolName, modelIds, visible) =>
        set((state) => {
          const base = state.modelVisibility[toolName] ?? {}
          const nextForTool = { ...base }
          modelIds.forEach((id) => {
            if (visible) {
              delete nextForTool[id]
            } else {
              nextForTool[id] = false
            }
          })
          const next = { ...state.modelVisibility }
          if (Object.keys(nextForTool).length === 0) {
            delete next[toolName]
          } else {
            next[toolName] = nextForTool
          }
          return { modelVisibility: next }
        }),
      setChatTabVisibility: (tabKey, visible) =>
        set((state) => {
          const next = { ...state.chatTabVisibility }
          if (visible) {
            delete next[tabKey]
          } else {
            next[tabKey] = false
          }
          return { chatTabVisibility: next }
        }),
      setChatTabsVisibility: (tabKeys, visible) =>
        set((state) => {
          const next = { ...state.chatTabVisibility }
          tabKeys.forEach((key) => {
            if (visible) {
              delete next[key]
            } else {
              next[key] = false
            }
          })
          return { chatTabVisibility: next }
        }),
      reset: () => set(createInitialState()),
    }),
    {
      name: 'model-preference-storage',
      partialize: (state) => ({
        groupVisibility: state.groupVisibility,
        toolVisibility: state.toolVisibility,
        modelVisibility: state.modelVisibility,
        chatTabVisibility: state.chatTabVisibility,
      }),
    },
  ),
)
