import { describe, expect, test } from '@jest/globals'

import { appendToChatInput, joinReadableSnippets, prependToChatInput } from './chatInputAppend'

describe('chatInputAppend', () => {
  test('uses incoming text directly when current input is empty', () => {
    expect(appendToChatInput('', '新增内容')).toBe('新增内容')
    expect(appendToChatInput('   ', '新增内容')).toBe('新增内容')
  })

  test('appends incoming text after existing input with a blank line separator', () => {
    expect(appendToChatInput('已有内容', '新增内容')).toBe('已有内容\n\n新增内容')
  })

  test('preserves leading space in existing input when appending', () => {
    expect(appendToChatInput('  已有缩进内容  ', '新增内容')).toBe(
      '  已有缩进内容\n\n新增内容',
    )
  })

  test('keeps existing input when incoming text is empty', () => {
    expect(appendToChatInput('已有内容', '   ')).toBe('已有内容')
  })

  test('trims only surrounding blank space from incoming text', () => {
    expect(appendToChatInput('已有内容', '\n  新增内容  \n')).toBe('已有内容\n\n新增内容')
  })

  test('joins readable snippets and removes empty entries', () => {
    expect(joinReadableSnippets([' 历史一 ', '', '  ', '历史二'])).toBe('历史一\n\n历史二')
  })

  test('prepends incoming text before existing input with a blank line separator', () => {
    expect(prependToChatInput('已有内容', '新增内容')).toBe('新增内容\n\n已有内容')
  })

  test('keeps existing input when prepended text is empty', () => {
    expect(prependToChatInput('已有内容', '   ')).toBe('已有内容')
  })

  test('preserves existing input format when prepending', () => {
    expect(prependToChatInput('  已有缩进内容  ', '\n  新增内容  \n')).toBe(
      '新增内容\n\n  已有缩进内容  ',
    )
  })
})
