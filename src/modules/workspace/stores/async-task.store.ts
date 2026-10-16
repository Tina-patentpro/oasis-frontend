import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { dispatchSessionGenerationFinished } from '@/modules/workspace/events/session-generation-event'
import type { WorkflowOutputTextField } from '@/utils/workflow-output-text'

export interface AsyncTaskStatus {
  taskKey: string
  apiDetailId: number
  apiName: string
  folderId: number
  progressPercent: number
  currentStepName: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  createdAt: number
  toolName?: string
  error_message?: string
  outputFields?: WorkflowOutputTextField[]
}

export interface AsyncTaskStore {
  tasks: Record<string, AsyncTaskStatus>
  daemonHeartbeatAt: number | null

  // Actions
  addAsyncTask: (task: Omit<AsyncTaskStatus, 'createdAt'>) => void
  updateTaskProgress: (
    taskKey: string,
    updates: Partial<
      Pick<AsyncTaskStatus, 'progressPercent' | 'currentStepName' | 'status' | 'error_message'>
    >,
  ) => void
  removeAsyncTask: (taskKey: string) => void
  clearCompletedTasks: () => void
  clearAll: () => void
  touchDaemonHeartbeat: () => void
  clearDaemonHeartbeat: () => void
}

export const useAsyncTaskStore = create<AsyncTaskStore>()(
  persist(
    (set) => ({
      tasks: {},
      daemonHeartbeatAt: null as number | null,

      addAsyncTask: (task) =>
        set((state) => ({
          tasks: {
            ...state.tasks,
            [task.taskKey]: {
              ...task,
              createdAt: Date.now(),
            },
          },
        })),

      updateTaskProgress: (taskKey, updates) =>
        set((state) => {
          const existingTask = state.tasks[taskKey]
          if (!existingTask) return state // 不存在则忽略

          const nextStatus = updates.status ?? existingTask.status
          const shouldClearError =
            (nextStatus === 'queued' || nextStatus === 'running' || nextStatus === 'completed') &&
            !Object.prototype.hasOwnProperty.call(updates, 'error_message')
          const shouldDispatchCompletion =
            (existingTask.status === 'queued' || existingTask.status === 'running') &&
            nextStatus === 'completed'

          if (shouldDispatchCompletion) {
            dispatchSessionGenerationFinished({
              folderId: existingTask.folderId ?? 0,
              source: 'async',
              taskKey,
              finishedAt: Date.now(),
            })
          }

          return {
            tasks: {
              ...state.tasks,
              [taskKey]: {
                ...existingTask,
                ...updates,
                ...(shouldClearError ? { error_message: undefined } : {}),
              },
            },
          }
        }),

      removeAsyncTask: (taskKey) =>
        set((state) => {
          const { [taskKey]: _, ...remainingTasks } = state.tasks
          return { tasks: remainingTasks }
        }),

      clearCompletedTasks: () =>
        set((state) => {
          const activeTasks: Record<string, AsyncTaskStatus> = {}
          for (const [key, task] of Object.entries(state.tasks)) {
            if (task.status !== 'completed') {
              activeTasks[key] = task
            }
          }
          return { tasks: activeTasks }
        }),

      clearAll: () =>
        set(() => ({
          tasks: {},
          daemonHeartbeatAt: null,
        })),

      touchDaemonHeartbeat: () =>
        set(() => ({
          daemonHeartbeatAt: Date.now(),
        })),

      clearDaemonHeartbeat: () =>
        set(() => ({
          daemonHeartbeatAt: null,
        })),
    }),
    {
      name: 'async-task-store',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name)
        },
      },
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return
        }
        state.daemonHeartbeatAt = null
      },
    },
  ),
)
