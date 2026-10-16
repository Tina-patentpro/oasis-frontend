import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { EmptyChatState } from './EmptyChatState'

const theme = {
  background: '#f8fafc',
  primary: '#16a34a',
  primaryHover: '#15803d',
  name: 'green',
}

describe('EmptyChatState', () => {
  test('renders focus suggestions as an ordered list', () => {
    render(<EmptyChatState chatTab="focus" onSuggestionClick={jest.fn()} theme={theme} />)

    const list = screen.getByRole('list')
    expect(list.tagName).toBe('OL')
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('指令会插入到输入框开头，读取资料会追加到末尾。')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '插入到输入框开头：帮我提出对以下权利要求书的优化建议' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '插入到输入框开头：帮我提出对以下专利名称的优化建议' }),
    ).toBeInTheDocument()
  })

  test('calls onSuggestionClick when a suggestion is clicked', async () => {
    const user = userEvent.setup()
    const onSuggestionClick = jest.fn()
    render(<EmptyChatState chatTab="focus" onSuggestionClick={onSuggestionClick} theme={theme} />)

    await user.click(
      screen.getByRole('button', { name: '插入到输入框开头：帮我提出对以下权利要求书的优化建议' }),
    )

    expect(onSuggestionClick).toHaveBeenCalledWith('帮我提出对以下权利要求书的优化建议')
  })

  test('keeps suggestion click targets easy to tap', () => {
    render(<EmptyChatState chatTab="focus" onSuggestionClick={jest.fn()} theme={theme} />)

    const suggestionButton = screen.getByRole('button', {
      name: '插入到输入框开头：帮我提出对以下权利要求书的优化建议',
    })

    expect(suggestionButton).toHaveClass('min-h-10')
    expect(suggestionButton).toHaveClass('border')
    expect(suggestionButton).toHaveClass('bg-white')
    expect(suggestionButton).not.toHaveTextContent('点击填入')
    const fillIcon = screen.getAllByTestId('empty-suggestion-fill-icon')[0]
    expect(fillIcon).toHaveAttribute('aria-hidden', 'true')
  })
})
