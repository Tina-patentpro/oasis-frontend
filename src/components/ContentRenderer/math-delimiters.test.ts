import { describe, expect, test } from '@jest/globals'

import { normalizeMathDelimiters } from './math-delimiters'

describe('normalizeMathDelimiters', () => {
  test('converts common AI LaTeX delimiters outside code blocks', () => {
    const source = [
      '行内公式：\\(E=mc^2\\)',
      '',
      '块级公式：',
      '\\[',
      '\\frac{a}{b}',
      '\\]',
      '',
      '```md',
      '\\(不要转换\\)',
      '```',
      '',
      '`\\(也不要转换\\)`',
    ].join('\n')

    expect(normalizeMathDelimiters(source)).toBe(
      [
        '行内公式：$E=mc^2$',
        '',
        '块级公式：',
        '$$',
        '\\frac{a}{b}',
        '$$',
        '',
        '```md',
        '\\(不要转换\\)',
        '```',
        '',
        '`\\(也不要转换\\)`',
      ].join('\n'),
    )
  })
})
