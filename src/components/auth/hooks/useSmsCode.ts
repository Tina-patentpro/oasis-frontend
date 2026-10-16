import { useCallback, useEffect, useMemo, useState } from 'react'

import { authService } from '@/api/services'
import { getErrorMessage } from '@/utils/errorHandler'
import { isValidMainlandPhone } from '@/utils/validators'

const COUNTDOWN_SECONDS = 60

interface UseSmsCodeOptions {
  /** Callback invoked with an error message when sending fails */
  onError?: (message: string) => void
  /** Callback to clear the form-level error after a successful send */
  onSendSuccess?: () => void
}

export function useSmsCode({ onError, onSendSuccess }: UseSmsCodeOptions) {
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)

  // Countdown timer
  useEffect(() => {
    if (codeCountdown <= 0) {
      return
    }
    const timer = window.setInterval(() => {
      setCodeCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [codeCountdown])

  /** Validate phone number format */
  const validatePhone = useCallback((phone: string): boolean => {
    return isValidMainlandPhone(phone)
  }, [])

  /** Phone validation error message */
  const phoneErrorMessage = '请输入有效的手机号码'

  /**
   * Send SMS verification code.
   * Returns the phone validation error message if validation fails, or `undefined` on success.
   */
  const handleSendCode = useCallback(
    async (phone: string): Promise<string | undefined> => {
      if (isSendingCode || codeCountdown > 0) {
        return undefined
      }

      const trimmed = phone.trim()
      if (!isValidMainlandPhone(trimmed)) {
        return phoneErrorMessage
      }

      setIsSendingCode(true)
      try {
        await authService.sendSmsCode({ phone: trimmed })
        setCodeCountdown(COUNTDOWN_SECONDS)
        onSendSuccess?.()
        return undefined
      } catch (error) {
        const message = getErrorMessage(error, '验证码发送失败，请稍后再试')
        onError?.(message)
        return undefined
      } finally {
        setIsSendingCode(false)
      }
    },
    [codeCountdown, isSendingCode, onError, onSendSuccess],
  )

  /** Reset the countdown (e.g. when switching login methods) */
  const resetCountdown = useCallback(() => {
    setCodeCountdown(0)
  }, [])

  /** Label to display on the send-code button */
  const sendButtonLabel = useMemo(() => {
    if (isSendingCode) {
      return '发送中...'
    }
    if (codeCountdown > 0) {
      return `${codeCountdown}s`
    }
    return '发送验证码'
  }, [codeCountdown, isSendingCode])

  /** Whether the send button should be disabled */
  const isSendDisabled = isSendingCode || codeCountdown > 0

  return {
    codeCountdown,
    isSendingCode,
    isSendDisabled,
    sendButtonLabel,
    validatePhone,
    phoneErrorMessage,
    handleSendCode,
    resetCountdown,
  }
}
