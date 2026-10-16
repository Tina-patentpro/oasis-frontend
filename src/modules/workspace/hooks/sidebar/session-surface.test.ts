import { describe, expect, test } from '@jest/globals'

import type { Session, SessionDetail } from '@/types/api'
import {
  mapProjectListItemToSession,
  mapSessionDetailRawToDetail,
} from '@/api/services/session-service-normalizers'

import { resolveSessionSurface } from './session-surface'

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    userId: 1,
    title: '历史会话',
    toolType: 'workflow',
    modelVersion: 'fast',
    status: 'completed',
    createdAt: '2026-07-17T00:00:00.000Z',
    updatedAt: '2026-07-17T00:00:00.000Z',
    ...overrides,
  }
}

describe('resolveSessionSurface', () => {
  test('uses the fetched detail type as the authoritative classification', () => {
    const session = createSession({ type: 2, toolType: 'chat.general' })
    const detail = createSession({ type: 1, toolType: 'workflow' }) as SessionDetail

    expect(resolveSessionSurface(session, detail)).toBe('workflow')
  })

  test('falls back to the list type when detail omits type', () => {
    const session = createSession({ type: 2, toolType: 'chat.general' })
    const detail = createSession({ type: undefined, toolType: 'workflow' }) as SessionDetail

    expect(resolveSessionSurface(session, detail)).toBe('chat')
  })

  test('recognizes legacy chat tool metadata when both payloads omit type', () => {
    const session = createSession({ type: undefined, toolType: 'chat.focus' })
    const detail = createSession({ type: undefined, toolType: 'workflow' }) as SessionDetail

    expect(resolveSessionSurface(session, detail)).toBe('chat')
  })

  test('defaults unknown records to the workflow surface', () => {
    const session = createSession({ type: undefined, toolType: 'workflow' })
    const detail = createSession({ type: undefined, toolType: 'workflow' }) as SessionDetail

    expect(resolveSessionSurface(session, detail)).toBe('workflow')
  })

  test('recognizes legacy chat from real normalized conversation metadata', () => {
    const session = mapProjectListItemToSession({
      id: 22,
      name: '旧通用聊天',
      created_at: '2026-07-17T00:00:00.000Z',
      inputs: { type: 3, conversation_id: 'conversation-list-22' },
    })
    const detail = mapSessionDetailRawToDetail(
      {
        id: 22,
        name: '旧通用聊天详情',
        created_at: '2026-07-17T00:00:00.000Z',
        inputs: { type: 3 },
        response: { conversation_id: 'conversation-detail-22' },
      },
      22,
    )

    expect(session.type).toBeUndefined()
    expect(detail.type).toBeUndefined()
    expect(session.conversationId).toBe('conversation-list-22')
    expect(detail.conversationId).toBe('conversation-detail-22')
    expect(session.toolType).toBe('chat.general')
    expect(detail.toolType).toBe('chat.general')
    expect(resolveSessionSurface(session, detail)).toBe('chat')
  })

  test('uses conversation id as a defensive fallback when tool metadata is unknown', () => {
    const session = createSession({
      type: undefined,
      toolType: 'workflow',
      conversationId: 'conversation-fallback',
    } as any)
    const detail = createSession({ type: undefined, toolType: 'workflow' }) as SessionDetail

    expect(resolveSessionSurface(session, detail)).toBe('chat')
  })
})
