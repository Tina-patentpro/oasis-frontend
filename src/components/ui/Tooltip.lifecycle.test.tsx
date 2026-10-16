import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('@/stores', () => ({
  useThemeStore: (selector: (state: { currentTheme: string }) => unknown) =>
    selector({ currentTheme: 'light' }),
}))

import { useWorkspaceUIStore } from '@/modules/workspace/stores/useWorkspaceUIStore'

import { Tooltip } from './Tooltip'

afterEach(() => {
  jest.useRealTimers()
})

describe('Tooltip lifecycle', () => {
  test('keeps a quickly reopened tooltip visible after the old close animation delay', () => {
    jest.useFakeTimers()
    useWorkspaceUIStore.setState({ tooltipsEnabled: true })

    render(
      <Tooltip content="操作说明" delay={0}>
        <button type="button">查看说明</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: '查看说明' })
    fireEvent.mouseEnter(trigger)
    act(() => {
      jest.advanceTimersByTime(0)
    })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.mouseLeave(trigger)
    act(() => {
      jest.advanceTimersByTime(80)
    })
    fireEvent.mouseEnter(trigger)
    act(() => {
      jest.advanceTimersByTime(0)
      jest.advanceTimersByTime(80)
    })

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
})
