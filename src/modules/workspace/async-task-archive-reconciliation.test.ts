import { describe, expect, jest, test } from '@jest/globals'

import type { AsyncTaskStatus } from '@/modules/workspace/stores'

jest.mock('@/api/services', () => ({
  sessionService: {
    getSessions: jest.fn(),
  },
}))

import { isRecentArchiveForTask } from './async-task-archive-reconciliation'

const NOW = Date.parse('2026-07-10T08:00:00.000Z')

function createTask(overrides: Partial<AsyncTaskStatus> = {}): AsyncTaskStatus {
  return {
    taskKey: 'task-current',
    apiDetailId: 1,
    apiName: '专利报告生成',
    folderId: 0,
    progressPercent: 0,
    currentStepName: '等待状态确认',
    status: 'running',
    createdAt: NOW,
    toolName: '报告工具',
    ...overrides,
  }
}

describe('isRecentArchiveForTask', () => {
  test('does not mistake a previous same-tool session for the current task archive', () => {
    expect(
      isRecentArchiveForTask(
        createTask(),
        {
          title: '报告工具-Basic',
          toolType: '报告工具',
          api_name: '专利报告生成',
          createdAt: new Date(NOW - 2 * 60 * 1000).toISOString(),
          answer_text: '上一轮生成结果',
        },
        NOW + 30_000,
      ),
    ).toBe(false)
  })

  test('requires an exact API identity when the saved session exposes api_name', () => {
    expect(
      isRecentArchiveForTask(
        createTask(),
        {
          title: '报告工具-Basic',
          toolType: '报告工具',
          api_name: '专利报告生成-旧版',
          createdAt: new Date(NOW + 10_000).toISOString(),
          answer_text: '其他接口结果',
        },
        NOW + 30_000,
      ),
    ).toBe(false)
  })
})
