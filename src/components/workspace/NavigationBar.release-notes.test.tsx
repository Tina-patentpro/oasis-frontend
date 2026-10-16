import React, { useState } from 'react'

import '@testing-library/jest-dom'
import { describe, expect, jest, test, beforeEach, afterEach } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { APP_VERSION_LABEL } from '@/constants/appMeta'

import { NavigationBar } from './NavigationBar'
import { ReleaseNotesDialog } from '../ReleaseNotesDialog'

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

jest.mock('@/components/ui', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/components/NotificationCenter', () => {
  const NotificationBell = React.forwardRef<
    HTMLButtonElement,
    {
      unreadCount: number
      onClick: () => void
      className?: string
      style?: React.CSSProperties
      'aria-expanded'?: boolean
      'aria-controls'?: string
    }
  >(({ unreadCount, onClick, ...props }, ref) => (
    <button ref={ref} type="button" onClick={onClick} aria-label={`通知 ${unreadCount}`} {...props}>
      通知
    </button>
  ))
  NotificationBell.displayName = 'MockNotificationBell'

  return {
    NotificationBell,
    NotificationCenter: () => <div>通知中心</div>,
  }
})

jest.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => React.createRef<HTMLDivElement>(),
}))

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (
    selector: (state: {
      user: { username: string; email: string }
      logout: () => Promise<void>
    }) => unknown,
  ) =>
    selector({
      user: {
        username: '测试用户',
        email: 'tester@example.com',
      },
      logout: jest.fn(async () => undefined),
    }),
}))

jest.mock('@/stores/useUIStore', () => ({
  useUIStore: Object.assign(
    (selector: (state: { showToast: (message: string) => void }) => unknown) =>
      selector({
        showToast: jest.fn(),
      }),
    {
      getState: () => ({
        showToast: jest.fn(),
      }),
    },
  ),
}))

jest.mock('@/hooks/useClickOutside', () => ({
  useClickOutside: () => undefined,
}))

jest.mock('../NotificationCenter', () => {
  const NotificationBell = React.forwardRef<
    HTMLButtonElement,
    {
      unreadCount: number
      onClick: () => void
      className?: string
      style?: React.CSSProperties
      'aria-expanded'?: boolean
      'aria-controls'?: string
    }
  >(({ unreadCount, onClick, ...props }, ref) => (
    <button ref={ref} type="button" onClick={onClick} aria-label={`通知 ${unreadCount}`} {...props}>
      通知
    </button>
  ))
  NotificationBell.displayName = 'MockWorkspaceNotificationBell'

  return {
    NotificationBell,
    NotificationCenter: () => <div>通知中心</div>,
  }
})

jest.mock('../ContentRenderer', () => ({
  ContentRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}))

jest.mock('./navigation', () => {
  const actual = jest.requireActual<typeof import('./navigation')>('./navigation')
  return {
    ...actual,
    AsyncTaskMenu: () => null,
    ChatModeSwitch: () => null,
  }
})

const themeMap = {
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

function ReleaseNotesFlowHarness() {
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false)

  return (
    <>
      <NavigationBar
        showSidebar
        onToggleSidebar={jest.fn()}
        chatMode="quarter"
        onChangeChatMode={jest.fn()}
        theme="green"
        currentTheme={themeMap.green}
        onThemeChange={jest.fn()}
        unreadCount={0}
        notificationCenterOpen={notificationCenterOpen}
        setNotificationCenterOpen={setNotificationCenterOpen}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        onSuggestionClick={jest.fn()}
        onOpenSettingsPage={jest.fn()}
        onReleaseNotesClick={() => setReleaseNotesOpen(true)}
        onHelpClick={jest.fn()}
        onCustomerServiceClick={jest.fn()}
        themes={themeMap as any}
        tooltipsEnabled
        onToggleTooltips={jest.fn()}
      />
      <ReleaseNotesDialog
        isOpen={releaseNotesOpen}
        onClose={() => setReleaseNotesOpen(false)}
        themeColor={themeMap.green.primary}
      />
    </>
  )
}

describe('NavigationBar release notes flow', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    const fetchMock = jest.fn<typeof fetch>(
      async () =>
        ({
          ok: true,
          text: async () => '# 版本更新\n\n## [1.0.0]\n\n说明加载成功',
        }) as unknown as Response,
    )
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('opens the release notes dialog from the user menu and loads the markdown content', async () => {
    const user = userEvent.setup()

    render(<ReleaseNotesFlowHarness />)

    await user.click(screen.getByRole('button', { name: '用户菜单' }))
    await user.click(screen.getByRole('button', { name: '版本更新' }))

    expect(global.fetch).toHaveBeenCalledWith(
      `/help/release-notes.md?v=${encodeURIComponent(APP_VERSION_LABEL)}`,
    )
    expect(await screen.findByRole('dialog', { name: '版本更新' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/说明加载成功/)).toBeInTheDocument()
    })
  })

  test('announces release notes loading errors as alerts', async () => {
    global.fetch = jest.fn<typeof fetch>(
      async () =>
        ({
          ok: false,
          status: 503,
        }) as unknown as Response,
    )

    render(<ReleaseNotesDialog isOpen onClose={jest.fn()} themeColor={themeMap.green.primary} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('版本更新加载失败（状态码：503）')
  })

  test('closes release notes with Escape and restores page scrolling', async () => {
    const user = userEvent.setup()
    const previousOverflow = document.body.style.overflow

    render(<ReleaseNotesFlowHarness />)

    await user.click(screen.getByRole('button', { name: '用户菜单' }))
    await user.click(screen.getByRole('button', { name: '版本更新' }))

    const dialog = await screen.findByRole('dialog', { name: '版本更新' })
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '版本更新' })).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe(previousOverflow)
  })
})
