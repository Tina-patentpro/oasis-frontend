import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import { SETTINGS_MENU } from '../constants'
import { SettingsSidebar } from './SettingsSidebar'

jest.mock('@/components/ui/motion', () => ({
  motion: {
    button: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      whileHover?: unknown
      whileTap?: unknown
    }) => <button {...props}>{children}</button>,
  },
}))

describe('SettingsSidebar', () => {
  test('uses a compact horizontal navigation layout on small screens', () => {
    render(
      <SettingsSidebar
        menu={SETTINGS_MENU}
        currentPage="data"
        onSelect={jest.fn()}
        onClose={jest.fn()}
        themeColor="#10b981"
      />,
    )

    const sidebar = screen.getByRole('complementary')
    const navigation = screen.getByRole('navigation')
    const activeButton = screen.getByRole('button', { name: /数据管理/ })

    expect(sidebar).toHaveClass('w-full')
    expect(sidebar).toHaveClass('sm:w-64')
    expect(navigation).toHaveClass('overflow-x-auto')
    expect(activeButton).toHaveAttribute('aria-current', 'page')
  })
})
