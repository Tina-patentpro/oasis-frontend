import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_SESSION_NAME = '未命名对话'

export type NamingMode =
  | 'date'
  | 'task-date'
  | 'project-date'
  | 'project-task-date'
  | 'project-task-version'

export const DEFAULT_NAMING_MODE: NamingMode = 'project-task-date'

export type HistoryFieldKey = 'title' | 'completedAt' | 'model'
export const DEFAULT_HISTORY_FIELDS: HistoryFieldKey[] = ['title', 'completedAt']

export const DEFAULT_CUSTOMER_LEVELS = ['VIP客户', '客户', '新客户']
export const DEFAULT_COOPERATION_TYPES = [
  '技术交底书撰写',
  '专利检索',
  '术语校验',
  '全流程服务',
  '其他',
]
export const DEFAULT_PROJECT_STAGES = ['撰写', '校验', '检索', '审核', '完成']
export const DEFAULT_PROJECT_STATUSES = ['进行中', '已暂停', '待审核', '已完成']

interface ConversationSettingsStore {
  hydrated: boolean
  defaultSessionName: string
  namingMode: NamingMode
  historyFields: HistoryFieldKey[]
  customerLevels: string[]
  cooperationTypes: string[]
  projectStages: string[]
  projectStatuses: string[]
  setDefaultSessionName: (name: string) => void
  clearDefaultSessionName: () => void
  setNamingMode: (mode: NamingMode) => void
  setHistoryFields: (fields: HistoryFieldKey[]) => void
  setCustomerLevels: (levels: string[]) => void
  setCooperationTypes: (types: string[]) => void
  setProjectStages: (stages: string[]) => void
  setProjectStatuses: (statuses: string[]) => void
  resetSettings: () => void
}

export const useConversationSettingsStore = create<ConversationSettingsStore>()(
  persist(
    (set) => ({
      hydrated: typeof window === 'undefined',
      defaultSessionName: DEFAULT_SESSION_NAME,
      namingMode: DEFAULT_NAMING_MODE,
      historyFields: DEFAULT_HISTORY_FIELDS,
      customerLevels: DEFAULT_CUSTOMER_LEVELS,
      cooperationTypes: DEFAULT_COOPERATION_TYPES,
      projectStages: DEFAULT_PROJECT_STAGES,
      projectStatuses: DEFAULT_PROJECT_STATUSES,
      setDefaultSessionName: (name: string) => {
        set({ defaultSessionName: name.trim() })
      },
      clearDefaultSessionName: () => {
        set({ defaultSessionName: '' })
      },
      setNamingMode: (mode: NamingMode) => {
        set({ namingMode: mode })
      },
      setHistoryFields: (fields: HistoryFieldKey[]) => {
        set({ historyFields: fields })
      },
      setCustomerLevels: (levels: string[]) => {
        set({ customerLevels: levels })
      },
      setCooperationTypes: (types: string[]) => {
        set({ cooperationTypes: types })
      },
      setProjectStages: (stages: string[]) => {
        set({ projectStages: stages })
      },
      setProjectStatuses: (statuses: string[]) => {
        set({ projectStatuses: statuses })
      },
      resetSettings: () => {
        set({
          defaultSessionName: DEFAULT_SESSION_NAME,
          namingMode: DEFAULT_NAMING_MODE,
          historyFields: DEFAULT_HISTORY_FIELDS,
          customerLevels: DEFAULT_CUSTOMER_LEVELS,
          cooperationTypes: DEFAULT_COOPERATION_TYPES,
          projectStages: DEFAULT_PROJECT_STAGES,
          projectStatuses: DEFAULT_PROJECT_STATUSES,
        })
      },
    }),
    {
      name: 'conversation-settings',
      partialize: (state) => ({
        defaultSessionName: state.defaultSessionName,
        namingMode: state.namingMode,
        historyFields: state.historyFields,
        customerLevels: state.customerLevels,
        cooperationTypes: state.cooperationTypes,
        projectStages: state.projectStages,
        projectStatuses: state.projectStatuses,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Failed to rehydrate conversation settings store', error)
        }
        queueMicrotask(() => {
          useConversationSettingsStore.setState({ hydrated: true })
        })
      },
      version: 4,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState
        }

        type PartialSettings = Partial<ConversationSettingsStore> & {
          state?: Partial<ConversationSettingsStore>
        }

        const stateContainer = persistedState as PartialSettings
        const innerState = stateContainer.state ?? stateContainer

        if (innerState && innerState.namingMode === undefined) {
          innerState.namingMode = DEFAULT_NAMING_MODE
        }

        if (innerState && innerState.historyFields === undefined) {
          innerState.historyFields = DEFAULT_HISTORY_FIELDS
        }

        if (innerState && innerState.customerLevels === undefined) {
          innerState.customerLevels = DEFAULT_CUSTOMER_LEVELS
        }

        if (innerState && innerState.cooperationTypes === undefined) {
          innerState.cooperationTypes = DEFAULT_COOPERATION_TYPES
        }

        if (innerState && innerState.projectStages === undefined) {
          innerState.projectStages = DEFAULT_PROJECT_STAGES
        }

        if (innerState && innerState.projectStatuses === undefined) {
          innerState.projectStatuses = DEFAULT_PROJECT_STATUSES
        }

        return persistedState
      },
    },
  ),
)
