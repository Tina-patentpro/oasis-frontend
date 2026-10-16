import { describe, expect, it } from '@jest/globals'

import { ApiError } from '../errors'
import { parseResponse } from './response-parser'

function createJsonResponse(payload: unknown, status = 200): Response {
  const body = JSON.stringify(payload)
  return {
    status,
    headers: {
      get: (key: string) => (key.toLowerCase() === 'content-type' ? 'application/json' : null),
    } as Headers,
    text: async () => body,
  } as Response
}

function createTextResponse(body: string, status = 200): Response {
  return {
    status,
    headers: {
      get: (key: string) => (key.toLowerCase() === 'content-type' ? 'application/json' : null),
    } as Headers,
    text: async () => body,
  } as Response
}

describe('parseResponse code-data envelopes', () => {
  it('accepts code = 0 as success response', async () => {
    const response = createJsonResponse({
      code: 0,
      message: 'success',
      data: { ok: true },
    })

    const parsed = await parseResponse<{ ok: boolean }>(response)

    expect(parsed).toEqual({ ok: true })
  })

  it('throws ApiError for non-success code-data responses', async () => {
    const response = createJsonResponse({
      code: 500,
      message: 'server failed',
      data: null,
    })

    await expect(parseResponse(response)).rejects.toBeInstanceOf(ApiError)
  })

  it('keeps INVALID_RESPONSE as the ApiError code for malformed JSON', async () => {
    const response = createTextResponse('{ malformed json')

    await expect(parseResponse(response)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      statusCode: 200,
    })
    await expect(parseResponse(response)).rejects.not.toMatchObject({
      message: 'INVALID_RESPONSE',
    })
  })
})
