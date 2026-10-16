import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import JSZip from 'jszip'

import type { Session } from '@/types/api'

import { exportSessions } from './exportUtils'

jest.mock('@/api/core/token-storage', () => ({
  getAccessToken: () => 'token-123',
}))

jest.mock('@/config/runtime-env', () => ({
  getViteApiBaseUrl: () => 'https://example.com',
}))

function createFetchResponse(
  body: string,
  init: { status: number; statusText?: string },
): Pick<Response, 'ok' | 'status' | 'statusText' | 'blob'> {
  return {
    ok: init.status >= 200 && init.status < 300,
    status: init.status,
    statusText: init.statusText ?? '',
    blob: async () => new Blob([body], { type: 'application/octet-stream' }),
  }
}

type MockFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

describe('exportSessions', () => {
  let downloadedBlob: Blob | null

  beforeEach(() => {
    downloadedBlob = null

    global.fetch = jest.fn<MockFetch>(async (input, init) => {
      const url = String(input)
      const requestHeaders =
        typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined
      const headers = new Headers(init?.headers ?? requestHeaders)

      if (url.includes('result.docx')) {
        expect(headers.get('Authorization')).toBe('Bearer token-123')
        return createFetchResponse('DOCX-CONTENT', { status: 200 }) as Response
      }

      return createFetchResponse('Not Found', { status: 404, statusText: 'Not Found' }) as Response
    }) as typeof fetch

    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = jest.fn((blob: Blob) => {
        downloadedBlob = blob
        return 'blob:export'
      })
    } else {
      global.URL.createObjectURL = jest.fn((blob: Blob) => {
        downloadedBlob = blob
        return 'blob:export'
      })
    }

    if (!global.URL.revokeObjectURL) {
      global.URL.revokeObjectURL = jest.fn()
    } else {
      global.URL.revokeObjectURL = jest.fn()
    }

    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  test('packages workflow attachments into the exported zip when includeAttachments is enabled', async () => {
    const session: Session = {
      id: 101,
      userId: 1,
      projectId: 10,
      title: '技术背景研究报告',
      toolType: 'workflow',
      modelVersion: 'fast',
      status: 'completed',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      file_output: [
        {
          download_url: '/files/generated/result.docx?sign=1',
          filename: '技术背景研究报告.docx',
        },
      ],
    }

    const task = await exportSessions([session], {
      format: 'zip',
      compress: true,
      includeAttachments: true,
    })

    expect(task.status).toBe('completed')
    expect(downloadedBlob).not.toBeNull()

    const zip = await JSZip.loadAsync(downloadedBlob as Blob)
    const entryNames = Object.keys(zip.files)

    expect(entryNames.some((name) => name.endsWith('技术背景研究报告.json'))).toBe(true)
    expect(entryNames.some((name) => name.endsWith('技术背景研究报告.docx'))).toBe(true)

    const attachmentEntryName = entryNames.find((name) => name.endsWith('技术背景研究报告.docx'))
    const attachmentText = await zip.file(attachmentEntryName || '')?.async('string')
    expect(attachmentText).toBe('DOCX-CONTENT')
  })

  test('keeps exported zip and writes a failure report when only some workflow attachments fail', async () => {
    global.fetch = jest.fn<MockFetch>(async (input) => {
      const url = String(input)

      if (url.includes('success.docx')) {
        return createFetchResponse('SUCCESS-DOCX', { status: 200 }) as Response
      }

      if (url.includes('fail.docx')) {
        return createFetchResponse('Forbidden', {
          status: 403,
          statusText: 'Forbidden',
        }) as Response
      }

      return createFetchResponse('Not Found', { status: 404, statusText: 'Not Found' }) as Response
    }) as typeof fetch

    const session: Session = {
      id: 202,
      userId: 1,
      projectId: 10,
      title: '技术交底书完善',
      toolType: 'workflow',
      modelVersion: 'fast',
      status: 'completed',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      file_output: [
        {
          download_url: '/files/generated/success.docx?sign=1',
          filename: '成功附件.docx',
        },
        {
          download_url: '/files/generated/fail.docx?sign=2',
          filename: '失败附件.docx',
        },
      ],
    }

    const task = await exportSessions([session], {
      format: 'zip',
      compress: true,
      includeAttachments: true,
    })

    expect(task.status).toBe('completed')
    expect(downloadedBlob).not.toBeNull()

    const zip = await JSZip.loadAsync(downloadedBlob as Blob)
    const entryNames = Object.keys(zip.files)

    expect(entryNames.some((name) => name.endsWith('成功附件.docx'))).toBe(true)
    expect(entryNames.some((name) => name.endsWith('失败附件.docx'))).toBe(false)
    expect(entryNames).toContain('_metadata/generated-files-report.json')

    const reportText = await zip.file('_metadata/generated-files-report.json')?.async('string')
    const report = JSON.parse(reportText ?? '{}') as {
      summary?: { failedCount?: number; addedCount?: number }
      failures?: Array<{ fileName?: string; reason?: string }>
    }

    expect(report.summary).toEqual(
      expect.objectContaining({
        addedCount: 1,
        failedCount: 1,
      }),
    )
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: '失败附件.docx',
          reason: expect.stringContaining('HTTP 403'),
        }),
      ]),
    )
  })
})
