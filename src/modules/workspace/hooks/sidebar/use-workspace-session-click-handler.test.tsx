/* eslint-disable max-lines -- Session restore ownership races share one module mock and state fixture. */
import { useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { Session } from '@/types/api'
import { useContentStore, useWorkspaceStore } from '../../stores'
import type { SessionLoadResult } from './session-surface'

const mockHandleWorkspaceSessionClick = jest.fn<
  (...args: unknown[]) => Promise<SessionLoadResult>
>()

jest.mock('./session-click', () => ({
  handleWorkspaceSessionClick: (...args: unknown[]) => mockHandleWorkspaceSessionClick(...args),
}))

import { useWorkspaceSessionClickHandler } from './use-workspace-session-click-handler'

const session: Session = {
  id: 41,
  userId: 1,
  projectId: 7,
  title: '会话 41',
  toolType: 'workflow',
  modelVersion: 'fast',
  status: 'completed',
  createdAt: '2026-07-17T00:00:00.000Z',
  updatedAt: '2026-07-17T00:00:00.000Z',
  type: 1,
}

function createParams() {
  return {
    availableTabs: [],
    filteredToolMetadataByName: {},
    loadSessionFiles: jest.fn(),
    notify: jest.fn(),
    onChatSessionSelect: jest.fn(),
    onSessionActivated: jest.fn(),
    projectList: [{ id: 7, name: '项目 7' }],
    requestApiDetailLoad: jest.fn(),
    resolveToolName: (value: string) => value,
    sessionClickSeqRef: { current: 0 },
    setPendingSessionId: jest.fn(),
    setSelectedProjectId: jest.fn(),
    setSelectedSessionId: jest.fn(),
    setTab: jest.fn(),
    setTool: jest.fn(),
    tab: 'workspace',
    tool: { name: '工具', ver: 'fast' },
    toolMetadataByName: {},
  }
}

describe('useWorkspaceSessionClickHandler', () => {
  beforeEach(() => {
    mockHandleWorkspaceSessionClick.mockReset()
    jest.clearAllMocks()
    useWorkspaceStore.setState({
      tab: 'x-tab',
      tool: { name: 'X 工具' as any, ver: 'x-version' },
      activeSessionRestoreOwner: null,
      activeSessionRestoreCancel: null,
      isSessionOutputRestoring: false,
      pendingSessionRestoreToolKey: null,
      pendingSessionRestoreToolOwner: null,
      sessionRestoreCommitRevision: 0,
    })
    useContentStore.setState({
      pages: [{ key: 'x-input', label: 'X 输入' }],
      inputPage: 'x-input',
      inputSections: { 'x-input': 'X 输入值' },
      generated: 'X 输出',
      versions: [{ id: 'x-version', time: 'now', text: 'X 版本' }],
    })
  })

  test('keeps the active session unchanged until loading commits', async () => {
    let resolveLoad!: (value: SessionLoadResult) => void
    mockHandleWorkspaceSessionClick.mockReturnValue(
      new Promise<SessionLoadResult>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const params = createParams()
    const { result } = renderHook(() => useWorkspaceSessionClickHandler(params as any))

    let clickPromise!: Promise<void>
    act(() => {
      clickPromise = result.current.handleSessionClick(session)
    })

    expect(params.setPendingSessionId).toHaveBeenCalledWith(41)
    expect(params.setSelectedSessionId).not.toHaveBeenCalled()
    expect(params.onSessionActivated).not.toHaveBeenCalled()

    await act(async () => {
      resolveLoad({
        status: 'loaded',
        sessionId: 41,
        surface: 'workflow',
        restoredProjectId: 33,
      })
      await clickPromise
    })

    expect(params.setSelectedSessionId).toHaveBeenCalledWith(41)
    expect(params.setSelectedProjectId).toHaveBeenCalledWith(33)
    expect(params.onSessionActivated).toHaveBeenCalledWith('workflow')
    expect(params.setPendingSessionId).toHaveBeenLastCalledWith(null)
  })

  test('does not replace the active session when loading fails', async () => {
    mockHandleWorkspaceSessionClick.mockResolvedValue({
      status: 'failed',
      sessionId: 41,
      reason: 'detail-load',
    })
    const params = createParams()
    const { result } = renderHook(() => useWorkspaceSessionClickHandler(params as any))

    await act(async () => {
      await result.current.handleSessionClick(session)
    })

    expect(params.setSelectedSessionId).not.toHaveBeenCalled()
    expect(params.onSessionActivated).not.toHaveBeenCalled()
    expect(params.setPendingSessionId).toHaveBeenLastCalledWith(null)
  })

  test('allows only the latest click to clear pending state and commit', async () => {
    let resolveFirst!: (value: SessionLoadResult) => void
    let resolveSecond!: (value: SessionLoadResult) => void
    mockHandleWorkspaceSessionClick
      .mockReturnValueOnce(new Promise<SessionLoadResult>((resolve) => (resolveFirst = resolve)))
      .mockReturnValueOnce(new Promise<SessionLoadResult>((resolve) => (resolveSecond = resolve)))
    const params = createParams()
    const secondSession = { ...session, id: 42, projectId: undefined }
    const { result } = renderHook(() => useWorkspaceSessionClickHandler(params as any))

    let firstPromise!: Promise<void>
    let secondPromise!: Promise<void>
    act(() => {
      firstPromise = result.current.handleSessionClick(session)
      secondPromise = result.current.handleSessionClick(secondSession)
    })

    await act(async () => {
      resolveFirst({ status: 'stale', sessionId: 41 })
      await firstPromise
    })
    expect(params.setPendingSessionId).not.toHaveBeenLastCalledWith(null)

    await act(async () => {
      resolveSecond({
        status: 'loaded',
        sessionId: 42,
        surface: 'chat',
        restoredProjectId: null,
      })
      await secondPromise
    })
    expect(params.setSelectedSessionId).toHaveBeenCalledTimes(1)
    expect(params.setSelectedSessionId).toHaveBeenCalledWith(42)
    expect(params.onSessionActivated).toHaveBeenCalledWith('chat')
    expect(params.setSelectedProjectId).not.toHaveBeenCalled()
    expect(params.setPendingSessionId).toHaveBeenLastCalledWith(null)
  })

  test('rolls back the previous provisional owner synchronously and ignores its late rollback', async () => {
    let resolveFirst!: (value: SessionLoadResult) => void
    let resolveSecond!: (value: SessionLoadResult) => void
    let firstRegistered: { rollback: () => void; release: () => void } | undefined
    let secondRelease: jest.SpiedFunction<() => void> | undefined
    let stateSeenBySecond = ''

    mockHandleWorkspaceSessionClick
      .mockImplementationOnce((rawParams: unknown) => {
        const params = rawParams as {
          beginProvisionalRestore?: () => { rollback: () => void; release: () => void }
          setTab: (tab: string) => void
        }
        firstRegistered = params.beginProvisionalRestore?.()
        params.setTab('a-tab')
        return new Promise<SessionLoadResult>((resolve) => {
          resolveFirst = resolve
        })
      })
      .mockImplementationOnce((rawParams: unknown) => {
        const params = rawParams as {
          beginProvisionalRestore?: () => { rollback: () => void; release: () => void }
          setTab: (tab: string) => void
        }
        stateSeenBySecond = useWorkspaceStore.getState().tab
        const secondRegistered = params.beginProvisionalRestore?.()
        if (secondRegistered) {
          secondRelease = jest.spyOn(secondRegistered, 'release')
        }
        params.setTab('b-tab')
        return new Promise<SessionLoadResult>((resolve) => {
          resolveSecond = resolve
        })
      })

    const params = createParams()
    const secondSession = { ...session, id: 42 }
    const { result } = renderHook(() => useWorkspaceSessionClickHandler(params as any))

    let firstPromise!: Promise<void>
    let secondPromise!: Promise<void>
    act(() => {
      firstPromise = result.current.handleSessionClick(session)
    })
    expect(useWorkspaceStore.getState().tab).toBe('a-tab')

    act(() => {
      secondPromise = result.current.handleSessionClick(secondSession)
    })
    expect(stateSeenBySecond).toBe('x-tab')
    expect(useWorkspaceStore.getState().tab).toBe('b-tab')

    firstRegistered?.rollback()
    await act(async () => {
      resolveFirst({ status: 'stale', sessionId: 41 })
      await firstPromise
    })
    expect(useWorkspaceStore.getState().tab).toBe('b-tab')

    await act(async () => {
      resolveSecond({
        status: 'loaded',
        sessionId: 42,
        surface: 'workflow',
        restoredProjectId: 7,
      })
      await secondPromise
    })
    expect(secondRelease).toHaveBeenCalledTimes(1)
    expect(useWorkspaceStore.getState().tab).toBe('b-tab')
  })

  test('invalidates a detail-pending restore before an unmounted instance can commit', async () => {
    let resolveLoad!: (value: SessionLoadResult) => void
    let isCurrent!: () => boolean
    mockHandleWorkspaceSessionClick.mockImplementation((rawParams: unknown) => {
      isCurrent = (rawParams as { isSessionClickCurrent: () => boolean }).isSessionClickCurrent
      return new Promise<SessionLoadResult>((resolve) => {
        resolveLoad = resolve
      })
    })
    const params = createParams()
    const { result, unmount } = renderHook(() => useWorkspaceSessionClickHandler(params as any))

    let clickPromise!: Promise<void>
    act(() => {
      clickPromise = result.current.handleSessionClick(session)
    })
    expect(isCurrent()).toBe(true)

    unmount()
    expect(isCurrent()).toBe(false)

    await act(async () => {
      resolveLoad({
        status: 'loaded',
        sessionId: 41,
        surface: 'workflow',
        restoredProjectId: 7,
      })
      await clickPromise
    })
    expect(params.setSelectedSessionId).not.toHaveBeenCalled()
  })

  test('rolls back a schema-wait provisional restore synchronously on unmount', async () => {
    let resolveLoad!: (value: SessionLoadResult) => void
    let rollback: jest.SpiedFunction<() => void> | undefined
    mockHandleWorkspaceSessionClick.mockImplementation((rawParams: unknown) => {
      const transaction = (
        rawParams as {
          beginProvisionalRestore: () => { rollback: () => void; release: () => void }
        }
      ).beginProvisionalRestore()
      rollback = jest.spyOn(transaction, 'rollback')
      return new Promise<SessionLoadResult>((resolve) => {
        resolveLoad = resolve
      })
    })
    const params = createParams()
    const { result, unmount } = renderHook(() => useWorkspaceSessionClickHandler(params as any))

    let clickPromise!: Promise<void>
    act(() => {
      clickPromise = result.current.handleSessionClick(session)
    })
    unmount()

    expect(rollback).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveLoad({ status: 'stale', sessionId: 41 })
      await clickPromise
    })
    expect(params.setSelectedSessionId).not.toHaveBeenCalled()
  })

  test('an old unmounted restore cannot release the lease owned by a remounted restore', async () => {
    let resolveOld!: (value: SessionLoadResult) => void
    let resolveNew!: (value: SessionLoadResult) => void
    let oldRollback: jest.SpiedFunction<() => void> | undefined
    let oldRelease: jest.SpiedFunction<() => void> | undefined
    let newRollback: jest.SpiedFunction<() => void> | undefined
    mockHandleWorkspaceSessionClick
      .mockImplementationOnce((rawParams: unknown) => {
        const transaction = (
          rawParams as {
            beginProvisionalRestore: () => { rollback: () => void; release: () => void }
          }
        ).beginProvisionalRestore()
        oldRollback = jest.spyOn(transaction, 'rollback')
        oldRelease = jest.spyOn(transaction, 'release')
        return new Promise<SessionLoadResult>((resolve) => {
          resolveOld = resolve
        })
      })
      .mockImplementationOnce((rawParams: unknown) => {
        const transaction = (
          rawParams as {
            beginProvisionalRestore: () => { rollback: () => void; release: () => void }
          }
        ).beginProvisionalRestore()
        newRollback = jest.spyOn(transaction, 'rollback')
        return new Promise<SessionLoadResult>((resolve) => {
          resolveNew = resolve
        })
      })

    const oldParams = createParams()
    const oldHook = renderHook(() => useWorkspaceSessionClickHandler(oldParams as any))
    let oldPromise!: Promise<void>
    act(() => {
      oldPromise = oldHook.result.current.handleSessionClick(session)
    })
    oldHook.unmount()
    expect(oldRollback).toHaveBeenCalledTimes(1)

    const newParams = createParams()
    const newHook = renderHook(() => useWorkspaceSessionClickHandler(newParams as any))
    let newPromise!: Promise<void>
    act(() => {
      newPromise = newHook.result.current.handleSessionClick({ ...session, id: 42 })
    })

    await act(async () => {
      resolveOld({
        status: 'loaded',
        sessionId: 41,
        surface: 'workflow',
        restoredProjectId: 7,
      })
      await oldPromise
    })
    expect(oldRelease).not.toHaveBeenCalled()
    expect(newRollback).not.toHaveBeenCalled()

    await act(async () => {
      resolveNew({
        status: 'loaded',
        sessionId: 42,
        surface: 'workflow',
        restoredProjectId: 7,
      })
      await newPromise
    })
    newHook.unmount()
  })

  test('ordinary setTool invalidates a detail-pending restore before its late result', async () => {
    let resolveLoad!: (value: SessionLoadResult) => void
    let isCurrent!: () => boolean
    mockHandleWorkspaceSessionClick.mockImplementation((rawParams: unknown) => {
      isCurrent = (rawParams as { isSessionClickCurrent: () => boolean }).isSessionClickCurrent
      return new Promise<SessionLoadResult>((resolve) => {
        resolveLoad = resolve
      })
    })
    const params = createParams()
    const { result } = renderHook(() => useWorkspaceSessionClickHandler(params as any))

    let clickPromise!: Promise<void>
    act(() => {
      clickPromise = result.current.handleSessionClick(session)
    })
    act(() => {
      useWorkspaceStore.getState().setTool({ name: '人工工具' as any, ver: 'manual' })
    })
    expect(isCurrent()).toBe(false)

    await act(async () => {
      resolveLoad({ status: 'stale', sessionId: 41 })
      await clickPromise
    })
  })

  test('manual cancellation rolls back a schema-wait provisional restore synchronously', async () => {
    let resolveLoad!: (value: SessionLoadResult) => void
    let rollback: jest.SpiedFunction<() => void> | undefined
    mockHandleWorkspaceSessionClick.mockImplementation((rawParams: unknown) => {
      const transaction = (
        rawParams as {
          beginProvisionalRestore: () => { rollback: () => void; release: () => void }
        }
      ).beginProvisionalRestore()
      rollback = jest.spyOn(transaction, 'rollback')
      return new Promise<SessionLoadResult>((resolve) => {
        resolveLoad = resolve
      })
    })
    const params = createParams()
    const { result } = renderHook(() => useWorkspaceSessionClickHandler(params as any))

    let clickPromise!: Promise<void>
    act(() => {
      clickPromise = result.current.handleSessionClick(session)
    })
    act(() => {
      result.current.cancelPendingSessionRestore()
    })
    expect(rollback).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveLoad({ status: 'stale', sessionId: 41 })
      await clickPromise
    })
  })

  test('an overlapping new owner prevents the old instance from rolling back or committing', async () => {
    let resolveOld!: (value: SessionLoadResult) => void
    let resolveNew!: (value: SessionLoadResult) => void
    let oldTransaction:
      | { rollback: () => void; release: () => void }
      | undefined
    mockHandleWorkspaceSessionClick
      .mockImplementationOnce((rawParams: unknown) => {
        oldTransaction = (
          rawParams as {
            beginProvisionalRestore: () => { rollback: () => void; release: () => void }
          }
        ).beginProvisionalRestore()
        return new Promise<SessionLoadResult>((resolve) => {
          resolveOld = resolve
        })
      })
      .mockImplementationOnce((rawParams: unknown) => {
        ;(
          rawParams as {
            beginProvisionalRestore: () => { rollback: () => void; release: () => void }
          }
        ).beginProvisionalRestore()
        return new Promise<SessionLoadResult>((resolve) => {
          resolveNew = resolve
        })
      })

    const oldParams = createParams()
    const newParams = createParams()
    const oldHook = renderHook(() => useWorkspaceSessionClickHandler(oldParams as any))
    const newHook = renderHook(() => useWorkspaceSessionClickHandler(newParams as any))
    let oldPromise!: Promise<void>
    let newPromise!: Promise<void>
    act(() => {
      oldPromise = oldHook.result.current.handleSessionClick(session)
      newPromise = newHook.result.current.handleSessionClick({ ...session, id: 42 })
    })
    const newOwner = useWorkspaceStore.getState().activeSessionRestoreOwner

    act(() => {
      oldTransaction?.rollback()
    })
    expect(oldParams.setTab).not.toHaveBeenCalled()
    expect(useWorkspaceStore.getState().activeSessionRestoreOwner).toBe(newOwner)

    await act(async () => {
      resolveOld({
        status: 'loaded',
        sessionId: 41,
        surface: 'workflow',
        restoredProjectId: 7,
      })
      await oldPromise
    })
    expect(oldParams.setSelectedSessionId).not.toHaveBeenCalled()
    expect(useWorkspaceStore.getState().activeSessionRestoreOwner).toBe(newOwner)

    await act(async () => {
      resolveNew({
        status: 'loaded',
        sessionId: 42,
        surface: 'workflow',
        restoredProjectId: 7,
      })
      await newPromise
    })
    oldHook.unmount()
    newHook.unmount()
  })

  test('preempts another mounted instance before B detail failure can leave A provisional state behind', async () => {
    let resolveA!: (value: SessionLoadResult) => void
    mockHandleWorkspaceSessionClick
      .mockImplementationOnce((rawParams: unknown) => {
        const params = rawParams as {
          beginProvisionalRestore: () => { rollback: () => void; release: () => void }
          setTab: (tab: string) => void
          setTool: (tool: { name: string; ver: string }) => void
        }
        params.beginProvisionalRestore()
        params.setTab('a-tab')
        params.setTool({ name: 'A 工具', ver: 'a-version' })
        useContentStore.setState({
          pages: [{ key: 'a-input', label: 'A 输入' }],
          inputPage: 'a-input',
          inputSections: { 'a-input': 'A 输入值' },
          generated: 'A 输出',
          versions: [{ id: 'a-version', time: 'now', text: 'A 版本' }],
        })
        return new Promise<SessionLoadResult>((resolve) => {
          resolveA = resolve
        })
      })
      .mockResolvedValueOnce({ status: 'failed', sessionId: 42, reason: 'detail-load' })

    const oldParams = createParams()
    oldParams.setTab.mockImplementation((tab: string) => {
      useWorkspaceStore.setState({ tab })
    })
    const newParams = createParams()
    newParams.setTab.mockImplementation((tab: string) => {
      useWorkspaceStore.setState({ tab })
    })
    const oldHook = renderHook(() => useWorkspaceSessionClickHandler(oldParams as any))
    const newHook = renderHook(() => useWorkspaceSessionClickHandler(newParams as any))
    let oldPromise!: Promise<void>
    let newPromise!: Promise<void>

    act(() => {
      oldPromise = oldHook.result.current.handleSessionClick(session)
    })
    expect(useWorkspaceStore.getState()).toMatchObject({
      tab: 'a-tab',
      tool: { name: 'A 工具', ver: 'a-version' },
    })

    await act(async () => {
      newPromise = newHook.result.current.handleSessionClick({ ...session, id: 42 })
      await newPromise
      resolveA({ status: 'stale', sessionId: 41 })
      await oldPromise
    })

    expect(useWorkspaceStore.getState()).toMatchObject({
      tab: 'x-tab',
      tool: { name: 'X 工具', ver: 'x-version' },
    })
    expect(useContentStore.getState()).toMatchObject({
      pages: [{ key: 'x-input', label: 'X 输入' }],
      inputPage: 'x-input',
      inputSections: { 'x-input': 'X 输入值' },
      generated: 'X 输出',
      versions: [{ id: 'x-version', time: 'now', text: 'X 版本' }],
    })
    expect(oldParams.setSelectedSessionId).not.toHaveBeenCalled()
    expect(newParams.setSelectedSessionId).not.toHaveBeenCalled()
    oldHook.unmount()
    newHook.unmount()
  })

  test('ordinary setTool cancels a provisional restore before applying the final manual intent', async () => {
    let resolveRestore!: (value: SessionLoadResult) => void
    let isCurrent!: () => boolean
    mockHandleWorkspaceSessionClick.mockImplementation((rawParams: unknown) => {
      const params = rawParams as {
        beginProvisionalRestore: () => { rollback: () => void; release: () => void }
        isSessionClickCurrent: () => boolean
        setTab: (tab: string) => void
        setTool: (tool: { name: string; ver: string }) => void
      }
      isCurrent = params.isSessionClickCurrent
      params.beginProvisionalRestore()
      params.setTab('a-tab')
      params.setTool({ name: 'A 工具', ver: 'a-version' })
      useContentStore.setState({
        pages: [{ key: 'a-input', label: 'A 输入' }],
        inputPage: 'a-input',
        inputSections: { 'a-input': 'A 输入值' },
        generated: 'A 输出',
        versions: [{ id: 'a-version', time: 'now', text: 'A 版本' }],
      })
      return new Promise<SessionLoadResult>((resolve) => {
        resolveRestore = resolve
      })
    })
    const params = createParams()
    params.setTab.mockImplementation((tab: string) => {
      useWorkspaceStore.setState({ tab })
    })
    const { result, unmount } = renderHook(() => useWorkspaceSessionClickHandler(params as any))
    let restorePromise!: Promise<void>
    act(() => {
      restorePromise = result.current.handleSessionClick(session)
    })

    act(() => {
      useWorkspaceStore.getState().setTool({ name: '人工工具' as any, ver: 'manual' })
    })
    const currentAfterManualIntent = isCurrent()
    await act(async () => {
      resolveRestore({
        status: 'loaded',
        sessionId: 41,
        surface: 'workflow',
        restoredProjectId: 7,
      })
      await restorePromise
    })

    expect(currentAfterManualIntent).toBe(false)
    expect(useWorkspaceStore.getState()).toMatchObject({
      tab: 'x-tab',
      tool: { name: '人工工具', ver: 'manual' },
      pendingSessionRestoreToolKey: null,
    })
    expect(useContentStore.getState()).toMatchObject({
      pages: [{ key: 'x-input', label: 'X 输入' }],
      inputPage: 'x-input',
      inputSections: { 'x-input': 'X 输入值' },
      generated: 'X 输出',
    })
    expect(params.setSelectedSessionId).not.toHaveBeenCalled()
    unmount()
  })

  test('ordinary setTab cancels a provisional restore before applying the final manual intent', async () => {
    let resolveRestore!: (value: SessionLoadResult) => void
    let isCurrent!: () => boolean
    mockHandleWorkspaceSessionClick.mockImplementation((rawParams: unknown) => {
      const params = rawParams as {
        beginProvisionalRestore: () => { rollback: () => void; release: () => void }
        isSessionClickCurrent: () => boolean
        setTab: (tab: string) => void
        setTool: (tool: { name: string; ver: string }) => void
      }
      isCurrent = params.isSessionClickCurrent
      params.beginProvisionalRestore()
      params.setTab('a-tab')
      params.setTool({ name: 'A 工具', ver: 'a-version' })
      useContentStore.setState({
        pages: [{ key: 'a-input', label: 'A 输入' }],
        inputPage: 'a-input',
        inputSections: { 'a-input': 'A 输入值' },
        generated: 'A 输出',
        versions: [{ id: 'a-version', time: 'now', text: 'A 版本' }],
      })
      return new Promise<SessionLoadResult>((resolve) => {
        resolveRestore = resolve
      })
    })
    const params = createParams()
    params.setTab.mockImplementation((tab: string) => {
      useWorkspaceStore.setState({ tab })
    })
    const { result, unmount } = renderHook(() => useWorkspaceSessionClickHandler(params as any))
    let restorePromise!: Promise<void>
    act(() => {
      restorePromise = result.current.handleSessionClick(session)
    })

    act(() => {
      useWorkspaceStore.getState().setTab('manual-tab')
    })
    const currentAfterManualIntent = isCurrent()
    await act(async () => {
      resolveRestore({ status: 'stale', sessionId: 41 })
      await restorePromise
    })

    expect(currentAfterManualIntent).toBe(false)
    expect(useWorkspaceStore.getState()).toMatchObject({
      tab: 'manual-tab',
      tool: { name: 'X 工具', ver: 'x-version' },
      pendingSessionRestoreToolKey: 'X 工具::x-version',
    })
    expect(useContentStore.getState()).toMatchObject({
      pages: [{ key: 'x-input', label: 'X 输入' }],
      inputPage: 'x-input',
      inputSections: { 'x-input': 'X 输入值' },
      generated: 'X 输出',
    })
    expect(params.setSelectedSessionId).not.toHaveBeenCalled()
    unmount()
  })

  test('blocks a deferred commit resolved by a parent layout cleanup while deleting the child hook', async () => {
    let resolveLoad!: (value: SessionLoadResult) => void
    let resolveDeletionCommit!: () => void
    let restorePromise!: Promise<void>
    const deletionCommitted = new Promise<void>((resolve) => {
      resolveDeletionCommit = resolve
    })
    mockHandleWorkspaceSessionClick.mockReturnValue(
      new Promise<SessionLoadResult>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const params = createParams()

    function RestoreChild() {
      const { handleSessionClick } = useWorkspaceSessionClickHandler(params as any)
      useLayoutEffect(() => {
        restorePromise = handleSessionClick(session)
      }, [handleSessionClick])
      return null
    }

    function LayoutCleanupParent({ showChild }: { showChild: boolean }) {
      useLayoutEffect(() => {
        if (!showChild) {
          resolveDeletionCommit()
        }
        return () => {
          if (!showChild) return
          resolveLoad({
            status: 'loaded',
            sessionId: 41,
            surface: 'workflow',
            restoredProjectId: 7,
          })
        }
      }, [showChild])
      return showChild ? <RestoreChild /> : null
    }

    const container = document.createElement('div')
    const root = createRoot(container)
    flushSync(() => {
      root.render(<LayoutCleanupParent showChild />)
    })
    root.render(<LayoutCleanupParent showChild={false} />)
    await deletionCommitted
    await restorePromise

    const selectedSessionCalls = params.setSelectedSessionId.mock.calls.length
    const activatedSessionCalls = params.onSessionActivated.mock.calls.length
    const restoreState = useWorkspaceStore.getState()
    root.unmount()

    expect(selectedSessionCalls).toBe(0)
    expect(activatedSessionCalls).toBe(0)
    expect(restoreState).toMatchObject({
      activeSessionRestoreOwner: null,
      activeSessionRestoreCancel: null,
      isSessionOutputRestoring: false,
      sessionRestoreCommitRevision: 0,
    })
  })
})
