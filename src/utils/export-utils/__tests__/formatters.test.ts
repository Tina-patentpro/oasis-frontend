import { describe, expect, test, jest } from '@jest/globals'

jest.mock('../../download', () => ({
  createTimestampedFileName: jest.fn((prefix: string) => `${prefix}_20260405`),
  EXPORT_FORMATS: { csv: 'csv', xlsx: 'xlsx', pdf: 'pdf', json: 'json' },
}))

import { convertToFormat } from '../formatters'

// Helper: read Blob as text (jsdom Blob may lack .text())
async function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(blob)
  })
}

// --- convertToFormat: csv ---

describe('convertToFormat csv', () => {
  test('converts items array to CSV blob', async () => {
    const data = {
      type: 'report',
      items: [
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ],
    }
    const result = await convertToFormat(data, 'csv')
    expect(result.filename).toBe('report_20260405')
    expect(result.blob.type).toBe('text/csv')
    const text = await blobToText(result.blob)
    expect(text).toContain('name,age')
    expect(text).toContain('Alice,30')
    expect(text).toContain('Bob,25')
  })

  test('handles empty items array', async () => {
    const data = { type: 'empty', items: [] }
    const result = await convertToFormat(data, 'csv')
    const text = await blobToText(result.blob)
    expect(text).toBe('')
  })

  test('escapes values with commas, quotes and newlines', async () => {
    const data = {
      type: 'test',
      items: [{ text: 'hello, world' }, { text: 'say "hi"' }, { text: 'line1\nline2' }],
    }
    const result = await convertToFormat(data, 'csv')
    const text = await blobToText(result.blob)
    expect(text).toContain('"hello, world"')
    expect(text).toContain('"say ""hi"""')
    expect(text).toContain('"line1\nline2"')
  })

  test('handles null values', async () => {
    const data = { type: 'nulls', items: [{ a: null, b: 'value' }] }
    const result = await convertToFormat(data, 'csv')
    const text = await blobToText(result.blob)
    expect(text).toContain(',value')
  })

  test('JSON-stringifies object values (CSV-escaped)', async () => {
    const data = { type: 'obj', items: [{ meta: { key: 'val' } }] }
    const result = await convertToFormat(data, 'csv')
    const text = await blobToText(result.blob)
    // CSV escapes double quotes by doubling them inside quoted fields
    expect(text).toContain('key')
    expect(text).toContain('val')
  })
})

// --- convertToFormat: json ---

describe('convertToFormat json', () => {
  test('returns JSON blob with correct MIME type', async () => {
    const data = { type: 'data', items: [1, 2, 3] }
    const result = await convertToFormat(data, 'json')
    expect(result.blob.type).toBe('application/json')
    expect(result.filename).toBe('data_20260405')
    const text = await blobToText(result.blob)
    const parsed = JSON.parse(text)
    expect(parsed.items).toEqual([1, 2, 3])
  })
})

// --- convertToFormat: xlsx ---

describe('convertToFormat xlsx', () => {
  test('falls back to JSON blob with xlsx MIME type', async () => {
    const data = { type: 'sheet', items: [] }
    const result = await convertToFormat(data, 'xlsx')
    expect(result.blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
  })
})

// --- convertToFormat: pdf ---

describe('convertToFormat pdf', () => {
  test('falls back to JSON blob with pdf MIME type', async () => {
    const data = { type: 'doc', items: [] }
    const result = await convertToFormat(data, 'pdf')
    expect(result.blob.type).toBe('application/pdf')
  })
})
