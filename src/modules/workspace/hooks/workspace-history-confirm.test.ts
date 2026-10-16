import { describe, expect, jest, test } from '@jest/globals'

import {
  buildHistoryDataConfirmHandler,
  wrapLocalHistoryDialogController,
} from './workspace-history-confirm'

describe('workspace-history-confirm', () => {
  test('falls back to chat history confirm after the local-history dialog clears the pending callback', () => {
    const chatHistoryConfirm = jest.fn()
    const staleLocalHistoryConfirm = jest.fn()
    let pendingHistoryConfirm:
      | ((data: string[], rawItems?: Record<string, unknown>[]) => void)
      | null = staleLocalHistoryConfirm

    const localHistoryDialog = wrapLocalHistoryDialogController(
      {
        isOpen: true,
        open: jest.fn(),
        close: jest.fn(),
        setOpen: jest.fn(),
        options: { sessions: [] },
      },
      () => {
        pendingHistoryConfirm = null
      },
    )

    const handleHistoryDataConfirm = buildHistoryDataConfirmHandler({
      getPendingHistoryConfirm: () => pendingHistoryConfirm,
      clearPendingHistoryConfirm: () => {
        pendingHistoryConfirm = null
      },
      onChatHistoryConfirm: chatHistoryConfirm,
    })

    localHistoryDialog.close()
    handleHistoryDataConfirm(['chat-history-item'])

    expect(staleLocalHistoryConfirm).not.toHaveBeenCalled()
    expect(chatHistoryConfirm).toHaveBeenCalledWith(['chat-history-item'])
  })

  test('clears the pending callback when local-history dialog closes through setOpen(false)', () => {
    const setOpen = jest.fn()
    const clearPendingHistoryConfirm = jest.fn()

    const localHistoryDialog = wrapLocalHistoryDialogController(
      {
        isOpen: true,
        open: jest.fn(),
        close: jest.fn(),
        setOpen,
        options: { sessions: [] },
      },
      clearPendingHistoryConfirm,
    )

    localHistoryDialog.setOpen(false)

    expect(clearPendingHistoryConfirm).toHaveBeenCalledTimes(1)
    expect(setOpen).toHaveBeenCalledWith(false)
  })
})
