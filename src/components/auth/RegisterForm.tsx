import React, { useCallback, useRef, useState } from 'react'

import type { RegisterRequest, User } from '@/types/api'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  PASSWORD_MIN_LENGTH,
  isValidMainlandPhone,
  validatePasswordMinLength,
} from '@/utils/validators'
import { AuthPolicyNotice } from './AuthPolicyNotice'
import { useSmsCode } from './hooks/useSmsCode'

interface RegisterFormProps {
  onSuccess?: (user: User) => void
  onError?: (error: string) => void
  onLoginClick?: () => void
}

type RegisterErrors = {
  phone?: string
  code?: string
  password?: string
  form?: string
}

export function RegisterForm({ onSuccess, onError, onLoginClick }: RegisterFormProps) {
  const register = useAuthStore((state) => state.register)

  const [formData, setFormData] = useState({
    phone: '',
    code: '',
    password: '',
    invitationCode: '',
  })
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const phoneInputRef = useRef<HTMLInputElement | null>(null)
  const codeInputRef = useRef<HTMLInputElement | null>(null)
  const passwordInputRef = useRef<HTMLInputElement | null>(null)

  const focusFirstError = useCallback((nextErrors: RegisterErrors) => {
    if (nextErrors.phone) {
      phoneInputRef.current?.focus()
      return
    }
    if (nextErrors.code) {
      codeInputRef.current?.focus()
      return
    }
    if (nextErrors.password) {
      passwordInputRef.current?.focus()
    }
  }, [])

  const clearFieldError = useCallback((field: keyof RegisterErrors) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev
      }
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleSmsError = useCallback(
    (message: string) => {
      setErrors((prev) => ({ ...prev, form: message }))
      onError?.(message)
    },
    [onError],
  )

  const handleSmsSuccess = useCallback(() => {
    clearFieldError('form')
  }, [clearFieldError])

  const { isSendDisabled, sendButtonLabel, handleSendCode } = useSmsCode({
    onError: handleSmsError,
    onSendSuccess: handleSmsSuccess,
  })

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target
      setFormData((prev) => ({ ...prev, [name]: value }))
      clearFieldError(name as keyof RegisterErrors)
    },
    [clearFieldError],
  )

  const validateForm = useCallback((): boolean => {
    const nextErrors: RegisterErrors = {}

    if (!formData.phone.trim()) {
      nextErrors.phone = '请输入手机号码'
    } else if (!isValidMainlandPhone(formData.phone)) {
      nextErrors.phone = '请输入有效的手机号码'
    }

    if (!formData.code.trim()) {
      nextErrors.code = '请输入短信验证码'
    }

    if (!formData.password.trim()) {
      nextErrors.password = '请输入密码'
    } else {
      const passwordValidation = validatePasswordMinLength(formData.password)
      if (!passwordValidation.valid) {
        nextErrors.password = passwordValidation.error
      }
    }

    setErrors(nextErrors)
    focusFirstError(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [focusFirstError, formData.code, formData.phone, formData.password])

  const onSendCode = useCallback(async () => {
    const validationError = await handleSendCode(formData.phone)
    if (validationError) {
      setErrors((prev) => ({ ...prev, phone: validationError }))
    }
  }, [formData.phone, handleSendCode])

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!validateForm()) {
        return
      }

      setIsLoading(true)
      setErrors({})

      const payload: RegisterRequest = {
        phone: formData.phone.trim(),
        code: formData.code.trim(),
        password: formData.password,
        invitationCode: formData.invitationCode.trim() || undefined,
        acceptTerms: true,
      }

      try {
        const user = await register(payload)
        onSuccess?.(user)
      } catch (error) {
        const message = error instanceof Error ? error.message : '注册失败，请稍后再试'
        setErrors((prev) => ({ ...prev, form: message }))
        onError?.(message)
      } finally {
        setIsLoading(false)
      }
    },
    [formData, onError, onSuccess, register, validateForm],
  )

  return (
    <div className="mx-auto w-full min-w-0 max-w-md">
      <form onSubmit={handleSubmit} className="mt-6 min-w-0 space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
              手机号码
            </label>
            <input
              ref={phoneInputRef}
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full rounded-lg border px-3 py-2 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.phone
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300'
              }`}
              placeholder="请输入手机号码"
              aria-invalid={errors.phone ? 'true' : undefined}
              aria-describedby={errors.phone ? 'register-phone-error' : undefined}
            />
            {errors.phone ? (
              <p
                id="register-phone-error"
                role="alert"
                aria-label="手机号码错误"
                className="mt-1 text-sm text-red-600"
              >
                {errors.phone}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="code" className="mb-2 block text-sm font-medium text-gray-700">
              短信验证码
            </label>
            <div className="flex min-w-0 gap-2 sm:gap-3">
              <input
                ref={codeInputRef}
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={formData.code}
                onChange={handleChange}
                disabled={isLoading}
                className={`min-w-0 flex-1 rounded-lg border px-3 py-2 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.code
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300'
                }`}
                placeholder="请输入短信验证码"
                aria-invalid={errors.code ? 'true' : undefined}
                aria-describedby={errors.code ? 'register-code-error' : undefined}
              />
              <button
                type="button"
                onClick={onSendCode}
                disabled={isSendDisabled}
                className="w-28 shrink-0 whitespace-nowrap rounded-lg border border-emerald-200 bg-white text-sm font-medium text-emerald-600 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-32"
              >
                {sendButtonLabel}
              </button>
            </div>
            {errors.code ? (
              <p
                id="register-code-error"
                role="alert"
                aria-label="短信验证码错误"
                className="mt-1 text-sm text-red-600"
              >
                {errors.code}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
              设置密码
            </label>
            <input
              ref={passwordInputRef}
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full rounded-lg border px-3 py-2 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.password
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300'
              }`}
              placeholder={`请输入密码（至少${PASSWORD_MIN_LENGTH}位）`}
              aria-invalid={errors.password ? 'true' : undefined}
              aria-describedby={errors.password ? 'register-password-error' : undefined}
            />
            {errors.password ? (
              <p
                id="register-password-error"
                role="alert"
                aria-label="设置密码错误"
                className="mt-1 text-sm text-red-600"
              >
                {errors.password}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="invitationCode"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              邀请码（选填）
            </label>
            <input
              id="invitationCode"
              name="invitationCode"
              type="text"
              value={formData.invitationCode}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="请输入邀请码"
            />
          </div>
        </div>

        {errors.form ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          >
            {errors.form}
          </div>
        ) : null}

        <AuthPolicyNotice action="注册" />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? '正在注册…' : '注册账号'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        <button
          type="button"
          onClick={onLoginClick}
          className="font-medium text-emerald-600 transition hover:text-emerald-500"
        >
          已有账号？立即登录
        </button>
      </div>
    </div>
  )
}
