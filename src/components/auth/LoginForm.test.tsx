import React from 'react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LoginForm } from './LoginForm'

const mockLogin = jest.fn()
const mockLoginWithSms = jest.fn()
const mockSendSmsCode = jest.fn()

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { login: jest.Mock; loginWithSms: jest.Mock }) => unknown) =>
    selector({
      login: ((...args: unknown[]) => mockLogin(...args)) as jest.Mock,
      loginWithSms: ((...args: unknown[]) => mockLoginWithSms(...args)) as jest.Mock,
    }),
}))

jest.mock('@/api/services', () => ({
  authService: {
    sendSmsCode: (...args: unknown[]) => mockSendSmsCode(...args),
  },
}))

describe('LoginForm', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockLoginWithSms.mockReset()
    mockSendSmsCode.mockReset()
  })

  test('renders login policy notice and link above submit button', () => {
    render(<LoginForm />)

    expect(screen.queryByText('登录即表示你已阅读并同意')).not.toBeNull()

    const policyLink = screen.getByRole('link', { name: '隐私与服务政策' }) as HTMLAnchorElement

    expect(policyLink.getAttribute('href')).toBe('https://www.oasisintwrite.com/privacy')
    expect(policyLink.getAttribute('target')).toBe('_blank')
    expect(policyLink.getAttribute('rel')).toContain('noopener')
  })

  test('does not show forgot password in sms login mode', () => {
    render(<LoginForm />)

    expect(screen.queryByRole('button', { name: '忘记密码？' })).toBeNull()
  })

  test('describes the one-hour browser-session policy', () => {
    render(<LoginForm />)

    expect(
      screen.getByText('登录状态最长保留 1 小时，关闭浏览器后需重新登录。'),
    ).toBeInTheDocument()
  })

  test('shows forgot password after switching to password login mode', async () => {
    const user = userEvent.setup()

    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: '密码登录' }))

    expect(screen.queryByRole('button', { name: '忘记密码？' })).not.toBeNull()
  })

  test('links validation errors to fields and focuses the first invalid field', async () => {
    const user = userEvent.setup()

    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: '登录账号' }))

    const phoneInput = screen.getByLabelText('手机号码')
    const phoneError = screen.getByRole('alert', { name: '手机号码错误' })

    expect(phoneInput).toHaveFocus()
    expect(phoneInput).toHaveAttribute('aria-invalid', 'true')
    expect(phoneInput).toHaveAttribute('aria-describedby', phoneError.id)
    expect(phoneError).toHaveTextContent('请输入手机号码')
  })

  test('shows a friendly message instead of Failed to fetch when sms login cannot connect', async () => {
    const user = userEvent.setup()
    mockLoginWithSms.mockRejectedValueOnce(new TypeError('Failed to fetch') as never)

    render(<LoginForm />)

    await user.type(screen.getByLabelText('手机号码'), '13800138000')
    await user.type(screen.getByLabelText('短信验证码'), '123456')
    await user.click(screen.getByRole('button', { name: '登录账号' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('网络连接失败，请检查网络后重试。')
    expect(screen.queryByText('Failed to fetch')).toBeNull()
  })
})
