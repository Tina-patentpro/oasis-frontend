import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TextInputPanel } from './TextInputPanel'

const baseProps = {
  inputPage: 'overview',
  currentValue: '',
  placeholder: '请输入内容',
  fieldLabel: '技术方案',
  appliedLayout: 'default',
  onInputChange: jest.fn(),
}

describe('TextInputPanel', () => {
  test('shows disabled affordance on mode buttons and prevents disabled preview switching', async () => {
    const user = userEvent.setup()

    render(<TextInputPanel {...baseProps} />)

    const markdownButton = screen.getByRole('button', { name: '编辑 Markdown' })
    const previewButton = screen.getByRole('button', { name: '预览效果' })

    expect(markdownButton).toHaveClass('disabled:cursor-not-allowed')
    expect(previewButton).toHaveClass('disabled:opacity-50')
    expect(markdownButton).not.toBeDisabled()
    expect(previewButton).toBeDisabled()

    await user.click(previewButton)

    expect(screen.queryByRole('region', { name: '技术方案预览内容' })).not.toBeInTheDocument()
  })

  test('marks both mode buttons as disabled when the editor is disabled', () => {
    render(<TextInputPanel {...baseProps} currentValue="已有内容" disabled />)

    expect(screen.getByRole('button', { name: '编辑 Markdown' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '编辑 Markdown' })).toHaveClass(
      'disabled:cursor-not-allowed',
    )
    expect(screen.getByRole('button', { name: '预览效果' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '预览效果' })).toHaveClass('disabled:opacity-50')
  })
})
