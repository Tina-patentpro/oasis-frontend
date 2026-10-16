import React, { useCallback, useRef, useState } from 'react'

import type { User } from '@/types/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { getErrorMessage } from '@/utils/errorHandler'
import { isValidMainlandPhone } from '@/utils/validators'
import { AuthPolicyNotice } from './AuthPolicyNotice'
import { useSmsCode } from './hooks/useSmsCode'

interface LoginFormProps {
  onSuccess?: (user: User) => void
  onError?: (error: string) => void
  onRegisterClick?: () => void
  onForgotPasswordClick?: () => void
}

type LoginErrors = {
  phone?: string
  code?: string
  password?: string
  form?: string
}

type LoginMethod = 'sms' | 'password'

const METHOD_OPTIONS: Array<{ value: LoginMethod; label: string }> = [
  { value: 'sms', label: '短信登录' },
  { value: 'password', label: '密码登录' },
]

export function LoginForm({
  onSuccess,
  onError,
  onRegisterClick,
  onForgotPasswordClick,
}: LoginFormProps) {
  const login = useAuthStore((state) => state.login)
  const loginWithSms = useAuthStore((state) => state.loginWithSms)

  const [method, setMethod] = useState<LoginMethod>('sms')
  const [formData, setFormData] = useState({ phone: '', code: '', password: '' })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<LoginErrors>({})
  const phoneInputRef = useRef<HTMLInputElement | null>(null)
  const codeInputRef = useRef<HTMLInputElement | null>(null)
  const passwordInputRef = useRef<HTMLInputElement | null>(null)

  const focusFirstError = useCallback((nextErrors: LoginErrors) => {
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

  const clearFieldError = useCallback((field: keyof LoginErrors) => {
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

  const {
    isSendDisabled,
    sendButtonLabel,
    handleSendCode,
    resetCountdown,
    phoneErrorMessage: _phoneErrorMessage,
  } = useSmsCode({
    onError: handleSmsError,
    onSendSuccess: handleSmsSuccess,
  })

  const handleMethodChange = useCallback(
    (nextMethod: LoginMethod) => {
      if (nextMethod === method) {
        return
      }
      setMethod(nextMethod)
      setErrors({})
      setIsLoading(false)
      resetCountdown()
    },
    [method, resetCountdown],
  )

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target
      setFormData((prev) => ({ ...prev, [name]: value }))
      clearFieldError(name as keyof LoginErrors)
    },
    [clearFieldError],
  )

  const validateForm = useCallback((): boolean => {
    const nextErrors: LoginErrors = {}

    if (!formData.phone.trim()) {
      nextErrors.phone = '请输入手机号码'
    } else if (!isValidMainlandPhone(formData.phone)) {
      nextErrors.phone = '请输入有效的手机号码'
    }

    if (method === 'sms') {
      if (!formData.code.trim()) {
        nextErrors.code = '请输入短信验证码'
      }
    } else if (method === 'password') {
      if (!formData.password) {
        nextErrors.password = '请输入密码'
      }
    }

    setErrors(nextErrors)
    focusFirstError(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [focusFirstError, formData.code, formData.phone, formData.password, method])

  const onSendCode = useCallback(async () => {
    const validationError = await handleSendCode(formData.phone)
    if (validationError) {
      setErrors((prev) => ({ ...prev, phone: validationError }))
    }
  }, [formData.phone, handleSendCode])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setErrors((prev) => ({ ...prev, form: undefined }))

      if (!validateForm()) {
        return
      }

      setIsLoading(true)
      try {
        let user: User
        if (method === 'sms') {
          // Direct call for SMS login
          const payload: { phone: string; code: string; rememberDurationDays: number } = {
            phone: formData.phone.trim(),
            code: formData.code.trim(),
            rememberDurationDays: 30,
          }
          user = await loginWithSms(payload)
        } else {
          user = await login({
            phone: formData.phone.trim(),
            password: formData.password,
            rememberDurationDays: 30,
          })
        }

        onSuccess?.(user)
      } catch (error) {
        console.error('[LoginForm] 登录失败', error)
        const message = getErrorMessage(error, String(error ?? '未知错误'))
        onError?.(message)
        let nextErrors: LoginErrors
        if (message.includes('验证码')) {
          nextErrors = { code: message }
        } else if (message.includes('手机') || message.includes('账户')) {
          nextErrors = { phone: message }
        } else if (message.includes('密码')) {
          nextErrors = { password: message }
        } else {
          nextErrors = { form: message }
        }
        setErrors(nextErrors)
        focusFirstError(nextErrors)
      } finally {
        setIsLoading(false)
      }
    },
    [focusFirstError, formData, login, loginWithSms, method, onError, onSuccess, validateForm],
  )

  return (
    <div className="mx-auto w-full min-w-0 max-w-md">
      <div className="flex rounded-full bg-gray-100 p-1 text-sm font-medium">
        {METHOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleMethodChange(option.value)}
            className={`flex-1 rounded-full px-3 py-2 transition ${
              method === option.value
                ? 'bg-white text-emerald-600 shadow'
                : 'text-gray-500 hover:text-emerald-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 min-w-0 space-y-6">
        <div className="space-y-4">
          {method === 'sms' ? (
            <>
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
                  aria-describedby={errors.phone ? 'login-phone-error' : undefined}
                />
                {errors.phone ? (
                  <p
                    id="login-phone-error"
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
                    aria-describedby={errors.code ? 'login-code-error' : undefined}
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
                    id="login-code-error"
                    role="alert"
                    aria-label="短信验证码错误"
                    className="mt-1 text-sm text-red-600"
                  >
                    {errors.code}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <>
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
                  aria-describedby={errors.phone ? 'login-phone-error' : undefined}
                />
                {errors.phone ? (
                  <p
                    id="login-phone-error"
                    role="alert"
                    aria-label="手机号码错误"
                    className="mt-1 text-sm text-red-600"
                  >
                    {errors.phone}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                  登录密码
                </label>
                <input
                  ref={passwordInputRef}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full rounded-lg border px-3 py-2 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.password
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300'
                  }`}
                  placeholder="请输入密码"
                  aria-invalid={errors.password ? 'true' : undefined}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                />
                {errors.password ? (
                  <p
                    id="login-password-error"
                    role="alert"
                    aria-label="登录密码错误"
                    className="mt-1 text-sm text-red-600"
                  >
                    {errors.password}
                  </p>
                ) : null}
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              登录状态最长保留 1 小时，关闭浏览器后需重新登录。
            </span>
            {method === 'password' ? (
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-sm font-medium text-emerald-600 transition hover:text-emerald-500"
              >
                忘记密码？
              </button>
            ) : null}
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

        <AuthPolicyNotice action="登录" />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? '正在登录…' : '登录账号'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        <span>还没有账号？</span>
        <button
          type="button"
          onClick={onRegisterClick}
          className="ml-2 font-medium text-emerald-600 transition hover:text-emerald-500"
        >
          立即注册
        </button>
      </div>
    </div>
  )
}
