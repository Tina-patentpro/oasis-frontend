import { describe, expect, test } from '@jest/globals'

import { extractDifyImageFileObjects } from './dify-file-object'

describe('extractDifyImageFileObjects', () => {
  test('extracts image file object from single-quoted Dify text', () => {
    const files = extractDifyImageFileObjects(
      "图片附件: {'type': 'image', 'transfer_method': 'tool_file', 'filename': 'result.png', 'url': '/files/tools/result.png?sign=1'}",
    )

    expect(files).toEqual([
      expect.objectContaining({
        filename: 'result.png',
        url: '/files/tools/result.png?sign=1',
        mime_type: 'image/png',
      }),
    ])
  })

  test('extracts image file object from nested output record', () => {
    const files = extractDifyImageFileObjects({
      outputs: {
        image_result: [
          {
            type: 'image',
            transfer_method: 'tool_file',
            filename: 'result.webp',
            url: 'https://example.com/result.webp',
          },
        ],
      },
    })

    expect(files).toEqual([
      expect.objectContaining({
        filename: 'result.webp',
        url: 'https://example.com/result.webp',
        mime_type: 'image/webp',
      }),
    ])
  })

  test('ignores ordinary text and non-image file objects', () => {
    const files = extractDifyImageFileObjects(
      "正文\n\n附件: {'type': 'document', 'transfer_method': 'tool_file', 'filename': 'report.docx', 'url': '/files/tools/report.docx?sign=1'}",
    )

    expect(files).toEqual([])
  })

  test('ignores image objects inside echoed input branches', () => {
    const files = extractDifyImageFileObjects({
      outputs: {
        answer: '仅有正文',
        inputs: {
          reference_image: {
            type: 'image',
            transfer_method: 'tool_file',
            filename: 'reference.png',
            url: '/files/tools/reference.png?sign=1',
          },
        },
      },
    })

    expect(files).toEqual([])
  })
})
