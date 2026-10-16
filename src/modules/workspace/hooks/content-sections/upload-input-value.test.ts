import { describe, expect, test } from '@jest/globals'

import {
  buildUploadedInputValue,
  getUploadFieldConfig,
  getUploadSelectionState,
  mergeUploadInputValue,
  parseUploadInputValue,
} from './upload-input-value'

describe('upload input value utils', () => {
  test('parseUploadInputValue parses legacy string JSON input', () => {
    const result = parseUploadInputValue('"https://example.com/files/a.docx"')

    expect(result).toEqual([
      {
        url: 'https://example.com/files/a.docx',
        mimeType: '',
        name: 'a.docx',
      },
    ])
  })

  test('parseUploadInputValue parses object and array formats', () => {
    const result = parseUploadInputValue(
      JSON.stringify([
        {
          saved_path: 'https://example.com/files/a.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          filename: 'A.docx',
        },
        {
          url: 'https://example.com/files/b.pdf',
          content_type: 'application/pdf',
        },
      ]),
    )

    expect(result).toEqual([
      {
        url: 'https://example.com/files/a.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        name: 'A.docx',
      },
      {
        url: 'https://example.com/files/b.pdf',
        mimeType: 'application/pdf',
        name: 'b.pdf',
      },
    ])
  })

  test('parseUploadInputValue decodes URL encoded file names for display', () => {
    const result = parseUploadInputValue(
      '"https://lzhxpy.oasisintwrite.com/uploads/workflow/%E5%8D%95%E6%96%87%E4%BB%B62026-03-02%2017_40.docx"',
    )

    expect(result).toEqual([
      {
        url: 'https://lzhxpy.oasisintwrite.com/uploads/workflow/%E5%8D%95%E6%96%87%E4%BB%B62026-03-02%2017_40.docx',
        mimeType: '',
        name: '单文件2026-03-02 17_40.docx',
      },
    ])
  })

  test('mergeUploadInputValue appends new items and de-duplicates by url', () => {
    const merged = mergeUploadInputValue(
      JSON.stringify([
        {
          url: 'https://example.com/files/a.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          name: 'A.docx',
        },
      ]),
      [
        {
          url: 'https://example.com/files/a.docx',
          mimeType: 'application/msword',
        },
        {
          url: 'https://example.com/files/b.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    )

    expect(merged).toEqual([
      {
        url: 'https://example.com/files/a.docx',
        mimeType: 'application/msword',
        name: 'a.docx',
      },
      {
        url: 'https://example.com/files/b.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        name: 'b.docx',
      },
    ])
  })

  test('getUploadFieldConfig returns correct max files and multi-select rules', () => {
    expect(getUploadFieldConfig('file')).toEqual({
      maxFiles: 1,
      multiple: false,
    })
    expect(getUploadFieldConfig('file_list')).toEqual({
      maxFiles: 5,
      multiple: true,
    })
    expect(getUploadFieldConfig('image')).toEqual({
      maxFiles: 5,
      multiple: true,
    })
  })

  test('getUploadSelectionState switches to replace mode when limit is reached', () => {
    expect(getUploadSelectionState('file', 1)).toMatchObject({
      isAtLimit: true,
      maxFiles: 1,
      multiple: false,
      nextMode: 'replace',
      remainingSlots: 0,
      selectionLimit: 1,
    })
    expect(getUploadSelectionState('file_list', 3)).toMatchObject({
      isAtLimit: false,
      maxFiles: 5,
      multiple: true,
      nextMode: 'append',
      remainingSlots: 2,
      selectionLimit: 2,
    })
    expect(getUploadSelectionState('image', 5)).toMatchObject({
      isAtLimit: true,
      maxFiles: 5,
      multiple: true,
      nextMode: 'replace',
      remainingSlots: 0,
      selectionLimit: 5,
    })
  })

  test('buildUploadedInputValue stores the first uploaded item for single-file fields', () => {
    expect(
      buildUploadedInputValue({
        targetFieldType: 'file',
        existingValue: '',
        uploadedFiles: [
          { url: 'https://example.com/a.docx', mimeType: 'application/msword' },
          { url: 'https://example.com/b.docx', mimeType: 'application/msword' },
        ],
        selectionLimit: 1,
        maxFiles: 1,
        uploadMode: 'replace',
      }),
    ).toBe(JSON.stringify({ url: 'https://example.com/a.docx', mimeType: 'application/msword' }))
  })

  test('buildUploadedInputValue replaces multi-file fields with the selected upload batch', () => {
    expect(
      buildUploadedInputValue({
        targetFieldType: 'file_list',
        existingValue: JSON.stringify([{ url: 'https://example.com/old.docx', mimeType: '' }]),
        uploadedFiles: [
          { url: 'https://example.com/a.docx', mimeType: 'application/msword' },
          { url: 'https://example.com/b.docx', mimeType: 'application/msword' },
        ],
        selectionLimit: 1,
        maxFiles: 5,
        uploadMode: 'replace',
      }),
    ).toBe(JSON.stringify([{ url: 'https://example.com/a.docx', mimeType: 'application/msword' }]))
  })

  test('buildUploadedInputValue appends multi-file fields and caps at the configured max', () => {
    expect(
      buildUploadedInputValue({
        targetFieldType: 'file_list',
        existingValue: JSON.stringify([
          { url: 'https://example.com/old-1.docx', mimeType: '' },
          { url: 'https://example.com/old-2.docx', mimeType: '' },
        ]),
        uploadedFiles: [
          { url: 'https://example.com/new-1.docx', mimeType: 'application/msword' },
          { url: 'https://example.com/new-2.docx', mimeType: 'application/msword' },
        ],
        selectionLimit: 2,
        maxFiles: 3,
        uploadMode: 'append',
      }),
    ).toBe(
      JSON.stringify([
        { url: 'https://example.com/old-1.docx', mimeType: '', name: 'old-1.docx' },
        { url: 'https://example.com/old-2.docx', mimeType: '', name: 'old-2.docx' },
        {
          url: 'https://example.com/new-1.docx',
          mimeType: 'application/msword',
          name: 'new-1.docx',
        },
      ]),
    )
  })
})
