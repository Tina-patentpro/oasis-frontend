import { describe, expect, test } from '@jest/globals'

import type { User, UserDetail } from '@/types/api'

import {
  mergeUserDetailWithFallback,
  normalizeUser,
  parseUserIdLike,
  stripSensitiveFieldsForStorage,
} from './auth-user-normalization'

describe('auth user normalization', () => {
  test('parseUserIdLike supports number and numeric string', () => {
    expect(parseUserIdLike(12)).toBe(12)
    expect(parseUserIdLike('34')).toBe(34)
    expect(parseUserIdLike('abc')).toBeNull()
    expect(parseUserIdLike(null)).toBeNull()
  })

  test('normalizeUser returns null when user id is missing', () => {
    expect(
      normalizeUser({
        username: 'demo',
        phone: '13800000000',
      }),
    ).toBeNull()
  })

  test('mergeUserDetailWithFallback keeps fallback id when /user/detail has no id', () => {
    const fallback: User = {
      id: 101,
      email: 'a@example.com',
      username: 'old_name',
      phone: '13800000000',
      avatarUrl: '',
      balance: 9,
      role: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }

    const detail: UserDetail = {
      username: 'new_name',
      avatar: 'https://example.com/avatar.png',
      phone: '13800000001',
      email: 'new@example.com',
      balance: 88,
      invite_code: 'ABC',
    }

    const merged = mergeUserDetailWithFallback(detail, fallback)
    expect(merged?.id).toBe(101)
    expect(merged?.username).toBe('new_name')
    expect(merged?.balance).toBe(88)
  })

  test('stripSensitiveFieldsForStorage removes phone and balance from persisted user', () => {
    const user = normalizeUser({
      id: 1,
      username: 'demo',
      phone: '13800000000',
      balance: 999,
      email: 'demo@example.com',
      role: 'user',
    })

    expect(user).not.toBeNull()
    const stripped = stripSensitiveFieldsForStorage(user!)

    expect(stripped).not.toBe(user)
    expect(stripped.phone).toBeUndefined()
    expect(stripped.balance).toBe(0)
    expect(stripped.id).toBe(1)
    expect(stripped.username).toBe('demo')
    expect(stripped.email).toBe('demo@example.com')
  })
})
