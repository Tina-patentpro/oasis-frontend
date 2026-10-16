import { describe, expect, test } from '@jest/globals'

import { resolveAsyncTerminalDecision } from './async-terminal-decision'

describe('resolveAsyncTerminalDecision', () => {
  test('treats create response with text result as completed when result-only completion is allowed', () => {
    const result = resolveAsyncTerminalDecision({
      generatedContent: '最终结果',
      status: 'failed',
      allowResultOnlyCompletion: true,
    })

    expect(result.kind).toBe('completed')
    expect(result.hasText).toBe(true)
    expect(result.hasFiles).toBe(false)
  })

  test('treats completed result with text and error message as completed', () => {
    const result = resolveAsyncTerminalDecision({
      is_completed: true,
      answer_text: '最终结果',
      error_message: '后端保留的告警',
      status: 'failed',
    })

    expect(result.kind).toBe('completed')
    expect(result.hasText).toBe(true)
    expect(result.hasFiles).toBe(false)
  })

  test('treats completed result with file url and failed status as completed', () => {
    const result = resolveAsyncTerminalDecision({
      progress_percent: 100,
      file_url: 'https://example.com/result.docx',
      status: 'failed',
    })

    expect(result.kind).toBe('completed')
    expect(result.hasText).toBe(false)
    expect(result.hasFiles).toBe(true)
  })

  test('does not treat failed result text as completed without completion signal', () => {
    const result = resolveAsyncTerminalDecision({
      answer_text: '处理中提示',
      error_message: '后端报错',
      status: 'failed',
    })

    expect(result.kind).toBe('failed')
    expect(result.hasText).toBe(true)
    expect(result.hasFiles).toBe(false)
  })

  test('treats explicit failed status without result as failed', () => {
    const result = resolveAsyncTerminalDecision({
      status: 'failed',
      error_message: '执行失败',
    })

    expect(result.kind).toBe('failed')
  })

  test('keeps running status when there is no result and no explicit failure', () => {
    const result = resolveAsyncTerminalDecision({
      status: 'running',
      progress_percent: 50,
    })

    expect(result.kind).toBe('running')
    expect(result.hasText).toBe(false)
    expect(result.hasFiles).toBe(false)
  })
})
