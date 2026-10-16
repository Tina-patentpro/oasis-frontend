import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { userService } from '@/api/services'
import type { UserDetail } from '@/types/api'
import type { ReferralCode, ReferralRecord } from '@/types/common'

import { ProfileSettingsSection } from './ProfileSettingsSection'

jest.mock('@/api/services', () => ({
  userService: {
    getUserDetail: jest.fn(),
    updateUserDetail: jest.fn(),
    uploadFile: jest.fn(),
    updatePassword: jest.fn(),
  },
}))

const getUserDetailMock = userService.getUserDetail as jest.MockedFunction<
  typeof userService.getUserDetail
>
const updateUserDetailMock = userService.updateUserDetail as jest.MockedFunction<
  typeof userService.updateUserDetail
>
const uploadFileMock = userService.uploadFile as jest.MockedFunction<typeof userService.uploadFile>
const updatePasswordMock = userService.updatePassword as jest.MockedFunction<
  typeof userService.updatePassword
>

const userDetail: UserDetail = {
  username: '测试用户',
  avatar: '/avatars/original.png',
  phone: '13800000000',
  email: 'old@example.com',
  balance: 100,
  invite_code: 'OASIS2026',
}

const referralCode: ReferralCode = {
  code: 'OASIS2026',
  usedCount: 2,
  maxUses: 10,
  rewardAmount: 18,
  totalEarned: 36,
  createdAt: '2026-06-01',
}

const referralRecords: ReferralRecord[] = [
  {
    id: 'record-1',
    date: '2026-06-20',
    type: 'earned',
    code: 'OASIS2026',
    amount: 18,
  },
]

function renderProfileSettings(overrides: Partial<{ myReferralCode: ReferralCode | null }> = {}) {
  return render(
    <ProfileSettingsSection
      themeColor="#059669"
      avatarUrl="/avatars/fallback.png"
      fileInputRef={createRef<HTMLInputElement>()}
      onAvatarChange={jest.fn()}
      myReferralCode={referralCode}
      onCopyReferralCode={jest.fn(async () => undefined)}
      isGeneratingReferralCode={false}
      onGenerateReferralCode={jest.fn(async () => undefined)}
      referralRecords={referralRecords}
      isReferralLoading={false}
      referralError={null}
      onRetryReferral={jest.fn()}
      {...overrides}
    />,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  getUserDetailMock.mockResolvedValue(userDetail)
  updateUserDetailMock.mockResolvedValue({ code: 0, msg: 'ok' })
  uploadFileMock.mockResolvedValue({
    filename: 'avatar.png',
    content_type: 'image/png',
    file_size: 1234,
    saved_path: '/uploads/avatar.png',
    message: 'ok',
  })
  updatePasswordMock.mockResolvedValue({ code: 0, msg: 'ok' })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('ProfileSettingsSection', () => {
  test('loads user detail and saves the edited profile fields', async () => {
    const user = userEvent.setup()
    renderProfileSettings()

    expect(await screen.findByDisplayValue('测试用户')).toBeInTheDocument()
    expect(screen.getByDisplayValue('13800000000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('old@example.com')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('用户名'))
    await user.type(screen.getByLabelText('用户名'), '新用户名')
    await user.clear(screen.getByLabelText('手机号'))
    await user.type(screen.getByLabelText('手机号'), '13900000000')
    await user.clear(screen.getByLabelText('邮箱'))
    await user.type(screen.getByLabelText('邮箱'), 'new@example.com')
    await user.click(screen.getByRole('button', { name: '保存更改' }))

    await waitFor(() => {
      expect(updateUserDetailMock).toHaveBeenCalledWith({
        avatar: '/avatars/original.png',
        username: '新用户名',
        phone: '13900000000',
        email: 'new@example.com',
      })
    })
    expect(screen.getByRole('status')).toHaveTextContent('保存成功！')
    expect(getUserDetailMock).toHaveBeenCalledTimes(2)
  })

  test('shows profile save failure without clearing the edited form values', async () => {
    const user = userEvent.setup()
    updateUserDetailMock.mockRejectedValue(new Error('save failed'))
    renderProfileSettings()

    await screen.findByDisplayValue('测试用户')
    await user.clear(screen.getByLabelText('用户名'))
    await user.type(screen.getByLabelText('用户名'), '失败后保留')
    await user.click(screen.getByRole('button', { name: '保存更改' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败，请重试')
    expect(screen.getByDisplayValue('失败后保留')).toBeInTheDocument()
  })

  test('validates password fields before submitting the password change', async () => {
    const user = userEvent.setup()
    renderProfileSettings()

    await screen.findByDisplayValue('测试用户')

    await user.click(screen.getByRole('button', { name: '保存新密码' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请填写所有密码字段')

    await user.type(screen.getByLabelText('当前密码'), 'old-password')
    await user.type(screen.getByLabelText('新密码'), 'short123')
    await user.type(screen.getByLabelText('确认新密码'), 'different123')
    await user.click(screen.getByRole('button', { name: '保存新密码' }))
    expect(screen.getByRole('alert')).toHaveTextContent('两次输入的新密码不一致')

    await user.clear(screen.getByLabelText('新密码'))
    await user.type(screen.getByLabelText('新密码'), 'short')
    await user.clear(screen.getByLabelText('确认新密码'))
    await user.type(screen.getByLabelText('确认新密码'), 'short')
    await user.click(screen.getByRole('button', { name: '保存新密码' }))
    expect(screen.getByRole('alert')).toHaveTextContent('新密码至少需要8位字符')
    expect(updatePasswordMock).not.toHaveBeenCalled()
  })

  test('submits a valid password change and clears password fields after success', async () => {
    const user = userEvent.setup()
    renderProfileSettings()

    await screen.findByDisplayValue('测试用户')
    await user.type(screen.getByLabelText('当前密码'), 'old-password')
    await user.type(screen.getByLabelText('新密码'), 'new-password-123')
    await user.type(screen.getByLabelText('确认新密码'), 'new-password-123')
    await user.click(screen.getByRole('button', { name: '保存新密码' }))

    await waitFor(() => {
      expect(updatePasswordMock).toHaveBeenCalledWith({
        password: 'old-password',
        newpasssword: 'new-password-123',
        truepassword: 'new-password-123',
      })
    })
    expect(screen.getByRole('status')).toHaveTextContent('密码修改成功！')
    expect(screen.getByLabelText('当前密码')).toHaveValue('')
    expect(screen.getByLabelText('新密码')).toHaveValue('')
    expect(screen.getByLabelText('确认新密码')).toHaveValue('')
  })

  test('does not let an older save timer clear a newer success message', async () => {
    renderProfileSettings()
    await screen.findByDisplayValue('测试用户')
    jest.useFakeTimers()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '保存更改' }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByRole('status')).toHaveTextContent('保存成功！')

    act(() => {
      jest.advanceTimersByTime(2000)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '保存更改' }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(screen.getByRole('status')).toHaveTextContent('保存成功！')
  })

  test('uploads a new avatar and keeps the normal avatar callback', async () => {
    const user = userEvent.setup()
    const onAvatarChange = jest.fn()
    render(
      <ProfileSettingsSection
        themeColor="#059669"
        avatarUrl="/avatars/fallback.png"
        fileInputRef={createRef<HTMLInputElement>()}
        onAvatarChange={onAvatarChange}
        myReferralCode={referralCode}
        onCopyReferralCode={jest.fn(async () => undefined)}
        isGeneratingReferralCode={false}
        onGenerateReferralCode={jest.fn(async () => undefined)}
        referralRecords={referralRecords}
        isReferralLoading={false}
        referralError={null}
        onRetryReferral={jest.fn()}
      />,
    )

    await screen.findByDisplayValue('测试用户')
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('头像'), file)

    await waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledWith(file)
    })
    expect(onAvatarChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('img', { name: '头像' })).toHaveAttribute('src', '/uploads/avatar.png')
  })

  test('shows avatar upload failure and uses the backend generation action when no code exists', async () => {
    const user = userEvent.setup()
    const onGenerateReferralCode = jest.fn(async () => undefined)
    uploadFileMock.mockRejectedValue(new Error('upload failed'))
    render(
      <ProfileSettingsSection
        themeColor="#059669"
        avatarUrl="/avatars/fallback.png"
        fileInputRef={createRef<HTMLInputElement>()}
        onAvatarChange={jest.fn()}
        myReferralCode={null}
        onCopyReferralCode={jest.fn(async () => undefined)}
        referralRecords={[]}
        isReferralLoading={false}
        referralError={null}
        onRetryReferral={jest.fn()}
        isGeneratingReferralCode={false}
        onGenerateReferralCode={onGenerateReferralCode}
      />,
    )

    await screen.findByDisplayValue('测试用户')
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('头像'), file)

    expect(await screen.findByRole('alert')).toHaveTextContent('上传头像失败，请重试')
    await user.click(screen.getByRole('button', { name: '生成我的推荐码' }))
    expect(onGenerateReferralCode).toHaveBeenCalledTimes(1)
  })

  test('shows referral loading failures separately and offers a retry', async () => {
    const onRetryReferral = jest.fn()
    const user = userEvent.setup()

    render(
      <ProfileSettingsSection
        themeColor="#059669"
        avatarUrl="/avatars/fallback.png"
        fileInputRef={createRef<HTMLInputElement>()}
        onAvatarChange={jest.fn()}
        myReferralCode={null}
        onCopyReferralCode={jest.fn(async () => undefined)}
        isGeneratingReferralCode={false}
        onGenerateReferralCode={jest.fn(async () => undefined)}
        referralRecords={[]}
        isReferralLoading={false}
        referralError="推荐信息暂时无法加载，请稍后重试"
        onRetryReferral={onRetryReferral}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('推荐信息暂时无法加载，请稍后重试')
    await user.click(screen.getByRole('button', { name: '重新加载' }))
    expect(onRetryReferral).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('当前账户暂未分配推荐码')).not.toBeInTheDocument()
  })
})
