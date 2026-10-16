import { act, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('@/api/services', () => ({
  aiService: {
    queryProcessStatus: jest.fn(),
  },
  sessionService: {
    getSessions: jest.fn(),
  },
}))

import { aiService } from '@/api/services'
import { AsyncTaskDaemon } from '@/components/workspace/AsyncTaskDaemon'
import { useAsyncTaskStore } from '@/modules/workspace/stores'

afterEach(() => {
  jest.useRealTimers()
  jest.clearAllMocks()
  useAsyncTaskStore.setState({ tasks: {}, daemonHeartbeatAt: null })
})

describe('AsyncTaskDaemon lifecycle', () => {
  test('does not schedule another poll after unmount while a request is in flight', async () => {
    jest.useFakeTimers()
    let resolveStatus: ((value: any) => void) | undefined
    const queryProcessStatus = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStatus = resolve
        }),
    )

    useAsyncTaskStore.getState().addAsyncTask({
      taskKey: 'task-lifecycle',
      apiDetailId: 1,
      apiName: '生命周期测试',
      folderId: 0,
      progressPercent: 0,
      currentStepName: '请求排队中...',
      status: 'running',
      toolName: '测试工具',
    })

    const view = render(<AsyncTaskDaemon />)
    await waitFor(() => expect(queryProcessStatus).toHaveBeenCalledTimes(1))

    view.unmount()
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout')
    setTimeoutSpy.mockClear()
    resolveStatus?.({
      key: 'task-lifecycle',
      progress_percent: 10,
      current_step_name: '处理中',
      is_completed: false,
      status: 'running',
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 5000)
    setTimeoutSpy.mockRestore()
  })
})
