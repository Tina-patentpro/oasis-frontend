import type { RechargeConfig } from '@/types/api'

export const MAINLAND_PHONE_REGEX = /^1[3-9]\d{9}$/
export const PASSWORD_MIN_LENGTH = 8

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function isValidMainlandPhone(phone: string): boolean {
  return MAINLAND_PHONE_REGEX.test(phone.trim())
}

export function validatePasswordMinLength(password: string): ValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `密码长度至少为${PASSWORD_MIN_LENGTH}位`,
    }
  }

  return { valid: true }
}

export function validateRechargeAmountInput(
  value: string,
  rechargeConfig: Pick<RechargeConfig, 'allow_decimal' | 'max_amount' | 'min_amount'> | null,
): ValidationResult {
  if (!value.trim()) {
    return { valid: false, error: '请输入充值金额' }
  }

  if (!/^\d*\.?\d{0,2}$/.test(value)) {
    return { valid: false, error: '请输入有效金额（最多两位小数）' }
  }

  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return { valid: false, error: '请输入有效的充值金额' }
  }

  const minAmount = rechargeConfig?.min_amount ?? 1
  const maxAmount = rechargeConfig?.max_amount

  if (rechargeConfig?.allow_decimal === 0 && amount !== Math.floor(amount)) {
    return { valid: false, error: '当前配置仅支持整数金额' }
  }

  if (amount < minAmount) {
    return { valid: false, error: `最低充值${minAmount}元` }
  }

  if (typeof maxAmount === 'number' && amount > maxAmount) {
    return { valid: false, error: `最高充值${maxAmount}元` }
  }

  return { valid: true }
}
