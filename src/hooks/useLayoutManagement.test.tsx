import { act, renderHook } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import { useLayoutManagement } from './useLayoutManagement'

type AddEventListenerCall = [string, unknown, unknown?]

function setWindowWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

describe('useLayoutManagement', () => {
  test('starts touch drag without preventing default and registers non-passive move cleanup listeners', () => {
    setWindowWidth(1280)
    const setChatWidth = jest.fn<(width: number) => void>()
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

    const { result, unmount } = renderHook(() =>
      useLayoutManagement('auto', true, 448, setChatWidth, 320, 'quarter'),
    )
    const preventDefault = jest.fn()

    act(() => {
      result.current.startChatDrag({
        touches: [{ clientX: 900 }],
        preventDefault,
      } as unknown as React.TouchEvent)
    })

    expect(preventDefault).not.toHaveBeenCalled()
    const addEventCalls = addEventListenerSpy.mock.calls as unknown as AddEventListenerCall[]
    expect(addEventCalls).toEqual(
      expect.arrayContaining([
        ['touchmove', expect.any(Function), { passive: false }],
        ['touchend', expect.any(Function)],
        ['touchcancel', expect.any(Function)],
      ]),
    )

    unmount()
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  test('resizes during touch move and stops after touch cancel', () => {
    setWindowWidth(1280)
    const setChatWidth = jest.fn<(width: number) => void>()
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

    const { result } = renderHook(() =>
      useLayoutManagement('auto', true, 448, setChatWidth, 320, 'quarter'),
    )

    act(() => {
      result.current.startChatDrag({
        touches: [{ clientX: 900 }],
        preventDefault: jest.fn(),
      } as unknown as React.TouchEvent)
    })

    const addEventCalls = addEventListenerSpy.mock.calls as unknown as AddEventListenerCall[]
    const touchMove = addEventCalls.find(
      ([eventName]) => eventName === 'touchmove',
    )?.[1] as ((event: TouchEvent) => void) | undefined
    const touchCancel = addEventCalls.find(
      ([eventName]) => eventName === 'touchcancel',
    )?.[1] as (() => void) | undefined

    if (!touchMove || !touchCancel) {
      throw new Error('touch listeners were not registered')
    }

    const preventDefault = jest.fn()
    act(() => {
      touchMove({
        cancelable: true,
        preventDefault,
        touches: [{ clientX: 980 }],
      } as unknown as TouchEvent)
    })

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(setChatWidth).toHaveBeenLastCalledWith(368)

    act(() => {
      touchCancel()
      touchMove({
        cancelable: true,
        preventDefault: jest.fn(),
        touches: [{ clientX: 1000 }],
      } as unknown as TouchEvent)
    })

    expect(setChatWidth).toHaveBeenCalledTimes(1)
    addEventListenerSpy.mockRestore()
  })

  test('uses the latest local chat width for consecutive keyboard resize steps', () => {
    setWindowWidth(1600)
    const setChatWidth = jest.fn<(width: number) => void>()

    const { result } = renderHook(() =>
      useLayoutManagement('auto', true, 420, setChatWidth, 320, 'quarter'),
    )

    act(() => {
      result.current.resizeChatBy(24)
      result.current.resizeChatBy(24)
    })

    expect(setChatWidth).toHaveBeenNthCalledWith(1, 444)
    expect(setChatWidth).toHaveBeenNthCalledWith(2, 468)
  })
})
