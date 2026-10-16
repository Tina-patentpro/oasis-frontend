import { describe, expect, test } from '@jest/globals'

import { classifyError, ErrorType, getFriendlyErrorMessage, isDynamicImportError } from './types'

describe('error boundary type classification', () => {
  test('classifies dynamic import failures before generic network errors', () => {
    const error = new Error(
      'Failed to fetch dynamically imported module: /assets/ContentRenderer.js',
    )

    expect(isDynamicImportError(error)).toBe(true)
    expect(classifyError(error)).toBe(ErrorType.DYNAMIC_IMPORT_ERROR)
    expect(getFriendlyErrorMessage(error)).toBe('页面资源加载失败，请刷新页面后重试')
  })
})
