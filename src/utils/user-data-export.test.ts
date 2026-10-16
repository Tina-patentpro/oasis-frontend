import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import JSZip from 'jszip'

import type { HistoryDataItem, PaginatedResponse } from '@/types/api'

import { buildAugmentedUserDataExportPackage } from './user-data-export'

const mockGetHistoryData =
  jest.fn<
    (params?: { page?: number; pageSize?: number }) => Promise<PaginatedResponse<HistoryDataItem>>
  >()
const mockGetHistoryDataItem = jest.fn<(id: string) => Promise<HistoryDataItem>>()

jest.mock('@/api/services', () => ({
  historyService: {
    getHistoryData: (params?: { page?: number; pageSize?: number }) => mockGetHistoryData(params),
    getHistoryDataItem: (id: string) => mockGetHistoryDataItem(id),
  },
}))

jest.mock('@/api/core/token-storage', () => ({
  getAccessToken: () => 'token-123',
}))

jest.mock('./download', () => ({
  resolveDownloadUrl: (url: string) => {
    if (/^https?:\/\//i.test(url)) {
      return url
    }
    return `https://example.com${url.startsWith('/') ? '' : '/'}${url}`
  },
}))

function createHistoryItem(id: string, overrides: Partial<HistoryDataItem> = {}): HistoryDataItem {
  return {
    id,
    title: `记录-${id}`,
    content: '',
    date: '2026-04-01',
    type: 'workflow',
    tags: [],
    read: false,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  }
}

async function createBaseZipBlob(): Promise<Blob> {
  const zip = new JSZip()
  zip.file('_metadata/summary.json', JSON.stringify({ source: 'backend-export' }, null, 2))
  return zip.generateAsync({ type: 'blob' })
}

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

describe('buildAugmentedUserDataExportPackage', () => {
  beforeEach(() => {
    mockGetHistoryData.mockReset()
    mockGetHistoryDataItem.mockReset()
    const fetchMock = jest.fn<typeof fetch>() as typeof fetch
    global.fetch = fetchMock
    window.fetch = fetchMock
  })

  test('merges backend zip with generated files from file_url and file_output', async () => {
    mockGetHistoryData.mockResolvedValue({
      items: [createHistoryItem('101')],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    })
    mockGetHistoryDataItem.mockResolvedValue(
      createHistoryItem('101', {
        title: '技术背景研究报告',
        file_url: '/files/tools/final-a.docx?sign=1',
        file_output: [
          {
            download_url: '/files/tools/real-b.docx?sign=2',
            filename: '技术要素表.docx',
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ],
      }),
    )
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('final-a.docx')) {
        return createFetchResponse('A-DOCX', { status: 200 }) as Response
      }
      if (url.includes('real-b.docx')) {
        return createFetchResponse('B-DOCX', { status: 200 }) as Response
      }
      return createFetchResponse('Not Found', { status: 404, statusText: 'Not Found' }) as Response
    })

    const result = await buildAugmentedUserDataExportPackage({
      baseZipBlob: await createBaseZipBlob(),
      filename: 'user_data_merged.zip',
    })

    expect(result.filename).toBe('user_data_merged.zip')
    expect(result.attachmentSummary).toEqual({
      discoveredCount: 2,
      addedCount: 2,
      failedCount: 0,
      skippedRecordCount: 0,
      reportPath: '_metadata/generated-files-report.json',
    })

    const zip = await JSZip.loadAsync(result.blob)
    const entryNames = Object.keys(zip.files)

    expect(entryNames).toContain('_metadata/summary.json')
    expect(entryNames).toContain('_metadata/generated-files-report.json')
    expect(entryNames.some((name) => name.endsWith('final-a.docx'))).toBe(true)
    expect(entryNames.some((name) => name.endsWith('技术要素表.docx'))).toBe(true)

    const reportText = await zip.file('_metadata/generated-files-report.json')?.async('string')
    const report = JSON.parse(reportText ?? '{}') as {
      summary?: { addedCount?: number; failedCount?: number }
      records?: Array<{ zipPath?: string; sourceTitle?: string }>
    }

    expect(report.summary).toEqual(
      expect.objectContaining({
        addedCount: 2,
        failedCount: 0,
      }),
    )
    expect(report.records).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceTitle: '技术背景研究报告' })]),
    )
  })

  test('keeps export zip and writes failure report when some generated files cannot be downloaded', async () => {
    mockGetHistoryData.mockResolvedValue({
      items: [createHistoryItem('202')],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    })
    mockGetHistoryDataItem.mockResolvedValue(
      createHistoryItem('202', {
        title: '技术交底书完善',
        file_output: [
          {
            download_url: '/files/tools/success.docx?sign=1',
            filename: '成功附件.docx',
          },
          {
            download_url: '/files/tools/fail.docx?sign=2',
            filename: '失败附件.docx',
          },
        ],
      }),
    )
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('success.docx')) {
        return createFetchResponse('SUCCESS', { status: 200 }) as Response
      }
      if (url.includes('fail.docx')) {
        return createFetchResponse('Failed', { status: 403, statusText: 'Forbidden' }) as Response
      }
      return createFetchResponse('Not Found', { status: 404, statusText: 'Not Found' }) as Response
    })

    const result = await buildAugmentedUserDataExportPackage({
      baseZipBlob: await createBaseZipBlob(),
      filename: 'user_data_partial.zip',
    })

    expect(result.attachmentSummary).toEqual({
      discoveredCount: 2,
      addedCount: 1,
      failedCount: 1,
      skippedRecordCount: 0,
      reportPath: '_metadata/generated-files-report.json',
    })

    const zip = await JSZip.loadAsync(result.blob)
    const reportText = await zip.file('_metadata/generated-files-report.json')?.async('string')
    const report = JSON.parse(reportText ?? '{}') as {
      failures?: Array<{ fileName?: string; reason?: string }>
    }

    expect(Object.keys(zip.files).some((name) => name.endsWith('成功附件.docx'))).toBe(true)
    expect(Object.keys(zip.files).some((name) => name.endsWith('失败附件.docx'))).toBe(false)
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: '失败附件.docx',
          reason: expect.stringContaining('HTTP 403'),
        }),
      ]),
    )
  })

  test('returns original backend zip when no generated files are discovered', async () => {
    const baseZipBlob = await createBaseZipBlob()

    mockGetHistoryData.mockResolvedValue({
      items: [createHistoryItem('303')],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    })
    mockGetHistoryDataItem.mockResolvedValue(createHistoryItem('303'))

    const result = await buildAugmentedUserDataExportPackage({
      baseZipBlob,
      filename: 'user_data_original.zip',
    })

    expect(result.attachmentSummary).toEqual({
      discoveredCount: 0,
      addedCount: 0,
      failedCount: 0,
      skippedRecordCount: 0,
      reportPath: undefined,
    })
    expect(result.blob.size).toBe(baseZipBlob.size)

    const zip = await JSZip.loadAsync(result.blob)
    expect(zip.file('_metadata/generated-files-report.json')).toBeNull()
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(['_metadata/summary.json']))
  })

  test('returns original backend blob without report path when backend zip cannot be parsed', async () => {
    const invalidZipBlob = new Blob(['not-a-valid-zip'], { type: 'application/zip' })

    mockGetHistoryData.mockResolvedValue({
      items: [createHistoryItem('404')],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    })
    mockGetHistoryDataItem.mockResolvedValue(
      createHistoryItem('404', {
        title: '坏压缩包场景',
        file_output: [
          {
            download_url: '/files/tools/failover.docx?sign=1',
            filename: '补充附件.docx',
          },
        ],
      }),
    )

    const result = await buildAugmentedUserDataExportPackage({
      baseZipBlob: invalidZipBlob,
      filename: 'user_data_invalid.zip',
    })

    expect(result.blob.size).toBe(invalidZipBlob.size)
    expect(result.attachmentSummary).toEqual({
      discoveredCount: 1,
      addedCount: 0,
      failedCount: 1,
      skippedRecordCount: 0,
      reportPath: undefined,
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
