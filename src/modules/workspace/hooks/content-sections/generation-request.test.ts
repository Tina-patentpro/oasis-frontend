import { describe, expect, it } from '@jest/globals'

import type { ApiInputField } from '@/types/api'

import {
  buildGenerationRequestFields,
  buildSessionTrackingTitle,
  resolveApiProcess,
} from './generation-request'

const inputSchema: ApiInputField[] = [
  { type: 'text', cn_name: '标题', en_name: 'title', content: '' },
  { type: 'file', cn_name: '交底书', en_name: 'disclosure', content: '' },
  { type: 'file_list', cn_name: '附件', en_name: 'attachments', content: '' },
  { type: 'image', cn_name: '示意图', en_name: 'drawing', content: '' },
]

describe('buildGenerationRequestFields', () => {
  it('builds backend inputs and upload field lists from input schema', () => {
    expect(
      buildGenerationRequestFields(inputSchema, {
        title: '一种智能写作方法',
        disclosure: 'file-a',
        attachments: 'file-b',
        drawing: 'image-c',
      }),
    ).toEqual({
      inputs: {
        title: '一种智能写作方法',
        disclosure: 'file-a',
        attachments: 'file-b',
        drawing: 'image-c',
      },
      fileFields: ['disclosure', 'attachments', 'drawing'],
      multiFileFields: ['attachments'],
    })
  })

  it('uses empty strings for missing or non-string input values', () => {
    expect(
      buildGenerationRequestFields(inputSchema, {
        title: undefined,
        disclosure: 123,
      }),
    ).toEqual({
      inputs: {
        title: '',
        disclosure: '',
        attachments: '',
        drawing: '',
      },
      fileFields: ['disclosure', 'attachments', 'drawing'],
      multiFileFields: ['attachments'],
    })
  })

  it('returns empty request fields when schema is missing', () => {
    expect(buildGenerationRequestFields(undefined, { title: 'x' })).toEqual({
      inputs: {},
      fileFields: [],
      multiFileFields: [],
    })
  })
})

describe('resolveApiProcess', () => {
  it('matches tool metadata by version name or id', () => {
    const metadata = {
      专利撰写: {
        versions: [
          { id: 'v1', name: 'V1', api_process: '流程一' },
          { id: 'v2', name: 'V2', api_process: '流程二' },
        ],
      },
    }

    expect(resolveApiProcess(metadata, '专利撰写', 'V2')).toBe('流程二')
    expect(resolveApiProcess(metadata, '专利撰写', 'v1')).toBe('流程一')
  })

  it('falls back to an empty process when metadata or version is missing', () => {
    expect(resolveApiProcess({}, '专利撰写', 'V1')).toBe('')
    expect(resolveApiProcess({ 专利撰写: { versions: [] } }, '专利撰写', 'V1')).toBe('')
  })
})

describe('buildSessionTrackingTitle', () => {
  it('uses the first non-empty input line and limits it to 30 characters', () => {
    expect(
      buildSessionTrackingTitle('\n  这是一段很长很长很长很长很长很长的输入内容  ', '默认工具'),
    ).toBe('这是一段很长很长很长很长很长很长的输入内容')
  })

  it('falls back to tool name when input is empty', () => {
    expect(buildSessionTrackingTitle('   \n  ', '专利撰写')).toBe('专利撰写')
  })

  it('uses a generic fallback when input and tool name are empty', () => {
    expect(buildSessionTrackingTitle('', '')).toBe('生成中')
  })
})
