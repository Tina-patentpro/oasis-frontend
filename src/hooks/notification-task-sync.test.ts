import { describe, expect, test } from '@jest/globals'

import type { Notification } from '@/types/api'

import { buildLatestTaskStatusUpdates, parseTaskStatusNotification } from './notification-task-sync'

const createNotification = (overrides: Partial<Notification>): Notification => ({
  id: overrides.id ?? 1,
  title: overrides.title ?? '系统通知',
  message: overrides.message ?? '',
  read: overrides.read ?? false,
  createdAt: overrides.createdAt ?? '2026-02-26T21:27:13',
  type: overrides.type ?? 'info',
})

describe('notification task sync', () => {
  test('parses completed status and task_key from notification title/message', () => {
    const notification = createNotification({
      title: '任务已完成，task_key为:',
      message: 'task_1772112288951_xmt4iehleo',
    })

    expect(parseTaskStatusNotification(notification)).toMatchObject({
      taskKey: 'task_1772112288951_xmt4iehleo',
      status: 'completed',
    })
  })

  test('parses failed status and task_key from notification content', () => {
    const notification = createNotification({
      title: '执行异常',
      message: '任务失败，task_key: task_1772112288951_abcd',
    })

    expect(parseTaskStatusNotification(notification)).toMatchObject({
      taskKey: 'task_1772112288951_abcd',
      status: 'failed',
    })
  })

  test('parses success wording as completed status and can be used for status correction', () => {
    const notification = createNotification({
      title: '任务成功',
      message: '执行成功，task_key: task_1772112288951_fix',
    })

    expect(parseTaskStatusNotification(notification)).toMatchObject({
      taskKey: 'task_1772112288951_fix',
      status: 'completed',
    })
  })

  test('parses completed notification when message uses task_id label', () => {
    const notification = createNotification({
      title: '技术背景研究报告-Basic:任务已完成',
      message: '任务已完成，task_id为task_1773725634612_eu6hj2gjspt',
    })

    expect(parseTaskStatusNotification(notification)).toMatchObject({
      taskKey: 'task_1773725634612_eu6hj2gjspt',
      status: 'completed',
    })
  })

  test('returns null when notification contains both completed and failed wording', () => {
    const notification = createNotification({
      title: '任务已完成',
      message: '任务已完成，但同时提示执行失败，task_key: task_ambiguous',
    })

    expect(parseTaskStatusNotification(notification)).toBeNull()
  })

  test('does not treat generic exception wording alone as failed status', () => {
    const notification = createNotification({
      title: '系统异常提醒',
      message: 'task_key: task_generic_exception',
    })

    expect(parseTaskStatusNotification(notification)).toBeNull()
  })

  test('keeps latest status for same task_key based on createdAt', () => {
    const updates = buildLatestTaskStatusUpdates([
      createNotification({
        id: 1,
        title: '任务失败',
        message: 'task_key: task_1',
        createdAt: '2026-02-26T21:20:00',
      }),
      createNotification({
        id: 2,
        title: '任务已完成，task_key为: task_1',
        message: '任务已完成',
        createdAt: '2026-02-26T21:27:13',
      }),
    ])

    expect(updates.get('task_1')).toBe('completed')
  })

  test('ignores ambiguous notification when computing latest status updates', () => {
    const updates = buildLatestTaskStatusUpdates([
      createNotification({
        id: 1,
        title: '任务失败',
        message: 'task_key: task_2',
        createdAt: '2026-02-26T21:20:00',
      }),
      createNotification({
        id: 2,
        title: '任务已完成',
        message: '任务已完成，但同时提示执行失败，task_key: task_2',
        createdAt: '2026-02-26T21:27:13',
      }),
    ])

    expect(updates.get('task_2')).toBe('failed')
  })

  test('returns null when notification does not contain task status event', () => {
    const notification = createNotification({
      title: '系统通知',
      message: '欢迎使用系统',
    })

    expect(parseTaskStatusNotification(notification)).toBeNull()
  })
})
