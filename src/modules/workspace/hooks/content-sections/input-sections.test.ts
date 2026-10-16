import { describe, expect, jest, test } from '@jest/globals'
import type { ApiDetail } from '@/types/api'

import { buildDynamicInputSections, convertApiFieldToInputSection } from './input-sections'

jest.mock('@/constants', () => ({
  FALLBACK_CONTENT_PAGES: [] as Array<{ key: string; label: string }>,
}))

describe('buildDynamicInputSections', () => {
  test('maps backend fields without generating inferred placeholder text', () => {
    const apiDetail = {
      id: 1,
      name: 'demo',
      api_type: 'Workflow',
      price: 0,
      is_async: 0,
      api_key: '',
      credentials: '',
      input_schema: [
        {
          type: 'paragraph',
          cn_name: '调研方向',
          en_name: 'content',
          content: '',
        },
      ],
      output_schema: [],
      created_at: '',
      updated_at: '',
    } as ApiDetail

    const sections = buildDynamicInputSections(apiDetail)

    expect(sections).toEqual([
      {
        key: 'content',
        label: '调研方向',
        placeholder: '',
        inputMode: 'text',
        isMultiFile: false,
        supportsFileUpload: false,
        supportsImageUpload: false,
        required: false,
      },
    ])
  })

  test('preserves duplicate en_name fields in backend order', () => {
    const apiDetail = {
      id: 2,
      name: 'duplicate-demo',
      api_type: 'Workflow',
      price: 0,
      is_async: 0,
      api_key: '',
      credentials: '',
      input_schema: [
        {
          type: 'text',
          cn_name: '参数A',
          en_name: 'same_key',
          content: 'A',
        },
        {
          type: 'text',
          cn_name: '参数B',
          en_name: 'same_key',
          content: 'B',
        },
      ],
      output_schema: [],
      created_at: '',
      updated_at: '',
    } as ApiDetail

    const sections = buildDynamicInputSections(apiDetail)

    expect(sections).toHaveLength(2)
    expect(sections[0]?.label).toBe('参数A')
    expect(sections[1]?.label).toBe('参数B')
  })
})

describe('convertApiFieldToInputSection', () => {
  test('file 类型生成 isMultiFile=false', () => {
    const result = convertApiFieldToInputSection({
      type: 'file',
      cn_name: '文件',
      en_name: 'doc',
      content: '',
    })
    expect(result.isMultiFile).toBe(false)
  })

  test('file_list 类型生成 isMultiFile=true', () => {
    const result = convertApiFieldToInputSection({
      type: 'file_list',
      cn_name: '文件列表',
      en_name: 'docs',
      content: '',
    })
    expect(result.isMultiFile).toBe(true)
  })

  test('content 含“必填”时标记 required=true', () => {
    const result = convertApiFieldToInputSection({
      type: 'file',
      cn_name: '专利附图',
      en_name: 'drawings',
      content: '专利附图，必填',
    })

    expect(result.required).toBe(true)
  })
})
