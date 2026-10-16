import React from 'react'
import { describe, expect, jest, test, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RegisterForm } from './RegisterForm'

const mockRegister = jest.fn((payload: unknown) => Promise.resolve({ id: 1, payload }))

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { register: typeof mockRegister }) => unknown) =>
    selector({
      register: mockRegister,
    }),
}))

jest.mock('@/api/services', () => ({
  authService: {
    sendSmsCode: jest.fn(),
  },
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    mockRegister.mockClear()
  })

  test('renders register policy notice and removes checkbox', () => {
    render(<RegisterForm />)

    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByText('注册即表示你已阅读并同意')).not.toBeNull()

    const policyLink = screen.getByRole('link', { name: '隐私与服务政策' }) as HTMLAnchorElement

    expect(policyLink.getAttribute('href')).toBe('https://www.oasisintwrite.com/privacy')
    expect(policyLink.getAttribute('target')).toBe('_blank')
    expect(policyLink.getAttribute('rel')).toContain('noopener')
  })

  test('submits with acceptTerms set to true without requiring a checkbox', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    await user.type(screen.getByLabelText('手机号码'), '13800138000')
    await user.type(screen.getByLabelText('短信验证码'), '123456')
    await user.type(screen.getByLabelText('设置密码'), '12345678')
    await user.click(screen.getByRole('button', { name: '注册账号' }))

    expect(mockRegister).toHaveBeenCalledWith({
      phone: '13800138000',
      code: '123456',
      password: '12345678',
      invitationCode: undefined,
      acceptTerms: true,
    })
  })

  test('links validation errors to fields and focuses the first invalid field', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    await user.click(screen.getByRole('button', { name: '注册账号' }))

    const phoneInput = screen.getByLabelText('手机号码')
    const phoneError = screen.getByRole('alert', { name: '手机号码错误' })

    expect(phoneInput).toHaveFocus()
    expect(phoneInput).toHaveAttribute('aria-invalid', 'true')
    expect(phoneInput).toHaveAttribute('aria-describedby', phoneError.id)
    expect(phoneError).toHaveTextContent('请输入手机号码')
  })
})
