import { render, screen } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import { PasswordCard } from './PasswordCard'
import { ProfileInfoCard } from './ProfileInfoCard'

const profileDefaults = {
  themeColor: '#059669',
  avatarUrl: '',
  formData: {
    username: '测试用户',
    phone: '13800000000',
    email: 'test@example.com',
    avatar: '',
  },
  fileInputRef: { current: null },
  avatarInputId: 'avatar-input',
  usernameId: 'username-input',
  phoneId: 'phone-input',
  emailId: 'email-input',
  saveError: null,
  saveSuccess: false,
  isSaving: false,
  onAvatarUpload: jest.fn(),
  onFormFieldChange: jest.fn(),
  onSaveChanges: jest.fn(),
}

const passwordDefaults = {
  themeColor: '#059669',
  currentPwdId: 'current-password',
  newPwdId: 'new-password',
  confirmPwdId: 'confirm-password',
  passwordData: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  },
  isChangingPassword: false,
  passwordSuccess: false,
  passwordError: null,
  onPasswordFieldChange: jest.fn(),
  onChangePassword: jest.fn(),
}

describe('profile settings feedback semantics', () => {
  test('profile save error is announced as an alert', () => {
    render(<ProfileInfoCard {...profileDefaults} saveError="保存失败，请重试" />)

    expect(screen.getByRole('alert')).toHaveTextContent('保存失败，请重试')
    expect(screen.getByLabelText('用户名')).toHaveValue('测试用户')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('profile save success is announced as a status update', () => {
    render(<ProfileInfoCard {...profileDefaults} saveSuccess />)

    expect(screen.getByRole('status')).toHaveTextContent('保存成功！')
    expect(screen.getByRole('button', { name: '保存更改' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('password error is announced as an alert', () => {
    render(<PasswordCard {...passwordDefaults} passwordError="当前密码不正确" />)

    const alert = screen.getByRole('alert')
    const newPasswordInput = screen.getByLabelText('新密码')

    expect(alert).toHaveTextContent('当前密码不正确')
    expect(alert).toHaveAttribute('id', 'new-password-error')
    expect(newPasswordInput).toHaveAttribute('aria-describedby', 'new-password-error')
    expect(newPasswordInput).toHaveAttribute('aria-invalid', 'true')
  })

  test('password success is announced as a status update', () => {
    render(<PasswordCard {...passwordDefaults} passwordSuccess />)

    expect(screen.getByRole('status')).toHaveTextContent('密码修改成功！')
    expect(screen.getByRole('button', { name: '保存新密码' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
