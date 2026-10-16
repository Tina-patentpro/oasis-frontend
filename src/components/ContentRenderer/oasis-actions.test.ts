import { describe, expect, test } from '@jest/globals'

import { parseOasisActionsPayload } from './oasis-actions'

describe('parseOasisActionsPayload', () => {
  test('parses valid fill and confirm_fill actions', () => {
    const payload = parseOasisActionsPayload(
      JSON.stringify({
        version: '1.0',
        title: '下一步可以选择：',
        description: '点击后会填入输入框。',
        layout: 'grid',
        actions: [
          {
            id: 'generate_claims',
            label: '生成权利要求书',
            type: 'fill',
            query: '请根据技术交底书生成权利要求书。',
          },
          {
            id: 'save_attachment',
            label: '保存附件',
            type: 'confirm_fill',
            query: '请将本轮附件保存为技术交底书最终版。',
            confirmText: '确认保存？',
          },
        ],
      }),
    )

    expect(payload).not.toBeNull()
    expect(payload?.title).toBe('下一步可以选择：')
    expect(payload?.layout).toBe('grid')
    expect(payload?.actions).toHaveLength(2)
    expect(payload?.actions[0]).toEqual({
      id: 'generate_claims',
      label: '生成权利要求书',
      type: 'fill',
      query: '请根据技术交底书生成权利要求书。',
    })
  })

  test('returns null for invalid JSON', () => {
    expect(parseOasisActionsPayload('{bad json')).toBeNull()
  })

  test('returns null when actions is missing', () => {
    expect(parseOasisActionsPayload(JSON.stringify({ version: '1.0', title: '无按钮' }))).toBeNull()
  })

  test('returns null when any action is invalid', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          actions: [
            { id: 'ok', label: '可用', type: 'fill', query: '请生成权利要求书。' },
            { id: 'bad_type', label: '坏类型', type: 'send', query: '不支持自动发送。' },
          ],
        }),
      ),
    ).toBeNull()
  })

  test('returns null when no valid action remains', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          actions: [
            { id: 'bad_type', label: '坏类型', type: 'send', query: '不支持自动发送。' },
            { id: 'bad_query', label: '空指令', type: 'fill', query: '' },
          ],
        }),
      ),
    ).toBeNull()
  })

  test('returns null when there are duplicate action ids', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          actions: [
            { id: 'same', label: '操作一', type: 'fill', query: '第一条。' },
            { id: 'same', label: '操作二', type: 'fill', query: '第二条。' },
          ],
        }),
      ),
    ).toBeNull()
  })

  test('returns null when confirm_fill does not provide confirmation text', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '保存前确认',
          actions: [
            {
              id: 'save',
              label: '保存附件',
              type: 'confirm_fill',
              query: '请保存附件。',
            },
          ],
        }),
      ),
    ).toBeNull()
  })

  test('returns null when action contains forbidden auto-send fields', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          actions: [
            {
              id: 'auto',
              label: '自动发送',
              type: 'fill',
              query: '请自动发送。',
              auto_send: true,
            },
          ],
        }),
      ),
    ).toBeNull()
  })

  test('returns null when requires contains unknown values', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          actions: [
            {
              id: 'needs_unknown',
              label: '未知依赖',
              type: 'fill',
              query: '请继续。',
              requires: ['attachment', 'unknown'],
            },
          ],
        }),
      ),
    ).toBeNull()
  })

  test('returns null when version or title is missing', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          title: '下一步',
          actions: [{ id: 'ok', label: '可用', type: 'fill', query: '请继续。' }],
        }),
      ),
    ).toBeNull()
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          actions: [{ id: 'ok', label: '可用', type: 'fill', query: '请继续。' }],
        }),
      ),
    ).toBeNull()
  })

  test('returns null when layout is unsupported or malformed', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          layout: 'column',
          actions: [{ id: 'ok', label: '可用', type: 'fill', query: '请继续。' }],
        }),
      ),
    ).toBeNull()

    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          layout: ['grid'],
          actions: [{ id: 'ok', label: '可用', type: 'fill', query: '请继续。' }],
        }),
      ),
    ).toBeNull()
  })

  test('returns null when actions exceed the maximum count', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          actions: Array.from({ length: 8 }, (_, index) => ({
            id: `a${index}`,
            label: `按钮${index}`,
            type: 'fill',
            query: `指令${index}`,
          })),
        }),
      ),
    ).toBeNull()
  })

  test('parses valid payload with allowed requirements', () => {
    const payload = parseOasisActionsPayload(
      JSON.stringify({
        version: '1.0',
        title: '下一步',
        actions: [
          {
            id: 'needs_attachment',
            label: '基于附件生成',
            type: 'fill',
            query: '请基于附件生成权利要求书。',
            requires: ['attachment', 'attachment'],
          },
        ],
      }),
    )

    expect(payload).not.toBeNull()
    expect(payload?.actions).toHaveLength(1)
    expect(payload?.actions[0].requires).toEqual(['attachment'])
  })

  test('returns null when text fields exceed frontend contract limits', () => {
    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '标'.repeat(61),
          actions: [{ id: 'ok', label: '可用', type: 'fill', query: '请继续。' }],
        }),
      ),
    ).toBeNull()

    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          description: '说'.repeat(121),
          actions: [{ id: 'ok', label: '可用', type: 'fill', query: '请继续。' }],
        }),
      ),
    ).toBeNull()

    expect(
      parseOasisActionsPayload(
        JSON.stringify({
          version: '1.0',
          title: '下一步',
          actions: [
            {
              id: 'long',
              label: '按'.repeat(33),
              type: 'confirm_fill',
              query: '查'.repeat(801),
              confirmText: '确'.repeat(121),
            },
          ],
        }),
      ),
    ).toBeNull()
  })

  test('ignores unknown fields and treats dangerous-looking values as plain text', () => {
    const payload = parseOasisActionsPayload(
      JSON.stringify({
        version: '1.0',
        title: '下一步',
        html: '<script>alert(1)</script>',
        actions: [
          {
            id: 'xss',
            label: '<img src=x onerror=alert(1)>',
            type: 'fill',
            query: '<script>alert(1)</script>',
            onclick: 'alert(1)',
          },
        ],
      }),
    )

    expect(payload).not.toBeNull()
    expect(payload?.actions[0]).toEqual({
      id: 'xss',
      label: '<img src=x onerror=alert(1)>',
      type: 'fill',
      query: '<script>alert(1)</script>',
    })
  })
})
