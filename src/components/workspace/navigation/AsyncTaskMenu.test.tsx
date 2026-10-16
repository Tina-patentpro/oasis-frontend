import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import userEvent from '@testing-library/user-event'

import { dispatchAsyncTaskCenterReminder } from '@/modules/workspace/events/async-task-center-event'
import { useAsyncTaskStore } from '@/modules/workspace/stores'

import { AsyncTaskMenu } from './AsyncTaskMenu'

jest.mock('@/components/ui', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/components/ui/motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    button: React.forwardRef<
      HTMLButtonElement,
      React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }
    >(function MockMotionButton({ children, ...props }, ref) {
      return (
        <button ref={ref} {...props}>
          {children}
        </button>
      )
    }),
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    span: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & { children: React.ReactNode }) => (
      <span {...props}>{children}</span>
    ),
    svg: ({
      children,
      ...props
    }: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) => (
      <svg {...props}>{children}</svg>
    ),
  },
}))

describe('AsyncTaskMenu', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    useAsyncTaskStore.setState({
      tasks: {
        task_1: {
          taskKey: 'task_1',
          apiDetailId: 1,
          apiName: '测试任务',
          folderId: 1,
          progressPercent: 0,
          currentStepName: '请求排队中...',
          status: 'queued',
          createdAt: Date.now(),
          toolName: '测试工具',
        },
      },
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    useAsyncTaskStore.setState({ tasks: {} })
    sessionStorage.clear()
  })

  test('auto opens on reminder event and closes after auto-close delay', () => {
    render(
      <AsyncTaskMenu
        currentTheme={{ primary: '#0ea5e9' } as any}
        isDarkTheme={false}
        headerBtnStyle={{}}
      />,
    )

    expect(screen.queryByText('异步任务中心')).toBeNull()

    act(() => {
      dispatchAsyncTaskCenterReminder({
        taskKey: 'task_1',
        toolName: '测试工具',
        folderId: 1,
        submittedAtMs: Date.now(),
      })
    })

    expect(screen.getByText('异步任务中心')).not.toBeNull()

    act(() => {
      jest.advanceTimersByTime(15000)
    })

    expect(screen.queryByText('异步任务中心')).toBeNull()
  })

  test('keeps menu open when user opened it manually', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <AsyncTaskMenu
        currentTheme={{ primary: '#0ea5e9' } as any}
        isDarkTheme={false}
        headerBtnStyle={{}}
      />,
    )

    await user.click(screen.getByRole('button', { name: '异步任务' }))
    expect(screen.getByText('异步任务中心')).not.toBeNull()

    act(() => {
      dispatchAsyncTaskCenterReminder({
        taskKey: 'task_1',
        toolName: '测试工具',
        folderId: 1,
        submittedAtMs: Date.now(),
      })
      jest.advanceTimersByTime(15000)
    })

    expect(screen.getByText('异步任务中心')).not.toBeNull()
  })

  test('exposes task progress as a readable progressbar', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <AsyncTaskMenu
        currentTheme={{ primary: '#0ea5e9' } as any}
        isDarkTheme={false}
        headerBtnStyle={{}}
      />,
    )

    await user.click(screen.getByRole('button', { name: '异步任务' }))

    const progress = screen.getByRole('progressbar', { name: '测试任务进度' })
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '0')
  })

  test('links the trigger to the non-modal task center and closes it with Escape', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <AsyncTaskMenu
        currentTheme={{ primary: '#0ea5e9' } as any}
        isDarkTheme={false}
        headerBtnStyle={{}}
      />,
    )

    const trigger = screen.getByRole('button', { name: '异步任务' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-controls')

    await user.click(trigger)

    const panel = screen.getByRole('dialog', { name: '后台任务中心' })
    const clearCompletedButton = screen.getByRole('button', { name: '清除已完成' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', panel.id)
    await waitFor(() => expect(clearCompletedButton).toHaveFocus())

    await user.tab()
    expect(clearCompletedButton).toHaveFocus()

    fireEvent.keyDown(panel, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: '后台任务中心' })).not.toBeInTheDocument()
    expect(trigger).not.toHaveAttribute('aria-controls')
    expect(trigger).toHaveFocus()
  })

  test('does not steal focus when the task center opens automatically', () => {
    render(
      <AsyncTaskMenu
        currentTheme={{ primary: '#0ea5e9' } as any}
        isDarkTheme={false}
        headerBtnStyle={{}}
      />,
    )

    const trigger = screen.getByRole('button', { name: '异步任务' })
    trigger.focus()

    act(() => {
      dispatchAsyncTaskCenterReminder({
        taskKey: 'task_1',
        toolName: '测试工具',
        folderId: 1,
        submittedAtMs: Date.now(),
      })
    })

    expect(screen.getByRole('dialog', { name: '后台任务中心' })).not.toHaveFocus()
    expect(trigger).toHaveFocus()
  })

  test('asks for confirmation before clearing completed tasks', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    useAsyncTaskStore.setState({
      tasks: {
        task_done: {
          taskKey: 'task_done',
          apiDetailId: 1,
          apiName: '已完成任务',
          folderId: 1,
          progressPercent: 100,
          currentStepName: '完成',
          status: 'completed',
          createdAt: Date.now(),
          toolName: '测试工具',
        },
        task_running: {
          taskKey: 'task_running',
          apiDetailId: 2,
          apiName: '运行中任务',
          folderId: 1,
          progressPercent: 20,
          currentStepName: '运行中',
          status: 'running',
          createdAt: Date.now() - 1000,
          toolName: '测试工具',
        },
      },
    })

    render(
      <AsyncTaskMenu
        currentTheme={{ primary: '#0ea5e9' } as any}
        isDarkTheme={false}
        headerBtnStyle={{}}
      />,
    )

    await user.click(screen.getByRole('button', { name: '异步任务' }))
    await user.click(screen.getByRole('button', { name: '清除已完成' }))

    expect(useAsyncTaskStore.getState().tasks.task_done).toBeDefined()
    expect(screen.getByRole('alertdialog', { name: '确认清除已完成任务' })).not.toBeNull()

    await user.click(screen.getByRole('button', { name: '确认清除' }))

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks.task_done).toBeUndefined()
    })
    expect(useAsyncTaskStore.getState().tasks.task_running).toBeDefined()
  })
})
