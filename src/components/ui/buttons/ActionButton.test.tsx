import { render, screen } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'
import type { ReactNode } from 'react'

import { ActionBtn } from './ActionButton'

jest.mock('../Tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
}))

describe('ActionBtn', () => {
  test('exposes busy state when loading', () => {
    render(
      <ActionBtn ariaLabel="保存设置" loading onClick={() => undefined}>
        保存
      </ActionBtn>,
    )

    const button = screen.getByRole('button', { name: '保存设置' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  test('exposes tooltip text as an accessible description', () => {
    render(
      <ActionBtn
        ariaLabel="生成内容"
        tooltip="当前会话正在生成中，请等待完成后再开启新会话"
        onClick={() => undefined}
      >
        生成
      </ActionBtn>,
    )

    expect(screen.getByRole('button', { name: '生成内容' })).toHaveAccessibleDescription(
      '当前会话正在生成中，请等待完成后再开启新会话',
    )
  })
})
