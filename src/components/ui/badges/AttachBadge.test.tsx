import '@testing-library/jest-dom'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import type { Theme } from '@/types'

import { AttachBadge } from './AttachBadge'

const theme: Theme = {
  background: '#eff6ff',
  primary: '#93c5fd',
  primaryHover: '#60a5fa',
  primaryForeground: '#111827',
  name: 'blue',
}

describe('AttachBadge', () => {
  test('does not remove the attachment when removal is disabled', () => {
    const onRemove = jest.fn()

    render(
      <AttachBadge
        att={{
          id: 'att-1',
          name: '技术交底书.pdf',
          type: 'file',
          size: 1024,
          file: new File(['content'], '技术交底书.pdf', { type: 'application/pdf' }),
        }}
        onRemove={onRemove}
        theme={theme}
        removeDisabled
      />,
    )

    const removeButton = screen.getByRole('button', { name: '生成中暂不能移除 技术交底书.pdf' })
    expect(removeButton).toBeDisabled()

    fireEvent.click(removeButton)

    expect(onRemove).not.toHaveBeenCalled()
  })

  test('keeps the remove button large enough for touch and keyboard users', () => {
    render(
      <AttachBadge
        att={{
          id: 'att-1',
          name: '技术交底书.pdf',
          type: 'file',
          size: 1024,
          file: new File(['content'], '技术交底书.pdf', { type: 'application/pdf' }),
        }}
        onRemove={jest.fn()}
        theme={theme}
      />,
    )

    expect(screen.getByRole('button', { name: '移除 技术交底书.pdf' })).toHaveClass('min-h-8')
    expect(screen.getByRole('button', { name: '移除 技术交底书.pdf' })).toHaveClass('min-w-8')
  })
})
