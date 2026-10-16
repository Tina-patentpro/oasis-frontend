import { describe, expect, it } from '@jest/globals'

import { formatAssistantContent } from './message-format'

describe('formatAssistantContent', () => {
  it('优先使用 answer 字段', () => {
    const result = formatAssistantContent({ answer: 'hello' })
    expect(result).toBe('hello')
  })

  it('兼容 answer_text 字段', () => {
    const result = formatAssistantContent({ answer_text: '来自 answer_text 的内容' })
    expect(result).toBe('来自 answer_text 的内容')
  })

  it('兼容 content 字段', () => {
    const result = formatAssistantContent({ content: '来自 content 的内容' })
    expect(result).toBe('来自 content 的内容')
  })

  it('保留助手回复中的 Mermaid 三反引号代码块', () => {
    const mermaidBlock = [
      '```mermaid',
      'flowchart TD',
      '  A[开始] --> B[真实输入]',
      '  B --> C[页面渲染]',
      '```',
    ].join('\n')

    const result = formatAssistantContent({ answer: mermaidBlock })

    expect(result).toBe(mermaidBlock)
  })

  it('无正文时返回错误信息', () => {
    const result = formatAssistantContent({ error: 'request failed' })
    expect(result).toBe('错误: request failed')
  })

  it('无正文但有 file_output 图片时返回图片 Markdown', () => {
    const result = formatAssistantContent(
      {
        file_output: [
          {
            filename: 'live-result.webp',
            url: '/files/tools/live-result.webp?sign=1',
            mime_type: 'image/webp',
          },
        ],
      },
      { restoreImages: true },
    )

    expect(result).toBe('![live-result.webp](</files/tools/live-result.webp?sign=1>)')
  })

  it('默认不把无正文文件地址当成图片回复', () => {
    const result = formatAssistantContent({
      file_url: 'https://example.com/download-without-extension',
    })

    expect(result).toBe('未知错误：未收到响应')
  })
})
