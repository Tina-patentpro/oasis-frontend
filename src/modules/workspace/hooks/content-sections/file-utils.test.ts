import { describe, expect, test } from '@jest/globals'

import { createWorkflowFileFromUrl } from './file-utils'

describe('createWorkflowFileFromUrl', () => {
  test('uses decoded URL filename for display', () => {
    const result = createWorkflowFileFromUrl(
      'https://lzhxpy.oasisintwrite.com/uploads/workflow/%E5%8D%95%E6%96%87%E4%BB%B62026-03-02%2017_40.docx',
      'fallback.docx',
    )

    expect(result.fileName).toBe('单文件2026-03-02 17_40.docx')
  })

  test('keeps relative download urls unchanged', () => {
    const result = createWorkflowFileFromUrl('/files/tools/result.docx?sign=abc', 'fallback.docx')

    expect(result.url).toBe('/files/tools/result.docx?sign=abc')
    expect(result.fileName).toBe('result.docx')
  })

  test('does not default missing backend file size to 0', () => {
    const result = createWorkflowFileFromUrl('/files/tools/result.docx?sign=abc', 'fallback.docx')

    expect(result.size).toBeUndefined()
  })
})
