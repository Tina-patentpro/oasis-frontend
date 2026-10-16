import { describe, expect, jest, test } from '@jest/globals'

import {
  mapProjectListItemToSession,
  mapSessionDetailRawToDetail,
} from './session-service-normalizers'

describe('session service normalizers', () => {
  test('preserves a missing list type instead of silently converting it to workflow', () => {
    const session = mapProjectListItemToSession({
      id: 11,
      name: '旧式记录',
      created_at: '2026-07-17T00:00:00.000Z',
    })

    expect(session.type).toBeUndefined()
  })

  test('preserves a missing detail type so the list payload can remain a fallback', () => {
    const detail = mapSessionDetailRawToDetail(
      {
        id: 12,
        name: '旧式详情',
        created_at: '2026-07-17T00:00:00.000Z',
      },
      12,
    )

    expect(detail.type).toBeUndefined()
  })

  test('keeps an explicit detail type', () => {
    const detail = mapSessionDetailRawToDetail(
      {
        id: 13,
        name: '聊天详情',
        type: 2,
        created_at: '2026-07-17T00:00:00.000Z',
      },
      13,
    )

    expect(detail.type).toBe(2)
  })

  test('distinguishes a missing project field from an explicit no-project value', () => {
    const missing = mapSessionDetailRawToDetail(
      {
        id: 14,
        name: '项目字段缺失',
        created_at: '2026-07-17T00:00:00.000Z',
      },
      14,
    )
    const explicitNull = mapSessionDetailRawToDetail(
      {
        id: 15,
        name: '明确无项目',
        folder_id: null,
        created_at: '2026-07-17T00:00:00.000Z',
      },
      15,
    )
    const explicitZero = mapProjectListItemToSession({
      id: 16,
      name: '列表明确无项目',
      folder_id: 0,
      created_at: '2026-07-17T00:00:00.000Z',
    })

    expect(missing.projectId).toBeUndefined()
    expect(explicitNull.projectId).toBeNull()
    expect(explicitZero.projectId).toBeNull()
  })

  test('keeps a positive project id when the field is present', () => {
    const detail = mapSessionDetailRawToDetail(
      {
        id: 17,
        name: '子项目记录',
        folder_id: 33,
        created_at: '2026-07-17T00:00:00.000Z',
      },
      17,
    )

    expect(detail.projectId).toBe(33)
  })

  test('classifies a legacy list chat from conversation metadata when top-level type is missing', () => {
    const session = mapProjectListItemToSession({
      id: 18,
      name: '旧工作聚焦聊天',
      created_at: '2026-07-17T00:00:00.000Z',
      inputs: {
        type: 1,
        conversation_id: 'conversation-list-18',
      },
    })

    expect(session.type).toBeUndefined()
    expect(session.conversationId).toBe('conversation-list-18')
    expect(session.toolType).toBe('chat.focus')
  })

  test('classifies a legacy detail chat from response conversation metadata', () => {
    const detail = mapSessionDetailRawToDetail(
      {
        id: 19,
        name: '旧语义生图聊天',
        created_at: '2026-07-17T00:00:00.000Z',
        inputs: { type: 2 },
        response: { conversation_id: 'conversation-detail-19' },
      },
      19,
    )

    expect(detail.type).toBeUndefined()
    expect(detail.conversationId).toBe('conversation-detail-19')
    expect(detail.toolType).toBe('chat.image')
  })

  test('keeps an explicit workflow type authoritative even with conversation metadata', () => {
    const session = mapProjectListItemToSession({
      id: 20,
      name: '明确工作流',
      type: 1,
      created_at: '2026-07-17T00:00:00.000Z',
      inputs: {
        type: 2,
        conversation_id: 'conversation-workflow-20',
      },
    })

    expect(session.toolType).toBe('workflow')
  })

  test('does not treat inputs.type alone as chat evidence', () => {
    const session = mapProjectListItemToSession({
      id: 21,
      name: '普通工作流输入',
      created_at: '2026-07-17T00:00:00.000Z',
      inputs: { type: 1 },
    })

    expect(session.toolType).toBe('workflow')
    expect(session.conversationId).toBeNull()
  })

  test('does not log malformed session inputs content', () => {
    const sensitiveMarker = 'private-session-input-marker'
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    try {
      mapProjectListItemToSession({
        id: 22,
        name: '损坏输入记录',
        created_at: '2026-07-17T00:00:00.000Z',
        inputs: `{${sensitiveMarker}`,
      })

      const consoleOutput = consoleErrorSpy.mock.calls.flat().join(' ')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SessionService] Failed to parse inputs as JSON:',
      )
      expect(consoleErrorSpy.mock.calls.every((call) => call.length === 1)).toBe(true)
      expect(consoleOutput).not.toContain(sensitiveMarker)
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
