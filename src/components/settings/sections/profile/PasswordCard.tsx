import type { FC } from 'react'

import type { PasswordFormData } from './types'

interface PasswordCardProps {
  themeColor: string
  currentPwdId: string
  newPwdId: string
  confirmPwdId: string
  passwordData: PasswordFormData
  isChangingPassword: boolean
  passwordSuccess: boolean
  passwordError: string | null
  onPasswordFieldChange: (field: keyof PasswordFormData, value: string) => void
  onChangePassword: () => void
}

export const PasswordCard: FC<PasswordCardProps> = ({
  themeColor,
  currentPwdId,
  newPwdId,
  confirmPwdId,
  passwordData,
  isChangingPassword,
  passwordSuccess,
  passwordError,
  onPasswordFieldChange,
  onChangePassword,
}) => {
  const passwordErrorId = passwordError ? `${newPwdId}-error` : undefined
  const passwordFieldHasError = Boolean(passwordError)

  return (
    <div className="border-t pt-6 space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-1">修改密码</h4>
        <p className="text-sm text-gray-500">为了账户安全，建议定期更新登录密码</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={currentPwdId}>
            当前密码
          </label>
          <input
            id={currentPwdId}
            type="password"
            autoComplete="current-password"
            placeholder="请输入当前密码"
            value={passwordData.currentPassword}
            aria-invalid={passwordFieldHasError || undefined}
            aria-describedby={passwordErrorId}
            onChange={(e) => onPasswordFieldChange('currentPassword', e.target.value)}
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
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={newPwdId}>
            新密码
          </label>
          <input
            id={newPwdId}
            type="password"
            autoComplete="new-password"
            placeholder="至少 8 位"
            value={passwordData.newPassword}
            aria-invalid={passwordFieldHasError || undefined}
            aria-describedby={passwordErrorId}
            onChange={(e) => onPasswordFieldChange('newPassword', e.target.value)}
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
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={confirmPwdId}>
            确认新密码
          </label>
          <input
            id={confirmPwdId}
            type="password"
            autoComplete="new-password"
            placeholder="请再次输入新密码"
            value={passwordData.confirmPassword}
            aria-invalid={passwordFieldHasError || undefined}
            aria-describedby={passwordErrorId}
            onChange={(e) => onPasswordFieldChange('confirmPassword', e.target.value)}
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

      {passwordError && (
        <div
          id={passwordErrorId}
          className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"
          role="alert"
        >
          <span className="text-red-600">❌</span>
          <span className="text-sm text-red-700">{passwordError}</span>
        </div>
      )}

      {passwordSuccess && (
        <div
          className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"
          role="status"
        >
          <span className="text-green-600">✓</span>
          <span className="text-sm text-green-700">密码修改成功！</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onChangePassword}
          disabled={isChangingPassword}
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
          {isChangingPassword ? '保存中…' : '保存新密码'}
        </button>
        <span className="text-xs text-gray-500">建议定期更换密码，并避免与其他网站相同</span>
      </div>
    </div>
  )
}
