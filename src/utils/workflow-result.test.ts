import { describe, expect, test } from '@jest/globals'

import { normalizeWorkflowResultPayload } from './workflow-result'

const userProvidedWorkflowCase = {
  code: 200,
  message: 'success',
  data: {
    id: 562,
    name: '技术交底书完善-Basic',
    answer_text: '交底书概要: 顶层正文',
    file_url:
      'https://example.com/Flow-1-5-标准化技术交底书-1.0.0.docx,https://example.com/Flow-1-5-技术要素表-1.0.0.docx',
    response: JSON.stringify({
      task_id: 'task_case_1',
      data: {
        outputs: {
          brief_summary: 'response 内的概要不应覆盖顶层正文',
          technical_disclosure: 'response 内的正文不应覆盖顶层正文',
          technical_disclosure_file: [
            {
              filename: 'Flow-1-5-标准化技术交底书-1.0.0.docx',
              url: '/files/tools/tech-disclosure.docx?sign=1',
              mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
          ],
          tech_elements_table_file: [
            {
              filename: 'Flow-1-5-技术要素表-1.0.0.docx',
              url: '/files/tools/tech-elements.docx?sign=2',
              mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
          ],
        },
      },
    }),
  },
}

const capturedTechLandscapeCase = {
  code: 200,
  message: 'success',
  data: {
    id: 586,
    name: '技术背景研究报告-Basic-1.0.1',
    answer_text: '技术背景研究报告: 顶层正文',
    file_url: '',
    response: JSON.stringify({
      task_id: 'task_case_2',
      data: {
        outputs: {
          tech_landscape: '# 电驱动转向前桥集成系统深度技术研究报告',
          tech_landscape_file: [
            {
              dify_model_identity: '__dify__file__',
              filename: 'Flow-1-1-技术背景研究报告-1.0.1-2026-03-22 10:04.docx',
              url: '/files/tools/1d22767d-b169-4d77-a1c1-c7c3de004ff8.docx?sign=3',
              mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              size: 19011,
            },
          ],
        },
      },
    }),
  },
}

describe('normalizeWorkflowResultPayload', () => {
  test('preserves top-level file_output records and still ignores nested output file arrays', () => {
    const topLevelFileOutput = [
      {
        download_url: 'https://cdn.example.com/result.docx',
        filename: 'result.docx',
      },
    ]

    const result = normalizeWorkflowResultPayload({
      answer_text: '',
      file_output: topLevelFileOutput,
      response: JSON.stringify({
        data: {
          outputs: {
            nested_file: [
              {
                url: 'https://preview.example.com/should-not-be-inferred.docx',
                filename: 'nested.docx',
              },
            ],
          },
        },
      }),
    })

    expect(result.file_output).toEqual(topLevelFileOutput)
    expect(result.file_url).toBeUndefined()
  })

  test('prefers top-level answer_text and file_url for the user-provided workflow case', () => {
    const result = normalizeWorkflowResultPayload(userProvidedWorkflowCase)

    expect(result.text).toBe('交底书概要: 顶层正文')
    expect(result.file_url).toEqual([
      'https://example.com/Flow-1-5-标准化技术交底书-1.0.0.docx',
      'https://example.com/Flow-1-5-技术要素表-1.0.0.docx',
    ])
    expect(result.file_output).toBeUndefined()
  })

  test('ignores response file arrays when top-level file_url is empty for the captured tech-landscape case', () => {
    const result = normalizeWorkflowResultPayload(capturedTechLandscapeCase)

    expect(result.text).toBe('顶层正文')
    expect(result.file_output).toBeUndefined()
    expect(result.file_url).toBeUndefined()
  })

  test('prefers answer over answer_text and generatedContent', () => {
    const result = normalizeWorkflowResultPayload({
      answer: '顶层 answer',
      answer_text: '顶层 answer_text',
      generatedContent: '顶层 generatedContent',
      response: JSON.stringify({
        data: {
          outputs: {
            report_body: 'response 正文',
          },
        },
      }),
    })

    expect(result.text).toBe('顶层 answer')
  })

  test('concatenates response text blocks without output field names when top-level text is absent', () => {
    const result = normalizeWorkflowResultPayload({
      response: JSON.stringify({
        data: {
          outputs: {
            brief_summary: '第一段',
            report_body: '第二段',
          },
        },
      }),
    })

    expect(result.text).toBe('第一段\n\n第二段')
  })

  test('does not show Dify output parameter names in preview fallback text', () => {
    const result = normalizeWorkflowResultPayload({
      response: JSON.stringify({
        data: {
          outputs: {
            输出内容: '# 中栏特殊内容渲染测试',
            检查摘要: '内部摘要 一、当前结论：暂不建议直接提交',
            权利要求书和生成报告: '一种自适应办公椅系统，包括座椅主体。',
          },
        },
      }),
    })

    expect(result.text).toBe(
      '# 中栏特殊内容渲染测试\n\n内部摘要 一、当前结论：暂不建议直接提交\n\n一种自适应办公椅系统，包括座椅主体。',
    )
    expect(result.text).not.toContain('输出内容')
    expect(result.text).not.toContain('检查摘要')
    expect(result.text).not.toContain('权利要求书和生成报告')
  })

  test('removes matching Dify output parameter name from top-level answer_text', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text: '权利要求书和生成报告 1. 一种自适应办公椅系统，包括座椅主体。',
      response: JSON.stringify({
        data: {
          outputs: {
            权利要求书和生成报告: '1. 一种自适应办公椅系统，包括座椅主体。',
          },
        },
      }),
    })

    expect(result.text).toBe('1. 一种自适应办公椅系统，包括座椅主体。')
  })

  test('removes output field name when outputs are stored in top-level output json', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text: '权利要求书和生成报告: 1. 一种自适应办公椅系统，包括座椅主体。',
      output: JSON.stringify({
        data: {
          outputs: {
            权利要求书和生成报告: '1. 一种自适应办公椅系统，包括座椅主体。',
          },
        },
      }),
    })

    expect(result.text).toBe('1. 一种自适应办公椅系统，包括座椅主体。')
  })

  test('removes output field name before markdown heading text', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text: '输出内容 # 标题\n正文',
      response: JSON.stringify({
        data: {
          outputs: {
            输出内容: '# 标题\n正文',
          },
        },
      }),
    })

    expect(result.text).toBe('# 标题\n正文')
  })

  test('removes output field name before matching plain paragraph text', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text: '输出内容 正文内容',
      response: JSON.stringify({
        data: {
          outputs: {
            输出内容: '正文内容',
          },
        },
      }),
    })

    expect(result.text).toBe('正文内容')
  })

  test('removes standard main text output name without schema or outputs', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text: '生成内容: # 标题\n正文',
    })

    expect(result.text).toBe('# 标题\n正文')
  })

  test('removes legacy main text output name without schema or outputs', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text: '输出内容: # 标题\n正文',
    })

    expect(result.text).toBe('# 标题\n正文')
  })

  test('keeps ordinary sentence that starts with standard main text words', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text: '生成内容显示，本次结果已经完成。',
    })

    expect(result.text).toBe('生成内容显示，本次结果已经完成。')
  })

  test('removes title-derived workflow output name before markdown heading in history text', () => {
    const result = normalizeWorkflowResultPayload({
      type: 1,
      name: '技术背景研究报告-Basic-1.0.1',
      answer_text: '技术背景研究报告: # 电驱动转向前桥集成系统技术研究报告\n\n## 报告摘要',
    })

    expect(result.text).toBe('# 电驱动转向前桥集成系统技术研究报告\n\n## 报告摘要')
  })

  test('removes generated-title workflow output name before markdown section in history text', () => {
    const result = normalizeWorkflowResultPayload({
      type: 1,
      api_name: '说明书生成-Basic',
      answer_text: '说明书: ## 一、说明书摘要\n\n本发明涉及一种办公椅系统。',
    })

    expect(result.text).toBe('## 一、说明书摘要\n\n本发明涉及一种办公椅系统。')
  })

  test('uses workflow title fallback for legacy history text when type is missing', () => {
    const result = normalizeWorkflowResultPayload({
      api_name: '说明书生成-Basic',
      answer_text: '说明书: ## 一、说明书摘要\n\n本发明涉及一种办公椅系统。',
    })

    expect(result.text).toBe('## 一、说明书摘要\n\n本发明涉及一种办公椅系统。')
  })

  test('removes generated report title fallback before plain paragraph text', () => {
    const result = normalizeWorkflowResultPayload({
      api_name: '权利要求书生成-Fast',
      answer_text: '权利要求书和生成报告: 本发明公开了一种自适应办公椅系统。',
    })

    expect(result.text).toBe('本发明公开了一种自适应办公椅系统。')
  })

  test('removes schema-like workflow output name before repeated title and ordered list', () => {
    const result = normalizeWorkflowResultPayload({
      type: 1,
      api_name: '权利要求书生成-Fast',
      answer_text: '权利要求书: 权利要求书\n\n1. 一种自适应办公椅系统，包括座椅主体。',
    })

    expect(result.text).toBe('权利要求书\n\n1. 一种自适应办公椅系统，包括座椅主体。')
  })

  test('does not use workflow title fallback for chatflow history text', () => {
    const result = normalizeWorkflowResultPayload({
      type: 2,
      name: '说明书生成-Basic',
      answer_text: '说明书: ## 一、说明书摘要\n\n本发明涉及一种办公椅系统。',
    })

    expect(result.text).toBe('说明书: ## 一、说明书摘要\n\n本发明涉及一种办公椅系统。')
  })

  test('keeps workflow title fallback text when the remaining body is not structured', () => {
    const result = normalizeWorkflowResultPayload({
      type: 1,
      name: '报告生成-Basic',
      answer_text: '报告: 正文',
    })

    expect(result.text).toBe('报告: 正文')
  })

  test('keeps legitimate text that starts with the same output field label', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text: '报告: 正文',
      response: JSON.stringify({
        data: {
          outputs: {
            报告: '报告: 正文',
          },
        },
      }),
    })

    expect(result.text).toBe('报告: 正文')
  })

  test('keeps ordinary text that only starts with the same characters as an output key', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text: '报告显示，本方案仍需补充实施例。',
      response: JSON.stringify({
        data: {
          outputs: {
            报告: '报告显示，本方案仍需补充实施例。',
          },
        },
      }),
    })

    expect(result.text).toBe('报告显示，本方案仍需补充实施例。')
  })

  test('removes leaked Dify file object suffix from answer_text while preserving body text', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text:
        "说明书: 正文内容\n\n说明书文件: [{'dify_model_identity': '__dify__file__', 'id': None, 'tenant_id': '05f16089-4fbf-4dc5-94da-adab84b46f80', 'type': 'document', 'transfer_method': 'tool_file', 'remote_url': None, 'related_id': '8ce60216-fb05-41b6-82af-de5392d181cc', 'filename': '说明书.docx', 'url': '/files/tools/8ce60216-fb05-41b6-82af-de5392d181cc.docx?timestamp=1&nonce=2&sign=3'}]",
    })

    expect(result.text).toBe('说明书: 正文内容')
  })

  test('removes leaked Dify file object suffix from outputs fallback text', () => {
    const result = normalizeWorkflowResultPayload({
      response: JSON.stringify({
        data: {
          outputs: {
            report_markdown:
              "报告正文\n\n报告文件: [{'dify_model_identity': '__dify__file__', 'type': 'document', 'transfer_method': 'tool_file', 'url': '/files/tools/result.docx?sign=1'}]",
          },
        },
      }),
    })

    expect(result.text).toBe('报告正文')
  })

  test('removes leaked Dify file object blocks after arbitrary labels', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text:
        "正文内容\n\n附件: [{'dify_model_identity': '__dify__file__', 'type': 'document', 'transfer_method': 'tool_file', 'url': '/files/tools/attachment.docx?sign=1'}]\n\n生成结果： {'type': 'document', 'transfer_method': 'tool_file', 'url': '/files/tools/result.docx?sign=2'}\n\n参考材料: [{'type': 'document', 'url': '/files/tools/reference.docx?sign=3'}]",
    })

    expect(result.text).toBe('正文内容')
  })

  test('keeps ordinary labeled JSON text without Dify file object markers', () => {
    const ordinaryText = '正文内容\n\n参数: {"name": "demo", "enabled": true}'

    const result = normalizeWorkflowResultPayload({
      answer_text: ordinaryText,
    })

    expect(result.text).toBe(ordinaryText)
  })

  test('keeps ordinary transfer_method JSON text when it is not a Dify tool file object', () => {
    const ordinaryText =
      '正文内容\n\n参数: {"transfer_method": "remote_url", "url": "https://example.com/input.docx"}'

    const result = normalizeWorkflowResultPayload({
      answer_text: ordinaryText,
    })

    expect(result.text).toBe(ordinaryText)
  })

  test('removes leaked non-document Dify tool file object blocks', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text:
        "正文内容\n\n图片附件: {'type': 'image', 'transfer_method': 'tool_file', 'filename': 'result.png', 'url': 'https://example.com/result.png'}\n\n音频附件: {'type': 'audio', 'transfer_method': 'tool_file', 'filename': 'result.mp3', 'url': 'https://example.com/result.mp3'}\n\n视频附件: {'type': 'video', 'transfer_method': 'tool_file', 'filename': 'result.mp4', 'url': 'https://example.com/result.mp4'}",
    })

    expect(result.text).toBe('正文内容')
  })

  test('keeps leaked Dify image object as file output while cleaning answer text', () => {
    const result = normalizeWorkflowResultPayload({
      answer_text:
        "正文内容\n\n图片附件: {'type': 'image', 'transfer_method': 'tool_file', 'filename': 'result.png', 'url': '/files/tools/result.png?timestamp=1&sign=2'}",
    })

    expect(result.text).toBe('正文内容')
    expect(result.file_output).toEqual([
      expect.objectContaining({
        filename: 'result.png',
        url: '/files/tools/result.png?timestamp=1&sign=2',
        mime_type: 'image/png',
      }),
    ])
  })

  test('extracts Dify image objects from nested outputs', () => {
    const result = normalizeWorkflowResultPayload({
      response: JSON.stringify({
        data: {
          outputs: {
            answer: '正文内容',
            image_result: [
              {
                type: 'image',
                transfer_method: 'tool_file',
                filename: 'nested.webp',
                url: 'https://example.com/nested.webp',
              },
            ],
          },
        },
      }),
    })

    expect(result.text).toBe('正文内容')
    expect(result.file_output).toEqual([
      expect.objectContaining({
        filename: 'nested.webp',
        url: 'https://example.com/nested.webp',
        mime_type: 'image/webp',
      }),
    ])
  })

  test('does not treat Dify image objects from inputs as generated file output', () => {
    const result = normalizeWorkflowResultPayload({
      inputs: {
        reference_image: {
          type: 'image',
          transfer_method: 'tool_file',
          filename: 'user-reference.png',
          url: '/files/tools/user-reference.png?sign=1',
        },
      },
      response: JSON.stringify({
        data: {
          outputs: {
            answer: '正文内容',
          },
        },
      }),
    })

    expect(result.text).toBe('正文内容')
    expect(result.file_output).toBeUndefined()
  })

  test('does not treat echoed input images inside outputs as generated file output', () => {
    const result = normalizeWorkflowResultPayload({
      response: JSON.stringify({
        data: {
          outputs: {
            answer: '正文内容',
            inputs: {
              reference_image: {
                type: 'image',
                transfer_method: 'tool_file',
                filename: 'user-reference.png',
                url: '/files/tools/user-reference.png?sign=1',
              },
            },
          },
        },
      }),
    })

    expect(result.text).toBe('正文内容')
    expect(result.file_output).toBeUndefined()
  })
})
