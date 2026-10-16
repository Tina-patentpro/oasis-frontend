import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import { useWorkspaceChatWidthSync } from './useWorkspaceChatWidthSync'

function setWindowWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('useWorkspaceChatWidthSync', () => {
  test('uses the shared full-width bounds when the sidebar is visible', async () => {
    setWindowWidth(1280)
    const setChatWidth = jest.fn<(width: number) => void>()

    renderHook(() =>
      useWorkspaceChatWidthSync({
        chatWidth: 420,
        setChatWidth,
        chatMode: 'full',
        showSidebar: true,
        leftSidebarWidth: 320,
      }),
    )

    await waitFor(() => {
      expect(setChatWidth).toHaveBeenCalledWith(928)
    })
  })

  test('restores the preferred quarter width after a passive viewport shrink', async () => {
    setWindowWidth(900)
    const setChatWidth = jest.fn<(width: number) => void>()

    const { rerender } = renderHook(
      ({ chatWidth }) =>
        useWorkspaceChatWidthSync({
          chatWidth,
          setChatWidth,
          chatMode: 'quarter',
          showSidebar: true,
          leftSidebarWidth: 320,
        }),
      {
        initialProps: {
          chatWidth: 600,
        },
      },
    )

    await waitFor(() => {
      expect(setChatWidth).toHaveBeenCalledWith(360)
    })

    setChatWidth.mockClear()
    rerender({ chatWidth: 360 })
    setWindowWidth(1600)

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    await waitFor(() => {
      expect(setChatWidth).toHaveBeenCalledWith(600)
    })
  })

  test('uses the explicit preferred width without overwriting it during compact adjustment', async () => {
    setWindowWidth(320)
    const setChatWidth = jest.fn<(width: number) => void>()
    const setAutoAdjustedChatWidth = jest.fn<(width: number) => void>()

    renderHook(() =>
      useWorkspaceChatWidthSync({
        chatWidth: 612,
        preferredChatWidth: 612,
        setChatWidth,
        setAutoAdjustedChatWidth,
        chatMode: 'quarter',
        showSidebar: false,
        leftSidebarWidth: 320,
      }),
    )

    await waitFor(() => {
      expect(setAutoAdjustedChatWidth).toHaveBeenCalledWith(256)
    })
    expect(setChatWidth).not.toHaveBeenCalled()
  })
})
