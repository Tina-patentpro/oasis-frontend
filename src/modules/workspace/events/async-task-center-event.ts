export const ASYNC_TASK_CENTER_REMINDER_EVENT = 'async-task-center-reminder'

interface AsyncTaskCenterReminderDetail {
  taskKey: string
  toolName: string
  folderId: number
  submittedAtMs: number
}

export function dispatchAsyncTaskCenterReminder(detail: AsyncTaskCenterReminderDetail): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<AsyncTaskCenterReminderDetail>(ASYNC_TASK_CENTER_REMINDER_EVENT, {
      detail,
    }),
  )
}
