export interface HistoryConfirmCallback {
  (data: string[], rawItems?: Record<string, unknown>[]): void
}

export interface LocalHistoryDialogController<TOptions = unknown> {
  isOpen: boolean
  open: (options?: TOptions) => void
  close: () => void
  setOpen: (open: boolean) => void
  options: TOptions | null
}

export function buildHistoryDataConfirmHandler(params: {
  getPendingHistoryConfirm: () => HistoryConfirmCallback | null
  clearPendingHistoryConfirm: () => void
  onChatHistoryConfirm: (data: string[]) => void
}) {
  const { getPendingHistoryConfirm, clearPendingHistoryConfirm, onChatHistoryConfirm } = params

  return (data: string[], rawItems?: Record<string, unknown>[]) => {
    const pendingHistoryConfirm = getPendingHistoryConfirm()

    if (pendingHistoryConfirm) {
      pendingHistoryConfirm(data, rawItems)
      clearPendingHistoryConfirm()
      return
    }

    onChatHistoryConfirm(data)
  }
}

export function wrapLocalHistoryDialogController<TOptions>(
  dialog: LocalHistoryDialogController<TOptions>,
  clearPendingHistoryConfirm: () => void,
): LocalHistoryDialogController<TOptions> {
  return {
    ...dialog,
    close: () => {
      clearPendingHistoryConfirm()
      dialog.close()
    },
    setOpen: (open: boolean) => {
      if (!open) {
        clearPendingHistoryConfirm()
      }
      dialog.setOpen(open)
    },
  }
}
