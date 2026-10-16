import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { SearchInput } from '../SearchInput'

describe('SearchInput', () => {
  test('uses the placeholder as the default accessible name', () => {
    render(<SearchInput value="" onChange={jest.fn()} placeholder="搜索项目" />)

    expect(screen.getByRole('textbox', { name: '搜索项目' })).toBeInTheDocument()
  })

  test('keeps a caller-provided accessible name', () => {
    render(<SearchInput value="" onChange={jest.fn()} placeholder="搜索" aria-label="搜索会话" />)

    expect(screen.getByRole('textbox', { name: '搜索会话' })).toBeInTheDocument()
  })

  test('keeps the clear button visibly focusable in both visual variants', () => {
    const { rerender } = render(<SearchInput value="abc" onChange={jest.fn()} placeholder="搜索" />)

    expect(screen.getByRole('button', { name: '清空搜索' })).toHaveClass('focus-visible:ring-2')
    expect(screen.getByRole('button', { name: '清空搜索' })).toHaveClass(
      'focus-visible:ring-blue-500',
    )

    rerender(
      <SearchInput value="abc" onChange={jest.fn()} placeholder="搜索" variant="workspace" />,
    )

    expect(screen.getByRole('button', { name: '清空搜索' })).toHaveClass('focus-visible:ring-2')
    expect(screen.getByRole('button', { name: '清空搜索' })).toHaveClass(
      'focus-visible:ring-emerald-400',
    )
  })

  test('cancels the pending debounced search when Enter submits immediately', () => {
    jest.useFakeTimers()
    const onSearch = jest.fn()

    try {
      render(<SearchInput value="" onChange={jest.fn()} onSearch={onSearch} debounceMs={300} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '专利分析' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onSearch).toHaveBeenCalledTimes(1)
      expect(onSearch).toHaveBeenLastCalledWith('专利分析')

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onSearch).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })

  test('cancels a stale debounced search when the controlled value is replaced externally', () => {
    jest.useFakeTimers()
    const onSearch = jest.fn()
    const onChange = jest.fn()

    try {
      const view = render(
        <SearchInput value="" onChange={onChange} onSearch={onSearch} debounceMs={300} />,
      )

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '旧查询' } })
      view.rerender(
        <SearchInput value="新查询" onChange={onChange} onSearch={onSearch} debounceMs={300} />,
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(screen.getByRole('textbox')).toHaveValue('新查询')
      expect(onSearch).not.toHaveBeenCalled()
    } finally {
      jest.useRealTimers()
    }
  })
})
