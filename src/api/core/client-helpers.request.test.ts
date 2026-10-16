import { afterEach, describe, expect, jest, test } from '@jest/globals'

const mockGetAccessToken = jest.fn<() => string | null>()

jest.mock('./client-app-env', () => ({
  getClientApp: () => 'workarea',
}))

jest.mock('./token-storage', () => ({
  getAccessToken: () => mockGetAccessToken(),
  clearAccessToken: jest.fn(),
}))

import { ApiError } from '../errors'
import { buildQueryString, performRequest } from './client-helpers'

const originalFetch = globalThis.fetch

type TestResponseInit = {
  status?: number
  statusText?: string
  headers?: Record<string, string>
}

function jsonResponse(payload: unknown, init?: TestResponseInit): Response {
  const status = init?.status ?? 200
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...init?.headers,
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init?.statusText ?? '',
    headers: {
      get: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? null,
    },
    text: async () => body,
    json: async () => payload,
  } as Response
}

afterEach(() => {
  jest.restoreAllMocks()
  mockGetAccessToken.mockReset()
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: originalFetch,
    })
  } else {
    delete (globalThis as { fetch?: typeof fetch }).fetch
  }
})

describe('client-helpers performRequest', () => {
  test('injects app and authorization headers before parsing a successful JSON response', async () => {
    mockGetAccessToken.mockReturnValue('token-123')
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        code: 0,
        data: {
          ok: true,
        },
      }),
    )
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    })

    const result = await performRequest<{ ok: boolean }>({
      baseURL: 'https://api.example.com',
      endpoint: '/items',
      options: {
        method: 'GET',
        headers: {
          'X-Trace-Id': 'trace-1',
        },
      },
      clearToken: jest.fn(),
      onUnauthorized: jest.fn(async () => {}),
    })

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/items',
      expect.objectContaining({
        method: 'GET',
      }),
    )
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Client-App': 'workarea',
      Authorization: 'Bearer token-123',
      'X-Trace-Id': 'trace-1',
    })
  })

  test('clears auth state and invokes unauthorized handler on 401 responses', async () => {
    mockGetAccessToken.mockReturnValue('expired-token')
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          detail: 'token expired',
        },
        {
          status: 401,
          statusText: 'Unauthorized',
        },
      ),
    )
    const clearToken = jest.fn()
    const onUnauthorized = jest.fn(async () => {})
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    })

    await expect(
      performRequest({
        baseURL: 'https://api.example.com',
        endpoint: '/secure',
        options: {
          method: 'GET',
        },
        clearToken,
        onUnauthorized,
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      code: 'AUTH_UNAUTHORIZED',
      statusCode: 401,
      message: '未授权，请重新登录',
    } satisfies Partial<ApiError>)

    expect(clearToken).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  test('normalizes structured validation detail into a readable ApiError message', async () => {
    mockGetAccessToken.mockReturnValue(null)
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          detail: [
            {
              loc: ['body', 'name'],
              msg: '字段必填',
            },
          ],
        },
        {
          status: 422,
          statusText: 'Unprocessable Entity',
        },
      ),
    )
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    })

    await expect(
      performRequest({
        baseURL: 'https://api.example.com',
        endpoint: '/items',
        options: {
          method: 'POST',
          body: JSON.stringify({}),
        },
        clearToken: jest.fn(),
        onUnauthorized: jest.fn(async () => {}),
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      code: 'HTTP_ERROR',
      statusCode: 422,
      message: '字段必填 (body.name)',
    } satisfies Partial<ApiError>)
  })
})

describe('client-helpers buildQueryString', () => {
  test('skips empty values and serializes arrays without undefined or null entries', () => {
    expect(
      buildQueryString({
        keyword: 'demo',
        page: 2,
        status: undefined,
        tags: ['a', null, 'b', undefined],
        emptyTags: [null, undefined],
      }),
    ).toBe('?keyword=demo&page=2&tags=a%2Cb')
  })
})
