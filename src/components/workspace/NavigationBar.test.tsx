import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { APP_VERSION_LABEL } from '@/constants/appMeta'

import { NavigationBar } from './NavigationBar'

jest.mock('@/components/NotificationCenter', () => {
  const NotificationBell = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { unreadCount?: number; themeColor?: string }
  >(({ unreadCount, themeColor: _themeColor, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={unreadCount ? `通知中心（${unreadCount} 条未读）` : '通知中心'}
      {...props}
    >
      {unreadCount ?? 0}
    </button>
  ))

  NotificationBell.displayName = 'MockNotificationBell'

  return {
    NotificationBell,
    NotificationCenter: ({ id }: { id?: string }) => (
      <div id={id} role="dialog" aria-label="通知中心">
        通知中心
      </div>
    ),
  }
})

jest.mock('@/components/ui', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('./navigation', () => ({
  AsyncTaskMenu: () => <div>异步任务</div>,
  ChatModeSwitch: () => <div>聊天模式切换</div>,
  UserMenuPanel: ({
    onOpenSettingsPage,
  }: {
    onOpenSettingsPage: (
      page: 'profile' | 'balance' | 'runningWater' | 'modelPreferences' | 'data',
    ) => void
  }) => (
    <div>
      用户菜单面板
      <button type="button" onClick={() => onOpenSettingsPage('data')}>
        打开数据管理设置
      </button>
    </div>
  ),
  getActiveSegmentLeft: () => '0%',
  getChatModeHint: () => '隐藏对话栏',
  getHeaderButtonStyle: () => ({}),
  isDarkTheme: () => false,
  useNavigationBarState: (): {
    notificationBellRef: React.RefObject<HTMLButtonElement | null>
    notificationCenterRef: React.RefObject<HTMLDivElement | null>
    userMenuBtnRef: React.RefObject<HTMLButtonElement | null>
    userMenuRef: React.RefObject<HTMLDivElement | null>
    isLoggingOut: boolean
    user: unknown
    handleNotificationToggle: jest.Mock
    handleUserMenuToggle: jest.Mock
    handleLogout: jest.Mock
    handleSuggestionClick: jest.Mock
    handleReleaseNotesClick: jest.Mock
    handleHelpClick: jest.Mock
    handleCustomerServiceClick: jest.Mock
    handleForceReload: jest.Mock
  } => ({
    notificationBellRef: React.createRef<HTMLButtonElement>(),
    notificationCenterRef: React.createRef<HTMLDivElement>(),
    userMenuBtnRef: React.createRef<HTMLButtonElement>(),
    userMenuRef: React.createRef<HTMLDivElement>(),
    isLoggingOut: false,
    user: null,
    handleNotificationToggle: jest.fn(),
    handleUserMenuToggle: jest.fn(),
    handleLogout: jest.fn(),
    handleSuggestionClick: jest.fn(),
    handleReleaseNotesClick: jest.fn(),
    handleHelpClick: jest.fn(),
    handleCustomerServiceClick: jest.fn(),
    handleForceReload: jest.fn(),
  }),
}))

describe('NavigationBar', () => {
  test('renders the updated workspace logo image', () => {
    render(
      <NavigationBar
        showSidebar
        onToggleSidebar={jest.fn()}
        chatMode="off"
        onChangeChatMode={jest.fn()}
        theme="green"
        currentTheme={{
          background: '#ffffff',
          primary: '#10b981',
          primaryHover: '#34d399',
          name: '浅绿',
        }}
        onThemeChange={jest.fn()}
        unreadCount={0}
        notificationCenterOpen={false}
        setNotificationCenterOpen={jest.fn()}
        userMenuOpen={false}
        setUserMenuOpen={jest.fn()}
        onSuggestionClick={jest.fn()}
        onOpenSettingsPage={jest.fn()}
        onReleaseNotesClick={jest.fn()}
        onHelpClick={jest.fn()}
        onCustomerServiceClick={jest.fn()}
        themes={
          {
            green: {
              background: '#ffffff',
              primary: '#10b981',
              primaryHover: '#34d399',
              name: '浅绿',
            },
          } as any
        }
        tooltipsEnabled
        onToggleTooltips={jest.fn()}
      />,
    )

    expect(screen.getByAltText('绿洲慧写品牌标识').getAttribute('src')).toBe('/workspace-logo.webp')
    expect(screen.getByRole('button', { name: '通知中心' })).not.toHaveAttribute('aria-controls')
    expect(screen.getByRole('button', { name: '隐藏侧边栏' })).toHaveAttribute('type', 'button')

    const userMenuTrigger = screen.getByRole('button', { name: '用户菜单' })
    expect(userMenuTrigger).not.toHaveAttribute('aria-controls')
    expect(userMenuTrigger).toHaveAttribute('type', 'button')
  })

  test('renders version text next to the workspace title', () => {
    render(
      <NavigationBar
        showSidebar
        onToggleSidebar={jest.fn()}
        chatMode="off"
        onChangeChatMode={jest.fn()}
        theme="green"
        currentTheme={{
          background: '#ffffff',
          primary: '#10b981',
          primaryHover: '#34d399',
          name: '浅绿',
        }}
        onThemeChange={jest.fn()}
        unreadCount={0}
        notificationCenterOpen={false}
        setNotificationCenterOpen={jest.fn()}
        userMenuOpen={false}
        setUserMenuOpen={jest.fn()}
        onSuggestionClick={jest.fn()}
        onOpenSettingsPage={jest.fn()}
        onReleaseNotesClick={jest.fn()}
        onHelpClick={jest.fn()}
        onCustomerServiceClick={jest.fn()}
        themes={
          {
            green: {
              background: '#ffffff',
              primary: '#10b981',
              primaryHover: '#34d399',
              name: '浅绿',
            },
          } as any
        }
        tooltipsEnabled
        onToggleTooltips={jest.fn()}
      />,
    )

    const titleText = screen.getByText('绿洲慧写 · 工作区')
    const titleGroup = titleText.parentElement

    expect(titleGroup).not.toBeNull()
    expect(within(titleGroup as HTMLElement).getByText(APP_VERSION_LABEL)).toBeInTheDocument()
  })

  test('links notification trigger to the rendered notification dialog', () => {
    render(
      <NavigationBar
        showSidebar
        onToggleSidebar={jest.fn()}
        chatMode="off"
        onChangeChatMode={jest.fn()}
        theme="green"
        currentTheme={{
          background: '#ffffff',
          primary: '#10b981',
          primaryHover: '#34d399',
          name: '浅绿',
        }}
        onThemeChange={jest.fn()}
        unreadCount={3}
        notificationCenterOpen
        setNotificationCenterOpen={jest.fn()}
        userMenuOpen={false}
        setUserMenuOpen={jest.fn()}
        onSuggestionClick={jest.fn()}
        onOpenSettingsPage={jest.fn()}
        onReleaseNotesClick={jest.fn()}
        onHelpClick={jest.fn()}
        onCustomerServiceClick={jest.fn()}
        themes={
          {
            green: {
              background: '#ffffff',
              primary: '#10b981',
              primaryHover: '#34d399',
              name: '浅绿',
            },
          } as any
        }
        tooltipsEnabled
        onToggleTooltips={jest.fn()}
      />,
    )

    const trigger = screen.getByRole('button', { name: '通知中心（3 条未读）' })
    const dialog = screen.getByRole('dialog', { name: '通知中心' })

    expect(trigger).toHaveAttribute('aria-controls', dialog.id)
    expect(dialog).toHaveAttribute('id', 'notification-center-panel')
  })

  test('declares the user trigger as a dialog controller', () => {
    render(
      <NavigationBar
        showSidebar
        onToggleSidebar={jest.fn()}
        chatMode="off"
        onChangeChatMode={jest.fn()}
        theme="green"
        currentTheme={{
          background: '#ffffff',
          primary: '#10b981',
          primaryHover: '#34d399',
          name: '浅绿',
        }}
        onThemeChange={jest.fn()}
        unreadCount={0}
        notificationCenterOpen={false}
        setNotificationCenterOpen={jest.fn()}
        userMenuOpen
        setUserMenuOpen={jest.fn()}
        onSuggestionClick={jest.fn()}
        onOpenSettingsPage={jest.fn()}
        onReleaseNotesClick={jest.fn()}
        onHelpClick={jest.fn()}
        onCustomerServiceClick={jest.fn()}
        themes={
          {
            green: {
              background: '#ffffff',
              primary: '#10b981',
              primaryHover: '#34d399',
              name: '浅绿',
            },
          } as any
        }
        tooltipsEnabled
        onToggleTooltips={jest.fn()}
      />,
    )

    const trigger = screen.getByRole('button', { name: '用户菜单' })

    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', 'workspace-user-menu')
  })

  test('returns focus to the user menu trigger before opening a settings page', () => {
    const onOpenSettingsPage = jest.fn()

    render(
      <NavigationBar
        showSidebar
        onToggleSidebar={jest.fn()}
        chatMode="off"
        onChangeChatMode={jest.fn()}
        theme="green"
        currentTheme={{
          background: '#ffffff',
          primary: '#10b981',
          primaryHover: '#34d399',
          name: '浅绿',
        }}
        onThemeChange={jest.fn()}
        unreadCount={0}
        notificationCenterOpen={false}
        setNotificationCenterOpen={jest.fn()}
        userMenuOpen
        setUserMenuOpen={jest.fn()}
        onSuggestionClick={jest.fn()}
        onOpenSettingsPage={onOpenSettingsPage}
        onReleaseNotesClick={jest.fn()}
        onHelpClick={jest.fn()}
        onCustomerServiceClick={jest.fn()}
        themes={
          {
            green: {
              background: '#ffffff',
              primary: '#10b981',
              primaryHover: '#34d399',
              name: '浅绿',
            },
          } as any
        }
        tooltipsEnabled
        onToggleTooltips={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '打开数据管理设置' }))

    expect(onOpenSettingsPage).toHaveBeenCalledWith('data')
    expect(screen.getByRole('button', { name: '用户菜单' })).toHaveFocus()
  })
})
