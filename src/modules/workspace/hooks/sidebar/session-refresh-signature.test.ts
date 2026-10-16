import { describe, expect, test } from '@jest/globals'

import type { Session } from '@/types/api'

import { buildSessionRefreshDigest, detectSessionRefreshSignal } from './session-refresh-signature'

function buildSession(id: number, overrides?: Partial<Session>): Session {
  return {
    id,
    userId: 1,
    title: `会话-${id}`,
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('session refresh signature', () => {
  test('returns strong signal when new session id appears', () => {
    const previous = buildSessionRefreshDigest([buildSession(1)])
    const next = buildSessionRefreshDigest([buildSession(1), buildSession(2)])

    expect(detectSessionRefreshSignal(previous, next)).toBe('strong')
  })

  test('returns strong signal when existing session gets answer text', () => {
    const previous = buildSessionRefreshDigest([buildSession(1, { answer_text: '' })])
    const next = buildSessionRefreshDigest([buildSession(1, { answer_text: '已生成完整内容' })])

    expect(detectSessionRefreshSignal(previous, next)).toBe('strong')
  })

  test('returns strong signal when existing session gets file url', () => {
    const previous = buildSessionRefreshDigest([buildSession(1, { file_url: '' })])
    const next = buildSessionRefreshDigest([
      buildSession(1, { file_url: 'https://example.com/file.docx' }),
    ])

    expect(detectSessionRefreshSignal(previous, next)).toBe('strong')
  })

  test('returns weak signal when answer text length increases', () => {
    const previous = buildSessionRefreshDigest([buildSession(1, { answer_text: '摘要' })])
    const next = buildSessionRefreshDigest([
      buildSession(1, { answer_text: '摘要\n\n补充了更完整的正文内容' }),
    ])

    expect(detectSessionRefreshSignal(previous, next)).toBe('weak')
  })

  test('returns none when only title changes', () => {
    const previous = buildSessionRefreshDigest([buildSession(1, { title: '旧标题' })])
    const next = buildSessionRefreshDigest([buildSession(1, { title: '新标题' })])

    expect(detectSessionRefreshSignal(previous, next)).toBe('none')
  })
})
