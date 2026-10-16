import { describe, expect, test } from '@jest/globals'
import type { CategoriesResponse } from '@/types/api'

import { getApiEndpoint } from './selectors'

function buildMockCategories(): CategoriesResponse {
  return {
    专利撰写: [
      {
        id: 1,
        name: '技术交底书完善',
        group: '专利撰写',
        description: 'desc',
        file_url: '',
        workflow: '',
        sort: 1,
        is_active: true,
        apis: [
          {
            id: 101,
            sub_category_id: 1,
            ai_model_id: 11,
            aimodel: '3.3-Fast-X',
            api_endpoint: 'patent_generate',
            api_description: 'fast',
            api_process: '步骤1,步骤2',
          },
          {
            id: 102,
            sub_category_id: 1,
            ai_model_id: 12,
            aimodel: '3.2-Basic-X',
            api_endpoint: 'patent_generate_basic',
            api_description: 'basic',
            api_process: '步骤1',
          },
        ],
      },
    ],
  }
}

describe('getApiEndpoint', () => {
  test('returns endpoint when model version matches aimodel', () => {
    const data = buildMockCategories()
    expect(getApiEndpoint(data, '技术交底书完善', '3.3-Fast-X')).toBe('patent_generate')
  })

  test('returns endpoint when model version matches api id string', () => {
    const data = buildMockCategories()
    expect(getApiEndpoint(data, '技术交底书完善', '102')).toBe('patent_generate_basic')
  })

  test('falls back to first api endpoint when model version does not match', () => {
    const data = buildMockCategories()
    expect(getApiEndpoint(data, '技术交底书完善', '不存在的模型版本')).toBe('patent_generate')
  })

  test('trims tool name and model version before matching', () => {
    const data = buildMockCategories()
    expect(getApiEndpoint(data, ' 技术交底书完善 ', ' 3.2-Basic-X ')).toBe('patent_generate_basic')
  })

  test('returns null when no tool found', () => {
    const data = buildMockCategories()
    expect(getApiEndpoint(data, '不存在的工具', '3.3-Fast-X')).toBeNull()
  })
})
