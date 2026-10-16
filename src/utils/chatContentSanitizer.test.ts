import { describe, expect, test } from '@jest/globals'

import { stripThinkingContent } from './chatContentSanitizer'

describe('chatContentSanitizer', () => {
  test('removes a complete think block and keeps final content', () => {
    expect(stripThinkingContent('<think>内部推理</think>\n\n最终正文')).toBe('最终正文')
  })

  test('removes multiple think blocks', () => {
    expect(
      stripThinkingContent('<think>第一段推理</think>\n正文 A\n<think>第二段推理</think>\n正文 B'),
    ).toBe('正文 A\n正文 B')
  })

  test('removes think blocks regardless of tag casing', () => {
    expect(stripThinkingContent('<THINK>内部推理</THINK>\n最终正文')).toBe('最终正文')
  })

  test('removes an unclosed think block only when it starts the content', () => {
    expect(stripThinkingContent('<think>\n未闭合推理')).toBe('')
  })

  test('keeps an unclosed think marker in the middle to avoid deleting real content', () => {
    expect(stripThinkingContent('正文前半段 <think> 这里缺少闭合')).toBe(
      '正文前半段 <think> 这里缺少闭合',
    )
  })

  test('keeps ordinary content unchanged', () => {
    expect(stripThinkingContent('普通正文\n\n第二段')).toBe('普通正文\n\n第二段')
  })
})
