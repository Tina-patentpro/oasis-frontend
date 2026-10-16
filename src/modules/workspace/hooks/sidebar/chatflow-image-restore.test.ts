import { describe, expect, test } from '@jest/globals'

import { buildRestoredChatflowImageContent } from './chatflow-image-restore'

describe('buildRestoredChatflowImageContent', () => {
  test('appends image markdown from file_url after answer text', () => {
    const content = buildRestoredChatflowImageContent({
      answerText: '已生成图片',
      fileUrl: 'https://cdn.example.com/generated-cat.png',
    })

    expect(content).toBe(
      '已生成图片\n\n![generated-cat.png](<https://cdn.example.com/generated-cat.png>)',
    )
  })

  test('restores multiple image URLs from file_url', () => {
    const content = buildRestoredChatflowImageContent({
      answerText: '两张图片',
      fileUrl: [
        'https://cdn.example.com/first.webp',
        'https://cdn.example.com/second.jpeg',
      ],
    })

    expect(content).toContain('![first.webp](<https://cdn.example.com/first.webp>)')
    expect(content).toContain('![second.jpeg](<https://cdn.example.com/second.jpeg>)')
  })

  test('restores image from file_output when answer text is empty', () => {
    const content = buildRestoredChatflowImageContent({
      answerText: '',
      fileOutput: [
        {
          filename: 'semantic-result.png',
          download_url: 'https://cdn.example.com/semantic-result',
          mime_type: 'image/png',
        },
      ],
    })

    expect(content).toBe('![semantic-result.png](<https://cdn.example.com/semantic-result>)')
  })

  test('does not duplicate image already referenced in answer text', () => {
    const imageUrl = 'https://cdn.example.com/existing.png'
    const content = buildRestoredChatflowImageContent({
      answerText: `已生成图片\n\n![existing.png](${imageUrl})`,
      fileUrl: imageUrl,
    })

    expect(content.match(new RegExp(imageUrl, 'g'))).toHaveLength(1)
  })

  test('does not render clearly non-image files as images', () => {
    const content = buildRestoredChatflowImageContent({
      answerText: '已生成附件',
      fileUrl: 'https://cdn.example.com/result.pdf',
      fileOutput: [
        {
          filename: 'report.docx',
          download_url: 'https://cdn.example.com/report.docx',
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    })

    expect(content).toBe('已生成附件')
  })

  test('does not restore data image types that markdown rendering will reject', () => {
    const content = buildRestoredChatflowImageContent({
      answerText: '已生成 SVG 图片',
      fileUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
    })

    expect(content).toBe('已生成 SVG 图片')
  })

  test('keeps positional file_url image when paired file_output item is not an image', () => {
    const content = buildRestoredChatflowImageContent({
      answerText: '已生成图片',
      fileUrl: 'https://cdn.example.com/generated.png',
      fileOutput: [
        {
          filename: 'report.pdf',
          download_url: 'https://cdn.example.com/report.pdf',
          mime_type: 'application/pdf',
        },
      ],
    })

    expect(content).toBe(
      '已生成图片\n\n![generated.png](<https://cdn.example.com/generated.png>)',
    )
    expect(content).not.toContain('report.pdf')
  })
})
