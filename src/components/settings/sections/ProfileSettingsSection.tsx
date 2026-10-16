import { useId, type ChangeEvent, type FC, useEffect, useRef, useState } from 'react'

import { userService } from '@/api/services'

import { SettingsSectionHeader } from '../common/SettingsSectionHeader'
import { PasswordCard } from './profile/PasswordCard'
import { ProfileInfoCard } from './profile/ProfileInfoCard'
import { ReferralRewardCard } from './profile/ReferralRewardCard'
import type {
  PasswordFormData,
  ProfileFormData,
  ProfileSettingsSectionProps,
} from './profile/types'

export const ProfileSettingsSection: FC<ProfileSettingsSectionProps> = ({
  themeColor,
  avatarUrl,
  fileInputRef,
  onAvatarChange,
  myReferralCode,
  onCopyReferralCode,
  isGeneratingReferralCode,
  onGenerateReferralCode,
  referralRecords,
  isReferralLoading,
  referralError,
  onRetryReferral,
}) => {
  const avatarInputId = useId()
  const usernameId = useId()
  const phoneId = useId()
  const emailId = useId()
  const currentPwdId = useId()
  const newPwdId = useId()
  const confirmPwdId = useId()

  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    phone: '',
    email: '',
    avatar: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const passwordSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (saveSuccessTimerRef.current) {
        clearTimeout(saveSuccessTimerRef.current)
      }
      if (passwordSuccessTimerRef.current) {
        clearTimeout(passwordSuccessTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    const loadUserDetail = async () => {
      try {
        const detail = await userService.getUserDetail()
        setFormData({
          username: detail.username || '',
          phone: detail.phone || '',
          email: detail.email || '',
          avatar: detail.avatar || '',
        })
      } catch (error) {
        console.error('[ProfileSettings] 获取用户详情失败', error)
      }
    }

    void loadUserDetail()
  }, [])

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setSaveError(null)
      const response = await userService.uploadFile(file)
      const avatarPath = response.saved_path
      setFormData((prev) => ({ ...prev, avatar: avatarPath }))
      onAvatarChange(event)
    } catch (error) {
      console.error('[ProfileSettings] 上传头像失败', error)
      setSaveError('上传头像失败，请重试')
    }
  }

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true)
      setSaveError(null)
      setSaveSuccess(false)
      if (saveSuccessTimerRef.current) {
        clearTimeout(saveSuccessTimerRef.current)
        saveSuccessTimerRef.current = null
      }

      await userService.updateUserDetail({
        avatar: formData.avatar || '',
        username: formData.username || '',
        phone: formData.phone || '',
        email: formData.email || '',
      })

      setSaveSuccess(true)
      await userService.getUserDetail()
      saveSuccessTimerRef.current = setTimeout(() => {
        saveSuccessTimerRef.current = null
        setSaveSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('[ProfileSettings] 保存失败', error)
      setSaveError('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      if (
        !passwordData.currentPassword ||
        !passwordData.newPassword ||
        !passwordData.confirmPassword
      ) {
        setPasswordError('请填写所有密码字段')
        return
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('两次输入的新密码不一致')
        return
      }

      if (passwordData.newPassword.length < 8) {
        setPasswordError('新密码至少需要8位字符')
        return
      }

      setIsChangingPassword(true)
      setPasswordError(null)
      setPasswordSuccess(false)
      if (passwordSuccessTimerRef.current) {
        clearTimeout(passwordSuccessTimerRef.current)
        passwordSuccessTimerRef.current = null
      }

      await userService.updatePassword({
        password: passwordData.currentPassword,
        newpasssword: passwordData.newPassword,
        truepassword: passwordData.confirmPassword,
      })

      setPasswordSuccess(true)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      passwordSuccessTimerRef.current = setTimeout(() => {
        passwordSuccessTimerRef.current = null
        setPasswordSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('[ProfileSettings] 修改密码失败', error)
      setPasswordError('修改密码失败，请检查当前密码是否正确')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSectionHeader title="个人信息和推荐奖励" description="管理您的账户信息和偏好设置" />

      <ProfileInfoCard
        themeColor={themeColor}
        avatarUrl={avatarUrl}
        formData={formData}
        fileInputRef={fileInputRef}
        avatarInputId={avatarInputId}
        usernameId={usernameId}
        phoneId={phoneId}
        emailId={emailId}
        saveError={saveError}
        saveSuccess={saveSuccess}
        isSaving={isSaving}
        onAvatarUpload={handleAvatarUpload}
        onFormFieldChange={(field, value) => {
          setFormData((prev) => ({ ...prev, [field]: value }))
        }}
        onSaveChanges={handleSaveChanges}
      />

      <PasswordCard
        themeColor={themeColor}
        currentPwdId={currentPwdId}
        newPwdId={newPwdId}
        confirmPwdId={confirmPwdId}
        passwordData={passwordData}
        isChangingPassword={isChangingPassword}
        passwordSuccess={passwordSuccess}
        passwordError={passwordError}
        onPasswordFieldChange={(field, value) => {
          setPasswordData((prev) => ({ ...prev, [field]: value }))
        }}
        onChangePassword={handleChangePassword}
      />

      <ReferralRewardCard
        themeColor={themeColor}
        myReferralCode={myReferralCode}
        referralRecords={referralRecords}
        onCopyReferralCode={onCopyReferralCode}
        isGeneratingReferralCode={isGeneratingReferralCode}
        onGenerateReferralCode={onGenerateReferralCode}
        isLoading={isReferralLoading}
        error={referralError}
        onRetry={onRetryReferral}
      />
    </div>
  )
}

ProfileSettingsSection.displayName = 'ProfileSettingsSection'
