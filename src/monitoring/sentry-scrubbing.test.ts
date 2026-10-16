import { describe, expect, test } from '@jest/globals'

import { sanitizeSentryEvent } from './sentry-scrubbing'

describe('sanitizeSentryEvent', () => {
  test('removes sensitive request headers and cookies', () => {
    const event = sanitizeSentryEvent({
      request: {
        headers: {
          Authorization: 'Bearer token-123456',
          Cookie: 'sid=secret',
          Accept: 'application/json',
        },
        cookies: { sid: 'secret' },
      },
    })

    expect(event.request?.headers).toEqual({ Accept: 'application/json' })
    expect(event.request?.cookies).toBeUndefined()
  })

  test('scrubs sensitive values inside extra and breadcrumbs', () => {
    const event = sanitizeSentryEvent({
      request: {
        url: 'https://example.com/path?token=abc123&ok=1',
      },
      extra: {
        message: '用户 13812345678 邮箱 test@example.com',
        nested: {
          accessToken: 'abc123',
          url: 'https://example.com/a?access_token=secret',
        },
      },
      breadcrumbs: [
        {
          message: 'POST /login phone=13812345678',
          data: {
            email: 'test@example.com',
            redirect: 'https://example.com/callback?auth=secret',
          },
        },
      ],
    })

    expect(event.request?.url).toBe('https://example.com/path?token=[Filtered]&ok=1')
    expect(event.extra?.message).toBe('用户 [FilteredPhone] 邮箱 [FilteredEmail]')
    expect((event.extra?.nested as Record<string, unknown>).accessToken).toBe('[Filtered]')
    expect((event.extra?.nested as Record<string, unknown>).url).toBe(
      'https://example.com/a?access_token=[Filtered]',
    )
    expect(event.breadcrumbs?.[0]?.message).toBe('POST /login phone=[FilteredPhone]')
    expect(event.breadcrumbs?.[0]?.data).toEqual({
      email: '[FilteredEmail]',
      redirect: 'https://example.com/callback?auth=[Filtered]',
    })
  })

  test('scrubs request bodies, tags, contexts and user data before sending', () => {
    const event = sanitizeSentryEvent({
      request: {
        data: {
          password: 'secret-password',
          phone: '13812345678',
        },
        body: 'email=test@example.com&access_token=secret',
      },
      tags: {
        account: '13812345678',
        accessToken: 'secret-token',
      },
      contexts: {
        auth: {
          bearer: 'Bearer abc.def.ghi',
        },
      },
      user: {
        email: 'test@example.com',
        phone: '13812345678',
      },
    })

    expect(event.request?.data).toEqual({
      password: '[Filtered]',
      phone: '[FilteredPhone]',
    })
    expect(event.request?.body).toBe('email=[FilteredEmail]&access_token=[Filtered]')
    expect(event.tags).toEqual({
      account: '[FilteredPhone]',
      accessToken: '[Filtered]',
    })
    expect(event.contexts).toEqual({ auth: '[Filtered]' })
    expect(event.user).toEqual({
      email: '[FilteredEmail]',
      phone: '[FilteredPhone]',
    })
  })
})
