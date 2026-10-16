import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { StrictMode, type ReactNode } from 'react'

import type { ApiDetail, InputSection } from '@/types/api'

import { useWorkspaceInputPages } from './use-workspace-input-pages'

const setPages = jest.fn()
const setInputPage = jest.fn()
const setInputSection = jest.fn()
const getInputSections = jest.fn<(toolId: string) => InputSection[]>()
const loadToolDetails = jest.fn<(toolId: string) => Promise<unknown>>()
const requestApiDetailLoad = jest.fn()
const reloadApiDetail = jest.fn()

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function createApiDetail(inputKey: string): ApiDetail {
  return {
    id: 1,
    name: 'A',
    api_type: 'Workflow',
    price: 0,
    is_async: 0,
    input_schema: [
      {
        type: 'paragraph',
        cn_name: '工作流输入内容',
        en_name: inputKey,
        content: '',
      },
    ],
    output_schema: [],
    created_at: '',
    updated_at: '',
  }
}

function createInputSection(key: string): InputSection {
  return {
    key,
    label: '工作流输入内容',
    inputMode: 'text',
    supportsFileUpload: false,
    supportsImageUpload: false,
    required: false,
  }
}

type InputPagesProps = {
  currentApiDetail: ApiDetail | null
  resolvedToolId: string
  toolName: string
  toolVersion?: string
  apiEndpoint?: string | null
}

function renderInputPages(initialProps: InputPagesProps, wrapper?: typeof StrictModeWrapper) {
  return renderHook(
    (props: InputPagesProps) =>
      useWorkspaceInputPages({
        hydrated: true,
        currentApiDetail: props.currentApiDetail,
        resolvedToolId: props.resolvedToolId,
        toolName: props.toolName,
        toolVersion: props.toolVersion ?? 'v1',
        pages: [{ key: 'x-input', label: 'X 输入' }],
        inputPage: 'x-input',
        apiEndpoint: props.apiEndpoint ?? `/api/${props.toolName}/v1`,
        apiDetailLoaded: true,
        getInputSections,
        loadToolDetails,
        setPages,
        setInputPage,
        setInputSection,
        requestApiDetailLoad,
        reloadApiDetail,
      }),
    { initialProps, wrapper },
  )
}

function StrictModeWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>
}

beforeEach(() => {
  getInputSections.mockReturnValue([])
  loadToolDetails.mockResolvedValue(undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('useWorkspaceInputPages async commit ownership', () => {
  test('rejects an old tool queued apply and still applies the current tool pages', () => {
    const queuedTasks: Array<() => void> = []
    jest.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
      queuedTasks.push(callback)
    })

    const { rerender } = renderInputPages({
      currentApiDetail: createApiDetail('a-input'),
      resolvedToolId: 'A',
      toolName: 'A',
    })
    const queuedByA = queuedTasks.splice(0)

    rerender({
      currentApiDetail: createApiDetail('x-input'),
      resolvedToolId: 'X',
      toolName: 'X',
    })
    const queuedByX = queuedTasks.splice(0)
    setPages.mockClear()

    act(() => {
      queuedByA.forEach((task) => task())
    })
    expect(setPages).not.toHaveBeenCalled()

    act(() => {
      queuedByX.forEach((task) => task())
    })
    expect(setPages).toHaveBeenCalledTimes(1)
    expect(setPages).toHaveBeenCalledWith(
      [{ key: 'x-input', label: '工作流输入内容' }],
      expect.any(Object),
    )
  })

  test('rejects an old queued apply after an A to X to A identity cycle', () => {
    const queuedTasks: Array<() => void> = []
    jest.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
      queuedTasks.push(callback)
    })

    const { rerender } = renderInputPages({
      currentApiDetail: createApiDetail('old-a-input'),
      resolvedToolId: 'A',
      toolName: 'A',
    })
    const queuedByOldA = queuedTasks.splice(0)

    rerender({ currentApiDetail: null, resolvedToolId: 'X', toolName: 'X' })
    queuedTasks.splice(0)
    rerender({
      currentApiDetail: createApiDetail('current-a-input'),
      resolvedToolId: 'A',
      toolName: 'A',
    })
    const queuedByCurrentA = queuedTasks.splice(0)
    setPages.mockClear()

    act(() => {
      queuedByOldA.forEach((task) => task())
    })
    expect(setPages).not.toHaveBeenCalled()

    act(() => {
      queuedByCurrentA.forEach((task) => task())
    })
    expect(setPages).toHaveBeenCalledTimes(1)
    expect(setPages).toHaveBeenCalledWith(
      [{ key: 'current-a-input', label: '工作流输入内容' }],
      expect.any(Object),
    )
  })

  test('rejects a queued page apply after unmount', () => {
    const queuedTasks: Array<() => void> = []
    jest.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
      queuedTasks.push(callback)
    })

    const { unmount } = renderInputPages({
      currentApiDetail: createApiDetail('a-input'),
      resolvedToolId: 'A',
      toolName: 'A',
    })
    const queuedBeforeUnmount = queuedTasks.splice(0)
    unmount()
    setPages.mockClear()

    act(() => {
      queuedBeforeUnmount.forEach((task) => task())
    })
    expect(setPages).not.toHaveBeenCalled()
  })

  test('rejects an old loadToolDetails resolution after the tool changes', async () => {
    const requestA = deferred<void>()
    let toolDetailsLoaded = false
    loadToolDetails.mockReturnValue(requestA.promise)
    getInputSections.mockImplementation((toolId) =>
      toolDetailsLoaded && toolId === 'A-ID' ? [createInputSection('a-input')] : [],
    )
    const { rerender } = renderInputPages({
      currentApiDetail: null,
      resolvedToolId: 'A-ID',
      toolName: 'A display',
    })

    await waitFor(() => expect(loadToolDetails).toHaveBeenCalledWith('A-ID'))
    rerender({ currentApiDetail: null, resolvedToolId: 'X', toolName: 'X' })
    setPages.mockClear()

    await act(async () => {
      toolDetailsLoaded = true
      requestA.resolve()
      await requestA.promise
    })
    expect(setPages).not.toHaveBeenCalled()
  })

  test('StrictMode replay keeps a current subscriber for one shared tool-detail request', async () => {
    const requestA = deferred<void>()
    let toolDetailsLoaded = false
    loadToolDetails.mockReturnValue(requestA.promise)
    getInputSections.mockImplementation((toolId) =>
      toolDetailsLoaded && toolId === 'A-ID' ? [createInputSection('a-input')] : [],
    )
    renderInputPages(
      {
        currentApiDetail: null,
        resolvedToolId: 'A-ID',
        toolName: 'A display',
      },
      StrictModeWrapper,
    )

    await waitFor(() => expect(loadToolDetails).toHaveBeenCalledTimes(1))
    setPages.mockClear()
    await act(async () => {
      toolDetailsLoaded = true
      requestA.resolve()
      await requestA.promise
    })

    await waitFor(() => expect(setPages).toHaveBeenCalledTimes(1))
    expect(setPages).toHaveBeenCalledWith(
      [{ key: 'a-input', label: '工作流输入内容' }],
      expect.any(Object),
    )
  })
})
