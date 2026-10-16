import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from '@jest/globals'

import { useUIStore } from '@/stores/useUIStore'

import { GlobalToast } from './GlobalToast'

describe('GlobalToast', () => {
  afterEach(() => {
    act(() => {
      useUIStore.getState().hideToast()
    })
  })

  test('renders useUIStore feedback as an accessible live status', () => {
    render(<GlobalToast />)

    act(() => {
      useUIStore.getState().showToast('推荐码已复制到剪贴板！', 60_000)
    })

    expect(screen.getByRole('status')).toHaveTextContent('推荐码已复制到剪贴板！')
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true')
    expect(screen.getByRole('status')).toHaveClass('pointer-events-none')
    expect(screen.getByRole('status')).toHaveClass(
      'top-[calc(env(safe-area-inset-top)+11rem)]',
    )
    expect(screen.getByRole('status')).toHaveClass('bottom-auto')
    expect(screen.getByRole('status')).toHaveClass('sm:top-auto')
    expect(screen.getByRole('status')).toHaveClass('sm:bottom-4')
    expect(screen.getByRole('status')).toHaveClass('sm:right-4')
  })
})
