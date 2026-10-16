import type { User, UserDetail } from '@/types/api'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function pickString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function pickNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

export function parseUserIdLike(value: unknown): number | null {
  const parsed = pickNumber(value)
  if (parsed == null || !Number.isInteger(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

export function normalizeUser(raw: unknown): User | null {
  if (!isRecord(raw)) {
    return null
  }

  const id =
    parseUserIdLike(raw['id']) ??
    parseUserIdLike(raw['userId']) ??
    parseUserIdLike(raw['user_id']) ??
    parseUserIdLike(raw['uid'])
  if (id == null) {
    return null
  }

  const now = new Date().toISOString()
  const role = raw['role'] === 'admin' ? 'admin' : 'user'
  const username = pickString(raw['username']) ?? `user_${id}`
  const email = pickString(raw['email']) ?? ''
  const phone = pickString(raw['phone'])
  const avatarUrl = pickString(raw['avatarUrl']) ?? pickString(raw['avatar'])
  const balance = pickNumber(raw['balance']) ?? 0
  const createdAt =
    pickString(raw['createdAt']) ??
    pickString(raw['created_at']) ??
    pickString(raw['register_time']) ??
    now
  const updatedAt =
    pickString(raw['updatedAt']) ??
    pickString(raw['updated_at']) ??
    pickString(raw['last_login_time']) ??
    createdAt

  const normalized: User = {
    id,
    email,
    username,
    balance,
    role,
    createdAt,
    updatedAt,
  }
  if (phone) {
    normalized.phone = phone
  }
  if (avatarUrl) {
    normalized.avatarUrl = avatarUrl
  }
  return normalized
}

export function mergeUserDetailWithFallback(
  detail: UserDetail | null | undefined,
  fallbackUser: User | null,
): User | null {
  const normalizedFallback = fallbackUser ? normalizeUser(fallbackUser) : null
  if (!detail || !isRecord(detail)) {
    return normalizedFallback
  }
  const detailRecord = detail as Record<string, unknown>

  const detailWithFallbackId = {
    ...detail,
    id:
      detailRecord['id'] ??
      detailRecord['userId'] ??
      detailRecord['user_id'] ??
      detailRecord['uid'] ??
      normalizedFallback?.id ??
      null,
    role: normalizedFallback?.role ?? 'user',
    createdAt: normalizedFallback?.createdAt,
    updatedAt:
      detailRecord['updatedAt'] ??
      detailRecord['updated_at'] ??
      detailRecord['last_login_time'] ??
      new Date().toISOString(),
    avatarUrl: detailRecord['avatar'],
  }

  return normalizeUser(detailWithFallbackId) ?? normalizedFallback
}

/**
 * 写入 localStorage 前移除敏感字段。
 *
 * localStorage 对同源脚本可读,所以这里只保留首屏快速显示需要的用户骨架。
 * 内存态 user 仍保留接口返回的真实 phone 和 balance,供设置页等业务界面使用。
 */
export function stripSensitiveFieldsForStorage(user: User): User {
  return {
    ...user,
    phone: undefined,
    balance: 0,
  }
}
