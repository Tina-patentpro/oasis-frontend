import React from 'react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AuthPage } from './AuthPage'

const mockUseLocation = jest.fn()
const mockUseAuthStore = jest.fn()

type MockAuthState = {
  accessToken: string | null
  isAuthenticating: boolean
  error?: string
  clearError: () => void
}

jest.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
  useLocation: () => mockUseLocation(),
}))

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (
    selector: (state: {
      accessToken: string | null
      isAuthenticating: boolean
      error?: string
      clearError: () => void
    }) => unknown,
  ) => mockUseAuthStore(selector),
  selectIsAuthenticated: (state: { accessToken: string | null }) => Boolean(state.accessToken),
}))

jest.mock('@/api/services', () => ({
  authService: {
    sendSmsCode: jest.fn(),
  },
}))

jest.mock('@/components/ui', () => ({
  LoadingSpinner: () => <div>loading</div>,
}))

jest.mock('@/components/error-boundaries', () => ({
  PageErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    document.title = '绿洲慧写 · 工作区'
    mockUseLocation.mockReturnValue({ pathname: '/auth', state: undefined })
    mockUseAuthStore.mockImplementation(
      (
        selector: (state: {
          accessToken: string | null
          isAuthenticating: boolean
          error?: string
          clearError: () => void
        }) => unknown,
      ) =>
        selector({
          accessToken: null,
          isAuthenticating: false,
          error: undefined,
          clearError: jest.fn(),
        }),
    )
  })

  test('sets descriptive document title for login and register modes', async () => {
    const user = userEvent.setup()

    render(<AuthPage />)

    expect(document.title).toBe('绿洲慧写智能工作台登录 | AI 专利撰写项目管理系统')

    await user.click(screen.getByRole('button', { name: '立即注册' }))

    expect(document.title).toBe('注册绿洲慧写智能工作台账号 | AI 专利撰写项目管理系统')
  })

  test('restores pathname, query, and hash after authentication', () => {
    mockUseLocation.mockReturnValue({
      pathname: '/auth/login',
      state: {
        from: {
          pathname: '/workspace',
          search: '?project=42',
          hash: '#composer',
        },
      },
    })
    mockUseAuthStore.mockImplementation((selector: (state: MockAuthState) => unknown) =>
      selector({
        accessToken: 'token-123',
        isAuthenticating: false,
        error: undefined,
        clearError: jest.fn(),
      }),
    )

    render(<AuthPage />)

    expect(screen.getByText('navigate:/workspace?project=42#composer')).toBeInTheDocument()
  })

  test('rejects a scheme-relative post-authentication destination', () => {
    mockUseLocation.mockReturnValue({
      pathname: '/auth/login',
      state: {
        from: {
          pathname: '//attacker.example/path',
          search: '?token=secret',
          hash: '#fragment',
        },
      },
    })
    mockUseAuthStore.mockImplementation((selector: (state: MockAuthState) => unknown) =>
      selector({
        accessToken: 'token-123',
        isAuthenticating: false,
        error: undefined,
        clearError: jest.fn(),
      }),
    )

    render(<AuthPage />)

    expect(screen.getByText('navigate:/workspace')).toBeInTheDocument()
  })

  test('opens reset password dialog with qr guidance from password login mode', async () => {
    const user = userEvent.setup()

    render(<AuthPage />)

    await user.click(screen.getByRole('button', { name: '密码登录' }))
    await user.click(screen.getByRole('button', { name: '忘记密码？' }))

    expect(screen.queryByRole('heading', { name: '重置密码' })).not.toBeNull()
    expect(
      screen.queryByText('请扫码添加客服微信，并备注“重置密码”，我们会尽快协助你完成密码重置。'),
    ).not.toBeNull()
    expect(screen.queryByAltText('微信客服二维码')).not.toBeNull()
  })
})
