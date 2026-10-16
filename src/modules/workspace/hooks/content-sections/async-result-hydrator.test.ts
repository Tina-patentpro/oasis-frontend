import { describe, expect, test } from '@jest/globals'

import type { ProcessStatusResponse } from '@/types/api'

import { resolveFinalResult } from './async-result-hydrator'

function buildProcess(overrides: Partial<ProcessStatusResponse> = {}): ProcessStatusResponse {
  return {
    key: 'task_1',
    current_step: 3,
    current_step_name: '完成',
    total_steps: 3,
    steps: ['S1', 'S2', 'S3'],
    progress_percent: 100,
    is_completed: true,
    ...overrides,
  }
}

describe('resolveFinalResult', () => {
  test('uses process.answer_text and file_url directly', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: 'from process',
        file_url: 'https://example.com/a.docx',
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.text).toContain('from process')
    expect(result?.files).toHaveLength(1)
  })

  test('removes matching Dify output parameter name from async answer_text', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '权利要求书和生成报告 1. 一种自适应办公椅系统，包括座椅主体。',
        output: JSON.stringify({
          data: {
            outputs: {
              权利要求书和生成报告: '1. 一种自适应办公椅系统，包括座椅主体。',
            },
          },
        }),
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.text).toBe('1. 一种自适应办公椅系统，包括座椅主体。')
  })

  test('removes configured async output name before repeated title and ordered list', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '权利要求书: 权利要求书\n\n1. 一种自适应办公椅系统，包括座椅主体。',
      }),
      outputFields: [{ name: '权利要求书', allowStructuralPrefix: true }],
    })

    expect(result).not.toBeNull()
    expect(result?.text).toBe('权利要求书\n\n1. 一种自适应办公椅系统，包括座椅主体。')
  })

  test('removes configured async output name before plain paragraph text', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '权利要求书和生成报告: 本发明公开了一种自适应办公椅系统。',
      }),
      outputFields: [
        { name: '权利要求书和生成报告', allowStructuralPrefix: true, allowPlainPrefix: true },
      ],
    })

    expect(result).not.toBeNull()
    expect(result?.text).toBe('本发明公开了一种自适应办公椅系统。')
  })

  test('removes standard main text output name without configured fields', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '生成内容: 正文段落',
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.text).toBe('正文段落')
  })

  test('supports process.file_url as string[]', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        file_url: ['https://example.com/a.docx', 'https://example.com/b.docx'],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(2)
    expect(result?.files.every((file) => file.size === undefined)).toBe(true)
  })

  test('uses file_output when answer_text is empty and download files are present', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        output: 'from process output field',
        file_output: [
          {
            url: '/files/tools/new-result.docx?sign=xyz',
            filename: 'new-result.docx',
          },
        ],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(1)
    expect(result?.files[0]?.url).toBe('/files/tools/new-result.docx?sign=xyz')
    expect(result?.files[0]?.fileName).toBe('new-result.docx')
  })

  test('uses fixed download guidance when answer_text is empty but file_url exists', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        output: '这段动态文本不应进入预览',
        file_url: 'https://example.com/dynamic.docx',
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.text).toBe('生成完成，文件已准备好，请点击“下载”按钮获取。')
    expect(result?.files).toHaveLength(1)
  })

  test('treats progress 100 with file result and failed status as final result', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        is_completed: false,
        progress_percent: 100,
        answer_text: '',
        file_url: 'https://example.com/final.docx',
        status: 'failed',
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(1)
  })

  test('returns null when response has text but no completion signal and explicit failed status', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        is_completed: false,
        progress_percent: 33,
        answer_text: '处理中提示',
        error_message: '执行失败',
        status: 'failed',
      }),
    })

    expect(result).toBeNull()
  })

  test('supports file_output-only payload when download_url exists', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        output: 'from process output field',
        file_output: [
          {
            url: 'https://example.com/op/view.aspx?src=https%3A%2F%2Fcdn.example.com%2Fpreview.docx',
            download_url: 'https://cdn.example.com/final.docx',
            filename: 'final.docx',
          },
        ],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(1)
    expect(result?.files[0]?.url).toBe('https://cdn.example.com/final.docx')
    expect(result?.files[0]?.fileName).toBe('final.docx')
  })

  test('merges top-level file_url and file_output files when both are present', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        file_url: 'https://example.com/final.docx',
        file_output: [
          {
            download_url: 'https://cdn.example.com/技术交底书.docx',
            filename: '技术交底书.docx',
          },
        ],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(2)
    expect(result?.files.map((file) => file.url)).toEqual([
      'https://cdn.example.com/技术交底书.docx',
      'https://example.com/final.docx',
    ])
  })

  test('keeps unique files from top-level file_url and file_output', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        file_url: [
          'https://example.com/fallback-a.docx',
          'https://example.com/fallback-b.docx',
          'https://example.com/fallback-c.docx',
        ],
        file_output: [
          {
            filename: '文件A.docx',
            download_url: 'https://cdn.example.com/real-a.docx',
          },
          {
            filename: 'fallback-b.docx',
            download_url: 'https://example.com/fallback-b.docx',
          },
        ],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(4)
    expect(result?.files.map((file) => file.url)).toEqual([
      'https://cdn.example.com/real-a.docx',
      'https://example.com/fallback-b.docx',
      'https://example.com/fallback-a.docx',
      'https://example.com/fallback-c.docx',
    ])
  })

  test('supports file_output-only async items when backend returns download_url', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        file_output: [
          {
            filename: '技术交底书.docx',
            download_url: '/files/tools/a.docx?sign=1',
          },
        ],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(1)
    expect(result?.files[0]?.url).toBe('/files/tools/a.docx?sign=1')
    expect(result?.files[0]?.fileName).toBe('技术交底书.docx')
  })

  test('keeps every downloadable file from file_output when file_url is empty', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        output: 'multi-file result',
        file_output: [
          {
            download_url: 'https://cdn.example.com/final-a.docx',
            filename: 'final-a.docx',
          },
          {
            download_url: 'https://cdn.example.com/final-b.docx',
            filename: 'final-b.docx',
          },
        ],
        file_url: '',
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(2)
    expect(result?.files.map((file) => file.url)).toEqual([
      'https://cdn.example.com/final-a.docx',
      'https://cdn.example.com/final-b.docx',
    ])
  })

  test('recovers patent file from file_url when file_output entry has no URL (triz-pro scenario)', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '分析完成',
        file_url: [
          'https://cdn.example.com/tech_report.docx',
          'https://cdn.example.com/patent_report.docx',
        ],
        file_output: [
          {
            download_url: 'https://cdn.example.com/tech_report.docx',
            filename: 'tech_analysis.docx',
            size: 12345,
          },
          {
            filename: 'patent_analysis.docx',
            size: 67890,
            // 注意：没有 url、download_url 等任何 URL 字段
          },
        ],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(2)
    // tech 文件使用自己的 download_url
    expect(result?.files[0]?.fileName).toBe('tech_analysis.docx')
    expect(result?.files[0]?.url).toBe('https://cdn.example.com/tech_report.docx')
    // patent 文件从对应位置的 file_url 获取下载链接
    expect(result?.files[1]?.fileName).toBe('patent_analysis.docx')
    expect(result?.files[1]?.url).toBe('https://cdn.example.com/patent_report.docx')
  })

  test('handles file_output with mixed URL presence correctly', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        file_output: [
          {
            url: 'https://preview.example.com/doc1',
            download_url: 'https://cdn.example.com/final1.docx',
            filename: 'report1.docx',
          },
          {
            filename: 'report2.docx',
            // no URL fields at all — should get URL from file_url[1]
          },
        ],
        file_url: ['https://cdn.example.com/final1.docx', 'https://cdn.example.com/final2.docx'],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(2)
    // report1 uses its own download_url
    expect(result?.files[0]?.fileName).toBe('report1.docx')
    expect(result?.files[0]?.url).toBe('https://cdn.example.com/final1.docx')
    // report2 uses file_url[1] because it has no own URL
    expect(result?.files[1]?.fileName).toBe('report2.docx')
    expect(result?.files[1]?.url).toBe('https://cdn.example.com/final2.docx')
  })

  test('handles duplicate file_url values without index shift', async () => {
    // file_url 含有重复 URL，配对仍按原始位置，去重在合并后统一执行
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        file_url: ['https://cdn.example.com/report.docx', 'https://cdn.example.com/report.docx'],
        file_output: [
          {
            download_url: 'https://cdn.example.com/report.docx',
            filename: 'tech_report.docx',
          },
          {
            filename: 'patent_report.docx',
            // 没有 URL，应使用 file_url[1]（与 tech 相同 URL）
          },
        ],
      }),
    })

    expect(result).not.toBeNull()
    // 两个 file_output 条目指向同一个 URL，去重后只保留一个（file_output[0] 优先）
    expect(result?.files).toHaveLength(1)
    expect(result?.files[0]?.fileName).toBe('tech_report.docx')
    expect(result?.files[0]?.url).toBe('https://cdn.example.com/report.docx')
  })

  test('handles mixed string/string[] file_url format preserving positions', async () => {
    // file_url 为逗号分隔字符串 + 数组混合形式
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        file_url: 'https://cdn.example.com/a.docx,https://cdn.example.com/b.docx',
        file_output: [
          {
            download_url: 'https://cdn.example.com/a.docx',
            filename: 'file_a.docx',
          },
          {
            filename: 'file_b.docx',
            // 没有 URL，应使用对应位置的 file_url[1]
          },
        ],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(2)
    expect(result?.files[0]?.fileName).toBe('file_a.docx')
    expect(result?.files[0]?.url).toBe('https://cdn.example.com/a.docx')
    expect(result?.files[1]?.fileName).toBe('file_b.docx')
    expect(result?.files[1]?.url).toBe('https://cdn.example.com/b.docx')
  })

  test('recovers multiple URL-less file_output entries via positional file_url matching', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '生成完成',
        file_url: [
          'https://cdn.example.com/r1.docx',
          'https://cdn.example.com/r2.docx',
          'https://cdn.example.com/r3.docx',
        ],
        file_output: [
          { filename: 'report1.docx', size: 100 },
          { filename: 'report2.docx', size: 200 },
          { filename: 'report3.docx', size: 300 },
          // 三个条目都没有 URL，全部从对应位置的 file_url 获取
        ],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(3)
    expect(result?.files.map((f) => f.fileName)).toEqual([
      'report1.docx',
      'report2.docx',
      'report3.docx',
    ])
    expect(result?.files.map((f) => f.url)).toEqual([
      'https://cdn.example.com/r1.docx',
      'https://cdn.example.com/r2.docx',
      'https://cdn.example.com/r3.docx',
    ])
  })

  test('does not split commas inside URL query strings', async () => {
    // F2 回归: 查询参数中的逗号不应被分割为独立 URL
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        file_url:
          'https://cdn.example.com/report.docx?ids=a,b/c.docx,https://cdn.example.com/other.docx',
        file_output: [],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(2)
    expect(result?.files[0]?.url).toBe('https://cdn.example.com/report.docx?ids=a,b/c.docx')
    expect(result?.files[1]?.url).toBe('https://cdn.example.com/other.docx')
  })

  test('splits comma before https:// even when query params contain slashes', async () => {
    // 逗号后跟 https:// 明确是 URL 分隔符，即使前一个 URL 的查询参数含斜杠
    const result = await resolveFinalResult({
      process: buildProcess({
        answer_text: '',
        file_url: '/files/result.docx?next=/files/other.docx,https://cdn.example.com/third.docx',
        file_output: [],
      }),
    })

    expect(result).not.toBeNull()
    expect(result?.files).toHaveLength(2)
    expect(result?.files[0]?.url).toBe('/files/result.docx?next=/files/other.docx')
    expect(result?.files[1]?.url).toBe('https://cdn.example.com/third.docx')
  })

  test('returns null when process payload has no final text or file', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({
        session_id: 99,
        answer_text: '',
        output: '',
        file_output: [],
        file_url: '',
      }),
    })

    expect(result).toBeNull()
  })

  test('returns null for non-completed process', async () => {
    const result = await resolveFinalResult({
      process: buildProcess({ is_completed: false, progress_percent: 66 }),
    })

    expect(result).toBeNull()
  })
})
