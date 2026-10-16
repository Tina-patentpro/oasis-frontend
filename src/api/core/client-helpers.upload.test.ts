import { afterEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('./client-app-env', () => ({
  getClientApp: () => 'workarea',
}))

import { ApiError } from '../errors'
import { uploadFileRequest } from './client-helpers'

const originalFetch = globalThis.fetch

afterEach(() => {
  jest.restoreAllMocks()
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

describe('uploadFileRequest', () => {
  test('wraps non-ApiError upload failures with readable message and stable code', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockRejectedValue(new Error('Network failed'))
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    })

    const request = uploadFileRequest<{ ok: boolean }>({
      baseURL: 'https://api.example.com',
      endpoint: '/upload',
      formData: new FormData(),
    })

    await expect(request).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Network failed',
      code: 'UPLOAD_ERROR',
    } satisfies Partial<ApiError>)
  })
})
