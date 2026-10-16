import type { ChangeEvent, FC, RefObject } from 'react'

import type { ProfileFormData } from './types'

interface ProfileInfoCardProps {
  themeColor: string
  avatarUrl: string
  formData: ProfileFormData
  fileInputRef: RefObject<HTMLInputElement | null>
  avatarInputId: string
  usernameId: string
  phoneId: string
  emailId: string
  saveError: string | null
  saveSuccess: boolean
  isSaving: boolean
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onFormFieldChange: (field: keyof ProfileFormData, value: string) => void
  onSaveChanges: () => void
}

export const ProfileInfoCard: FC<ProfileInfoCardProps> = ({
  themeColor,
  avatarUrl,
  formData,
  fileInputRef,
  avatarInputId,
  usernameId,
  phoneId,
  emailId,
  saveError,
  saveSuccess,
  isSaving,
  onAvatarUpload,
  onFormFieldChange,
  onSaveChanges,
}) => (
  <div className="space-y-3">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={avatarInputId}>
        头像
      </label>
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-2xl overflow-hidden"
          style={{ backgroundColor: `${themeColor}15` }}
        >
          {formData.avatar || avatarUrl ? (
            <img
              src={formData.avatar || avatarUrl}
              alt="头像"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            '👤'
          )}
        </div>
        <input
          id={avatarInputId}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onAvatarUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          更换头像
        </button>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={usernameId}>
          用户名
        </label>
        <input
          id={usernameId}
          type="text"
          value={formData.username}
          onChange={(e) => onFormFieldChange('username', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-2"
          onFocus={(event) => {
            event.target.style.borderColor = themeColor
          }}
          onBlur={(event) => {
            event.target.style.borderColor = '#d1d5db'
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={phoneId}>
          手机号
        </label>
        <input
          id={phoneId}
          type="tel"
          value={formData.phone}
          onChange={(e) => onFormFieldChange('phone', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-2"
          onFocus={(event) => {
            event.target.style.borderColor = themeColor
          }}
          onBlur={(event) => {
            event.target.style.borderColor = '#d1d5db'
          }}
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={emailId}>
        邮箱
      </label>
      <input
        id={emailId}
        type="email"
        value={formData.email}
        onChange={(e) => onFormFieldChange('email', e.target.value)}
        placeholder="未设置"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-2"
        onFocus={(event) => {
          event.target.style.borderColor = themeColor
        }}
        onBlur={(event) => {
          event.target.style.borderColor = '#d1d5db'
        }}
      />
    </div>

    {saveError && (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"
        role="alert"
      >
        <span className="text-red-600">❌</span>
        <span className="text-sm text-red-700">{saveError}</span>
      </div>
    )}

    {saveSuccess && (
      <div
        className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"
        role="status"
      >
        <span className="text-green-600">✓</span>
        <span className="text-sm text-green-700">保存成功！</span>
      </div>
    )}

    <div className="pt-2">
      <button
        type="button"
        onClick={onSaveChanges}
        disabled={isSaving}
        className="px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: themeColor }}
        onMouseEnter={(event) => {
          if (!event.currentTarget.disabled) {
            event.currentTarget.style.opacity = '0.9'
          }
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.opacity = '1'
        }}
      >
        {isSaving ? '保存中…' : '保存更改'}
      </button>
    </div>
  </div>
)
