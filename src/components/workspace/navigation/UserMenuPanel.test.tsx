import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { UserMenuPanel } from './UserMenuPanel'

jest.mock('@/components/ui', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/components/ui/motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
      <button {...props}>{children}</button>
    ),
  },
}))

const themes = {
  green: {
    background: '#ffffff',
    primary: '#10b981',
    primaryHover: '#34d399',
    name: '浅绿',
  },
  blue: {
    background: '#f8fbff',
    primary: '#3b82f6',
    primaryHover: '#60a5fa',
    name: '浅蓝',
  },
  orange: {
    background: '#fffaf5',
    primary: '#f97316',
    primaryHover: '#fb923c',
    name: '浅橙',
  },
  gray: {
    background: '#f9fafb',
    primary: '#6b7280',
    primaryHover: '#9ca3af',
    name: '浅灰',
  },
  darkGreen: {
    background: '#0f172a',
    primary: '#10b981',
    primaryHover: '#34d399',
    name: '深绿',
  },
  darkBlue: {
    background: '#0f172a',
    primary: '#3b82f6',
    primaryHover: '#60a5fa',
    name: '深蓝',
  },
  darkRed: {
    background: '#111827',
    primary: '#ef4444',
    primaryHover: '#f87171',
    name: '深红',
  },
  darkGray: {
    background: '#111827',
    primary: '#9ca3af',
    primaryHover: '#d1d5db',
    name: '深灰',
  },
} as const

const renderUserMenuPanel = (overrides: Partial<React.ComponentProps<typeof UserMenuPanel>> = {}) =>
  render(
    <UserMenuPanel
      userMenuOpen
      userMenuRef={React.createRef<HTMLDivElement>()}
      user={{ username: '测试用户', email: 'test@example.com', balance: 88 }}
      currentTheme={themes.green}
      theme="green"
      themes={themes}
      tooltipsEnabled
      isLoggingOut={false}
      onSuggestionClick={jest.fn()}
      onOpenSettingsPage={jest.fn()}
      onReleaseNotesClick={jest.fn()}
      onHelpClick={jest.fn()}
      onCustomerServiceClick={jest.fn()}
      onThemeChange={jest.fn()}
      onToggleTooltips={jest.fn()}
      onForceReload={jest.fn()}
      onLogout={jest.fn()}
      setUserMenuOpen={jest.fn()}
      {...overrides}
    />,
  )

describe('UserMenuPanel', () => {
  test('shows a release notes entry for users', () => {
    renderUserMenuPanel()

    expect(screen.getByText('版本更新')).toBeInTheDocument()
  })

  test('keeps user menu action buttons from submitting surrounding forms', () => {
    renderUserMenuPanel()

    expect(screen.getByRole('button', { name: '有奖建议征集' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: /个人信息和推荐奖励/ })).toHaveAttribute(
      'type',
      'button',
    )
    expect(screen.getByRole('button', { name: '版本更新' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '帮助文档' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '联系客服' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '登出' })).toHaveAttribute('type', 'button')
  })

  test('keeps user menu buttons visibly focusable for keyboard users', () => {
    renderUserMenuPanel()

    expect(screen.getByRole('button', { name: '有奖建议征集' })).toHaveClass('focus-visible:ring-2')
    expect(screen.getByRole('button', { name: '版本更新' })).toHaveClass('focus-visible:ring-inset')
    expect(screen.getByRole('button', { name: '切换到浅绿主题' })).toHaveClass(
      'focus-visible:ring-2',
    )
    expect(screen.getByRole('button', { name: '登出' })).toHaveClass('focus-visible:ring-red-400')
  })

  test('keeps the tooltip switch visibly focusable for keyboard users', () => {
    renderUserMenuPanel()

    const tooltipSwitch = screen.getByRole('checkbox', { name: '切换弹出气泡显示' })
    const visibleTrack = tooltipSwitch.nextElementSibling

    expect(tooltipSwitch).toHaveClass('peer')
    expect(visibleTrack).toHaveClass('peer-focus-visible:ring-2')
    expect(visibleTrack).toHaveClass('peer-focus-visible:ring-emerald-400')
  })

  test('exposes the user panel as a dialog and returns focus with Escape', () => {
    const trigger = document.createElement('button')
    const setUserMenuOpen = jest.fn()
    document.body.appendChild(trigger)
    trigger.focus()

    renderUserMenuPanel({ setUserMenuOpen })

    const panel = screen.getByRole('dialog', { name: '用户菜单' })
    expect(screen.getByRole('button', { name: '有奖建议征集' })).toHaveFocus()

    fireEvent.keyDown(panel, { key: 'Escape' })

    expect(setUserMenuOpen).toHaveBeenCalledWith(false)
    expect(trigger).toHaveFocus()

    trigger.remove()
  })

  test('keeps Tab navigation inside the user panel', async () => {
    const user = userEvent.setup()

    render(
      <>
        <UserMenuPanel
          userMenuOpen
          userMenuRef={React.createRef<HTMLDivElement>()}
          user={{ username: '测试用户', email: 'test@example.com', balance: 88 }}
          currentTheme={themes.green}
          theme="green"
          themes={themes}
          tooltipsEnabled
          isLoggingOut={false}
          onSuggestionClick={jest.fn()}
          onOpenSettingsPage={jest.fn()}
          onReleaseNotesClick={jest.fn()}
          onHelpClick={jest.fn()}
          onCustomerServiceClick={jest.fn()}
          onThemeChange={jest.fn()}
          onToggleTooltips={jest.fn()}
          onForceReload={jest.fn()}
          onLogout={jest.fn()}
          setUserMenuOpen={jest.fn()}
        />
        <button type="button">外部按钮</button>
      </>,
    )

    const firstMenuButton = screen.getByRole('button', { name: '有奖建议征集' })
    await waitFor(() => expect(firstMenuButton).toHaveFocus())

    screen.getByRole('button', { name: '登出' }).focus()
    await user.tab()

    expect(firstMenuButton).toHaveFocus()
    expect(screen.getByRole('button', { name: '外部按钮' })).not.toHaveFocus()
  })

  test('only runs force reload after the user confirms', () => {
    const onForceReload = jest.fn()
    renderUserMenuPanel({ onForceReload })

    fireEvent.click(screen.getByRole('button', { name: '强制重新加载' }))

    expect(onForceReload).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '确认强制重新加载' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(onForceReload).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: '确认强制重新加载' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '强制重新加载' }))
    fireEvent.click(screen.getByRole('button', { name: '确认重新加载' }))

    expect(onForceReload).toHaveBeenCalledTimes(1)
  })
})
