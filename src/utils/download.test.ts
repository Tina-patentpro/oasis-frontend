import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('@/config/runtime-env', () => ({
  getViteApiBaseUrl: jest.fn(() => 'https://api.example.com/download/'),
}))

import { downloadFromUrl, resolveDownloadUrl, triggerDownload } from './download'

describe('download utilities', () => {
  const originalCreateElement = document.createElement.bind(document)
  let anchorClickMock: jest.Mock
  let fetchMock: jest.Mock
  let createdAnchors: HTMLAnchorElement[]

  beforeEach(() => {
    anchorClickMock = jest.fn()
    fetchMock = jest.fn() as jest.Mock
    createdAnchors = []
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
      writable: true,
    })
    jest.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'a') {
        createdAnchors.push(element as HTMLAnchorElement)
        Object.defineProperty(element, 'click', {
          configurable: true,
          value: anchorClickMock,
        })
      }
      return element
    }) as typeof document.createElement)
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('resolves relative download urls against api base url', () => {
    expect(
      resolveDownloadUrl('files/generated.docx?sign=1', 'https://api.example.com/download/'),
    ).toBe('https://api.example.com/download/files/generated.docx?sign=1')
    expect(
      resolveDownloadUrl('/files/generated.docx?sign=1', 'https://api.example.com/download/'),
    ).toBe('https://api.example.com/files/generated.docx?sign=1')
  })

  test('routes configured-backend uploads through the local origin on loopback', () => {
    expect(
      resolveDownloadUrl(
        'https://api.example.com/uploads/generated.docx?sign=1',
        'https://api.example.com/api',
      ),
    ).toBe(`${window.location.origin}/uploads/generated.docx?sign=1`)

    expect(
      resolveDownloadUrl(
        'https://untrusted.example.com/uploads/generated.docx',
        'https://api.example.com/api',
      ),
    ).toBe('https://untrusted.example.com/uploads/generated.docx')
  })

  test('throws on HTTP download errors instead of pretending success', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as never)

    await expect(
      triggerDownload('https://download.example.com/missing.docx', 'missing.docx'),
    ).rejects.toThrow('HTTP 404: Not Found')

    expect(fetchMock).toHaveBeenCalledWith('https://download.example.com/missing.docx', {
      mode: 'cors',
    })
    expect(anchorClickMock).not.toHaveBeenCalled()
  })

  test('preserves an HTTP error when progress tracking wraps the response stream', async () => {
    class TestReadableStream {
      constructor({ start }: { start: (controller: { close: () => void }) => void }) {
        start({ close: () => undefined })
      }
    }
    class TestResponse {
      readonly status: number
      readonly statusText: string
      readonly ok: boolean
      readonly headers: { get: (name: string) => string | null }

      constructor(
        _body: unknown,
        init: {
          status?: number
          statusText?: string
          headers?: { get: (name: string) => string | null }
        } = {},
      ) {
        this.status = init.status ?? 200
        this.statusText = init.statusText ?? ''
        this.ok = this.status >= 200 && this.status < 300
        this.headers = init.headers ?? { get: () => null }
      }
    }
    Object.defineProperty(globalThis, 'ReadableStream', {
      configurable: true,
      value: TestReadableStream,
    })
    Object.defineProperty(globalThis, 'Response', {
      configurable: true,
      value: TestResponse,
    })
    fetchMock.mockResolvedValue({
      body: {
        getReader: () => ({
          read: async () => ({ done: true as const, value: undefined }),
          cancel: async () => undefined,
        }),
      },
      headers: { get: (name: string) => (name === 'content-length' ? '7' : null) },
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as never)
    const onProgress = jest.fn()

    await expect(
      downloadFromUrl('https://download.example.com/missing.docx', 'missing.docx', {
        onProgress,
        retryCount: 0,
      }),
    ).rejects.toThrow('HTTP 404: Not Found')

    expect(anchorClickMock).not.toHaveBeenCalled()
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'error', error: 'HTTP 404: Not Found' }),
    )
  })

  test('falls back to direct-link download on network fetch errors', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch') as never)

    await expect(
      triggerDownload('https://download.example.com/generated.docx', 'generated.docx'),
    ).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith('https://download.example.com/generated.docx', {
      mode: 'cors',
    })
    expect(anchorClickMock).toHaveBeenCalledTimes(1)
  })

  test('rejects unsupported protocols before attempting fetch or direct-link fallback', async () => {
    await expect(triggerDownload('javascript:alert(1)', 'unsafe.docx')).rejects.toThrow(
      '下载地址不受支持，请检查后重试',
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(anchorClickMock).not.toHaveBeenCalled()
  })

  test('reports an error instead of success for an unsupported progress download url', async () => {
    const onProgress = jest.fn()

    await expect(
      downloadFromUrl('javascript:alert(1)', 'unsafe.docx', {
        onProgress,
        retryCount: 0,
      }),
    ).rejects.toThrow('下载地址不受支持，请检查后重试')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(anchorClickMock).not.toHaveBeenCalled()
    expect(onProgress).toHaveBeenLastCalledWith({
      loaded: 0,
      total: 0,
      percentage: 0,
      status: 'error',
      error: '下载地址不受支持，请检查后重试',
    })
    expect(onProgress).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
  })

  test('does not log signed download urls when a valid network request falls back', async () => {
    const sensitiveMarker = 'secret-signature-marker'
    const signedUrl = `https://download.example.com/generated.docx?signature=${sensitiveMarker}`
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch') as never)

    await expect(triggerDownload(signedUrl, 'generated.docx')).resolves.toBeUndefined()

    const consoleOutput = [
      ...jest.mocked(console.error).mock.calls,
      ...jest.mocked(console.warn).mock.calls,
    ]
      .flat()
      .join(' ')
    expect(consoleOutput).not.toContain(signedUrl)
    expect(consoleOutput).not.toContain(sensitiveMarker)
    expect(anchorClickMock).toHaveBeenCalledTimes(1)
  })

  test('opens direct-link fallback in a separate tab to keep the workspace page', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch') as never)

    await triggerDownload('https://download.example.com/generated.docx', 'generated.docx')

    expect(createdAnchors).toHaveLength(1)
    expect(createdAnchors[0]).toHaveAttribute('target', '_blank')
    expect(createdAnchors[0]).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
