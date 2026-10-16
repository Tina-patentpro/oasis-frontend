import { describe, expect, test } from '@jest/globals'

import {
  buildAsyncGuidanceMarkdown,
  buildAsyncGuidanceFollowUpMarkdown,
  extractBackendAsyncNoticeMarkdown,
  isLikelyAsyncPlaceholderText,
  resolveAsyncGuidanceStatus,
} from './async-guidance'

describe('async guidance helpers', () => {
  test('maps queued/running/failed status from workflow status', () => {
    expect(resolveAsyncGuidanceStatus({ workflowStatus: 'queued' })).toBe('queued')
    expect(resolveAsyncGuidanceStatus({ workflowStatus: 'running' })).toBe('running')
    expect(resolveAsyncGuidanceStatus({ workflowStatus: 'failed' })).toBe('failed')
  })

  test('falls back to running when backend placeholder text indicates async processing', () => {
    expect(
      resolveAsyncGuidanceStatus({
        workflowStatus: 'completed',
        backendText: '###异步任务，请等待通知',
      }),
    ).toBe('running')
  })

  test('builds markdown guidance with backend message appendix', () => {
    const markdown = buildAsyncGuidanceMarkdown({
      taskKey: 'task_123',
      toolName: 'deepsearch',
      status: 'running',
      submittedAt: new Date('2026-02-16T10:20:30.000Z'),
      backendMessage: '###异步任务，请等待通知',
    })

    expect(markdown).toContain('## 异步任务执行指引')
    expect(markdown).toContain('任务编号：`task_123`')
    expect(markdown).toContain('状态：处理中')
    expect(markdown).toContain('### 后端返回原文')
    expect(markdown).toContain('> ###异步任务，请等待通知')
  })

  test('uses lightweight follow-up markdown when backend already provides full notice', () => {
    const notice = extractBackendAsyncNoticeMarkdown({
      outputs: {
        async_notice_markdown: '## 后端异步提示',
      },
      rawResponse: {},
    })
    const followUp = buildAsyncGuidanceFollowUpMarkdown({
      taskKey: 'task_456',
      toolName: 'workflow-x',
      status: 'queued',
      submittedAt: new Date('2026-02-16T10:20:30.000Z'),
    })

    expect(notice).toBe('## 后端异步提示')
    expect(followUp).toContain('## 异步任务执行指引')
    expect(followUp).toContain('状态：排队中')
  })

  test('does NOT flag common patent text as async placeholder', () => {
    // 专利权利要求书中常见词，不应触发异步指引误判
    expect(isLikelyAsyncPlaceholderText('一种信号处理方法及装置')).toBe(false)
    expect(isLikelyAsyncPlaceholderText('发送通知单元')).toBe(false)
    expect(isLikelyAsyncPlaceholderText('包括处理器和存储器')).toBe(false)
    expect(isLikelyAsyncPlaceholderText('用于通知其他设备的模块')).toBe(false)
    expect(isLikelyAsyncPlaceholderText('稍后说明的技术方案')).toBe(false)
    expect(isLikelyAsyncPlaceholderText('pending在队列中的数据')).toBe(false)
  })

  test('correctly flags explicit async placeholder text', () => {
    expect(isLikelyAsyncPlaceholderText('异步任务，请等待通知')).toBe(true)
    expect(isLikelyAsyncPlaceholderText('任务已提交，后台处理中。请稍后查看')).toBe(true)
    expect(isLikelyAsyncPlaceholderText('异步处理中，请稍后查看')).toBe(true)
    expect(isLikelyAsyncPlaceholderText('后台生成中，完成后通知')).toBe(true)
    expect(isLikelyAsyncPlaceholderText('任务已提交，正在排队中')).toBe(true)
    expect(isLikelyAsyncPlaceholderText('正在异步生成中...')).toBe(true)
  })
})
